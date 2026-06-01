import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

const BUCKET_SCORES: Record<string, number | null> = {
  likely_qualified: 22,
  likely_disqualified: 5,
  likely_spam: 0,
  insufficient_context: null,
};

const normalizePhone = (phone: string | null): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
};

function extractJson(text: string): any {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(candidate.slice(start, end + 1)); } catch { return null; }
}

async function classify(lovableApiKey: string, payload: { message: string | null; call_summary: string | null; product: string | null }): Promise<{ bucket: string; reason: string } | null> {
  const system = `You are a lead-quality classifier for Mathews Mechanical, a commercial metal fabrication & welding company. Given a contact's form message and/or matched inbound call summary, classify their likely sales quality into ONE bucket:
- likely_qualified: real B2B prospect with a concrete fabrication/welding need (project, RFQ, drawings, materials, location, timeline).
- likely_disqualified: real person but wrong fit (residential, one-off small repair, job seeker, vendor pitch, out-of-scope service like fall protection one-off, etc).
- likely_spam: clearly junk, bot, gibberish, marketing/SEO outreach, or fraudulent.
- insufficient_context: no message and no call summary, or content too thin to judge.
Respond ONLY with strict JSON: {"bucket":"...","reason":"<one short sentence, <=140 chars>"}.`;

  const user = `Form message: ${payload.message?.trim() || "(none)"}
Product requested: ${payload.product?.trim() || "(unknown)"}
Matched call summary: ${payload.call_summary?.trim() || "(no call matched)"}`;

  for (const model of MODELS) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          temperature: 0.2,
          max_tokens: 200,
        }),
      });
      if (!r.ok) {
        if (r.status === 429 || r.status === 402) {
          await new Promise((res) => setTimeout(res, 1200));
          continue;
        }
        console.error(`AI ${model} -> ${r.status}: ${await r.text()}`);
        continue;
      }
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content || "";
      const parsed = extractJson(text);
      if (parsed && typeof parsed.bucket === "string") {
        const bucket = parsed.bucket.toLowerCase().replace(/\s+/g, "_");
        if (bucket in BUCKET_SCORES) {
          return { bucket, reason: String(parsed.reason || "").slice(0, 200) };
        }
      }
    } catch (e) {
      console.error(`AI ${model} threw`, e);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const force: boolean = body?.force === true;
    const limit: number = Math.min(Number(body?.limit) || 500, 1000);

    // Pull Paid Search contacts (only those with at least some context)
    const { data: contacts, error: cErr } = await supabase
      .from("hubspot_contacts")
      .select("record_id, phone_number, message, quality_score, quality_analysis")
      .ilike("original_traffic_source", "Paid Search");
    if (cErr) throw cErr;

    // Pull leads -> contact_id map of definitive stages
    const { data: leads } = await supabase
      .from("hubspot_leads")
      .select("associated_contact_id, lead_stage, product_requested");
    const stageByContact = new Map<string, string>();
    const productByContact = new Map<string, string>();
    leads?.forEach((l) => {
      if (l.associated_contact_id) {
        if (l.lead_stage && !stageByContact.has(l.associated_contact_id)) {
          stageByContact.set(l.associated_contact_id, l.lead_stage.trim().toLowerCase());
        }
        if (l.product_requested && !productByContact.has(l.associated_contact_id)) {
          productByContact.set(l.associated_contact_id, l.product_requested);
        }
      }
    });

    // Pull call summaries indexed by normalized phone
    const { data: calls } = await supabase
      .from("ctm_calls")
      .select("caller_number, ai_summary")
      .not("ai_summary", "is", null);
    const callByPhone = new Map<string, string>();
    calls?.forEach((c) => {
      const p = normalizePhone(c.caller_number);
      if (p && c.ai_summary && !callByPhone.has(p)) callByPhone.set(p, c.ai_summary);
    });

    // Filter to contacts that need AI scoring
    const definitive = new Set(["qualified", "connected", "disqualified"]);
    const candidates = (contacts || []).filter((c) => {
      const stage = stageByContact.get(c.record_id);
      if (stage && definitive.has(stage)) return false; // real lead stage wins
      if (!force) {
        const qa = c.quality_analysis as any;
        if (qa && qa.source === "ai_inferred" && qa.bucket) return false; // already scored
      }
      return true;
    }).slice(0, limit);

    let scored = 0, skipped_insufficient = 0, failed = 0;

    for (const c of candidates) {
      const phone = normalizePhone(c.phone_number);
      const callSummary = phone ? callByPhone.get(phone) || null : null;
      const message = (c.message || "").trim() || null;

      let result: { bucket: string; reason: string } | null;
      if (!message && !callSummary) {
        result = { bucket: "insufficient_context", reason: "No form message and no matched call recording." };
        skipped_insufficient++;
      } else {
        result = await classify(lovableApiKey, {
          message,
          call_summary: callSummary,
          product: productByContact.get(c.record_id) || null,
        });
        if (!result) { failed++; continue; }
      }

      const update: Record<string, unknown> = {
        quality_score: BUCKET_SCORES[result.bucket],
        quality_analysis: {
          source: "ai_inferred",
          bucket: result.bucket,
          reason: result.reason,
          had_message: !!message,
          had_call: !!callSummary,
          scored_at: new Date().toISOString(),
        },
      };
      const { error: uErr } = await supabase.from("hubspot_contacts").update(update).eq("record_id", c.record_id);
      if (uErr) { console.error("update failed", c.record_id, uErr.message); failed++; continue; }
      scored++;
    }

    return new Response(JSON.stringify({
      success: true,
      summary: {
        candidates: candidates.length,
        scored,
        skipped_insufficient,
        failed,
        total_paid_search: contacts?.length || 0,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-score-contacts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});