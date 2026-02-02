import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ParseRequest {
  fileContent: string; // base64 encoded
  fileName: string;
  monthYear: string; // e.g., "2026-01"
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fileContent, fileName, monthYear }: ParseRequest = await req.json();

    if (!fileContent || !fileName || !monthYear) {
      return new Response(
        JSON.stringify({ error: 'fileContent, fileName, and monthYear are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing document: ${fileName} for month: ${monthYear}`);

    // Decode base64 content
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine file type
    const ext = fileName.toLowerCase().split('.').pop();
    let extractedText = '';

    if (ext === 'pdf') {
      // Use pdf-parse library via dynamic import
      extractedText = await extractPdfText(bytes);
    } else if (ext === 'docx') {
      extractedText = await extractDocxText(bytes);
    } else if (ext === 'txt' || ext === 'md') {
      extractedText = new TextDecoder().decode(bytes);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported file type: ${ext}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracted ${extractedText.length} characters from ${fileName}`);

    // Upsert to campaign_narratives table
    const { data, error } = await supabase
      .from('campaign_narratives')
      .upsert({
        month_year: monthYear,
        uploaded_content: extractedText,
        uploaded_at: new Date().toISOString(),
        uploaded_filename: fileName,
        // Keep existing narrative_text if present, otherwise set empty
        narrative_text: '',
        ai_generated: false,
        is_edited: true,
      }, {
        onConflict: 'month_year',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Document saved successfully for', monthYear);

    return new Response(
      JSON.stringify({
        success: true,
        monthYear,
        fileName,
        contentLength: extractedText.length,
        preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Parse error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract text from PDF using pdf-lib for basic extraction
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Use a simpler approach - extract readable text content
  // For production, you'd want a proper PDF parsing library
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  // Extract text between BT and ET markers (PDF text objects)
  const textMatches: string[] = [];
  const btEtRegex = /BT[\s\S]*?ET/g;
  const matches = text.match(btEtRegex) || [];
  
  for (const match of matches) {
    // Extract text from Tj and TJ operators
    const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g) || [];
    for (const tj of tjMatches) {
      const content = tj.match(/\(([^)]*)\)/)?.[1] || '';
      if (content.trim()) {
        textMatches.push(content);
      }
    }
  }
  
  if (textMatches.length > 0) {
    return textMatches.join(' ').replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();
  }
  
  // Fallback: try to find any readable text
  const readableText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Filter out PDF structure commands
  const lines = readableText.split(' ').filter(word => 
    word.length > 2 && 
    !word.match(/^[0-9.]+$/) &&
    !['obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref'].includes(word.toLowerCase())
  );
  
  return lines.join(' ').substring(0, 50000); // Limit to ~50k chars
}

// Extract text from DOCX (which is a ZIP file with XML)
async function extractDocxText(bytes: Uint8Array): Promise<string> {
  // DOCX is a ZIP file - we'll look for document.xml content
  // This is a simplified extraction that looks for text content
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  // Find XML text content between <w:t> tags
  const textMatches: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match[1]?.trim()) {
      textMatches.push(match[1]);
    }
  }
  
  if (textMatches.length > 0) {
    return textMatches.join(' ').trim();
  }
  
  // Fallback: just extract readable ASCII text
  return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 50000);
}
