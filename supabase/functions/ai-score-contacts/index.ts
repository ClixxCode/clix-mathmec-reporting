import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAUDE_MODEL = "claude-opus-4-8";

const BUCKET_SCORES: Record<string, number | null> = {
  likely_qualified: 22,
  likely_disqualified: 5,
  likely_spam: 0,
  insufficient_context: null,
};

const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    bucket: {
      type: "string",
      enum: ["likely_qualified", "likely_disqualified", "likely_spam", "insufficient_context"],
    },
    reason: {
      type: "string",
      description: "One short sentence, <=140 chars",
    },
  },
  required: ["bucket", "reason"],
  additionalProperties: false,
} as const;

const normalizePhone = (phone: string | null): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
};

function classifyFromRules(payload: { message: string | null; call_summary: string | null; product: string | null }): { bucket: string; reason: string } | null {
  const text = [payload.message, payload.product, payload.call_summary].filter(Boolean).join(" ").toLowerCase();
  if (!text.trim()) return { bucket: "insufficient_context", reason: "No form message and no matched call recording." };

  const spamSignals = ["seo", "backlink", "guest post", "crypto", "whatsapp", "loan", "casino", "rank on google"];
  if (spamSignals.some((signal) => text.includes(signal))) {
    return { bucket: "likely_spam", reason: "Message appears to be marketing outreach or spam." };
  }

  const residentialSignals = ["residential", "front of her house", "front of his house", "home", "decorative gate", "ornamental", "general contractor"];
  const outOfScopeSignals = ["does not sell", "couldn't promise", "could not promise", "wrong fit", "not in alignment", "primarily handles commercial"];
  if (residentialSignals.some((signal) => text.includes(signal)) || outOfScopeSignals.some((signal) => text.includes(signal))) {
    return { bucket: "likely_disqualified", reason: "Residential/decorative custom work is outside Mathews' commercial-industrial fit." };
  }

  return null;
}

async function classify(anthropic: Anthropic, payload: { message: string | null; call_summary: string | null; product: string | null }): Promise<{ bucket: string; reason: string } | null> {
  const ruleResult = classifyFromRules(payload);
  if (ruleResult) return ruleResult;

  const system = `You are a lead-quality classifier for Mathews Mechanical, a commercial metal fabrication & welding company. Given a contact's form message and/or matched inbound call summary, classify their likely sales quality into ONE bucket:
- likely_qualified: real B2B prospect with a concrete fabrication/welding need (project, RFQ, drawings, materials, location, timeline).
- likely_disqualified: real person but wrong fit (residential, one-off small repair, job seeker, vendor pitch, out-of-scope service like fall protection one-off, etc).
- likely_spam: clearly junk, bot, gibberish, marketing/SEO outreach, or fraudulent.
- insufficient_context: no message and no call summary, or content too thin to judge.`;

  const user = `Form message: ${payload.message?.trim() || "(none)"}
Product requested: ${payload.product?.trim() || "(unknown)"}
Matched call summary: ${payload.call_summary?.trim() || "(no call matched)"}`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: CLASSIFICATION_SCHEMA } },
      system,
      messages: [{ role: "user", content: user }],
    });

    if (response.stop_reason === "refusal") {
      console.error("Claude refused classification request");
      return null;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = JSON.parse(textBlock.text);
    if (parsed && typeof parsed.bucket === "string" && parsed.bucket in BUCKET_SCORES) {
      return { bucket: parsed.bucket, reason: String(parsed.reason || "").slice(0, 200) };
    }
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      console.error("Claude rate limited after retries");
    } else {
      console.error("Claude classification failed", e);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "mathmec" } });
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const body = await req.json().catch(() => ({}));
    const force: boolean = body?.force === true;
    const limit: number = Math.min(Number(body?.limit) || 120, 500);
    const concurrency: number = Math.min(Math.max(Number(body?.concurrency) || 8, 1), 16);
    const recordIds: string[] = Array.isArray(body?.recordIds) ? body.recordIds.map(String).filter(Boolean) : [];
    const startDate = typeof body?.startDate === "string" ? body.startDate : null;
    const endDate = typeof body?.endDate === "string" ? body.endDate : null;

    // Pull Paid Search contacts (only those with at least some context)
    let contactsQuery = supabase
      .from("hubspot_contacts")
      .select("record_id, phone_number, message, quality_score, quality_analysis, hubspot_create_date")
      .ilike("original_traffic_source", "Paid Search")
      .order("hubspot_create_date", { ascending: false });
    if (recordIds.length > 0) contactsQuery = contactsQuery.in("record_id", recordIds);
    if (startDate) contactsQuery = contactsQuery.gte("hubspot_create_date", startDate);
    if (endDate) contactsQuery = contactsQuery.lte("hubspot_create_date", endDate);
    const { data: contacts, error: cErr } = await contactsQuery;
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

    const processOne = async (c: any) => {
      const phone = normalizePhone(c.phone_number);
      const callSummary = phone ? callByPhone.get(phone) || null : null;
      const rawMessage = (c.message || "").trim();
      // Treat numeric-only messages (phone numbers, IDs) as no real message
      const message = rawMessage && !/^\d{6,}$/.test(rawMessage) ? rawMessage : null;

      let result: { bucket: string; reason: string } | null;
      if (!message && !callSummary) {
        result = { bucket: "insufficient_context", reason: "No form message and no matched call recording." };
        skipped_insufficient++;
      } else {
        result = await classify(anthropic, {
          message,
          call_summary: callSummary,
          product: productByContact.get(c.record_id) || null,
        });
        if (!result) { failed++; return; }
      }

      const update = {
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
      if (uErr) { console.error("update failed", c.record_id, uErr.message); failed++; return; }
      scored++;
    };

    // Process in parallel chunks
    for (let i = 0; i < candidates.length; i += concurrency) {
      const chunk = candidates.slice(i, i + concurrency);
      await Promise.allSettled(chunk.map(processOne));
    }

    return new Response(JSON.stringify({
      success: true,
      summary: {
        candidates: candidates.length,
        scored,
        skipped_insufficient,
        failed,
        total_paid_search: contacts?.length || 0,
        remaining: Math.max(0, (contacts?.filter((c) => {
          const stage = stageByContact.get(c.record_id);
          if (stage && definitive.has(stage)) return false;
          const qa = c.quality_analysis as any;
          if (qa && qa.source === "ai_inferred" && qa.bucket && qa.bucket !== "insufficient_context") return false;
          return true;
        }).length || 0) - scored - skipped_insufficient),
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-score-contacts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
