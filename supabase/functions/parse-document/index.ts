import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

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

    if (!extractedText || extractedText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Could not extract text from document. Please try a different format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert to campaign_narratives table
    const { data, error } = await supabase
      .from('campaign_narratives')
      .upsert({
        month_year: monthYear,
        uploaded_content: extractedText,
        uploaded_at: new Date().toISOString(),
        uploaded_filename: fileName,
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

// Extract text from DOCX using JSZip
async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    const zip = new JSZip();
    const content = await zip.loadAsync(bytes);
    
    // Get document.xml which contains the main text
    const documentXml = await content.file('word/document.xml')?.async('string');
    
    if (!documentXml) {
      console.error('Could not find word/document.xml in DOCX');
      return '';
    }

    // Parse XML to extract text content
    // Extract text between <w:t> tags (Word text elements)
    const textParts: string[] = [];
    
    // Match all <w:t> elements including those with attributes
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    
    while ((match = regex.exec(documentXml)) !== null) {
      if (match[1]) {
        textParts.push(match[1]);
      }
    }

    // Also handle paragraph breaks - add newlines between paragraphs
    let result = '';
    let inParagraph = false;
    const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
    
    while ((match = paragraphRegex.exec(documentXml)) !== null) {
      const paragraphContent = match[1];
      const paragraphTexts: string[] = [];
      
      const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let textMatch;
      
      while ((textMatch = textRegex.exec(paragraphContent)) !== null) {
        if (textMatch[1]) {
          paragraphTexts.push(textMatch[1]);
        }
      }
      
      if (paragraphTexts.length > 0) {
        result += paragraphTexts.join('') + '\n\n';
      }
    }

    // Clean up extra whitespace
    result = result
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log(`Extracted ${result.length} characters from DOCX`);
    return result;
    
  } catch (err) {
    console.error('DOCX extraction error:', err);
    return '';
  }
}

// Extract text from PDF - simplified extraction
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  // Try to extract text from PDF text objects (between BT and ET)
  const textMatches: string[] = [];
  const btEtRegex = /BT[\s\S]*?ET/g;
  const matches = text.match(btEtRegex) || [];
  
  for (const match of matches) {
    // Extract text from Tj operators (show text)
    const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g) || [];
    for (const tj of tjMatches) {
      const content = tj.match(/\(([^)]*)\)/)?.[1] || '';
      if (content.trim()) {
        textMatches.push(content);
      }
    }
    
    // Also try TJ arrays
    const tjArrayMatches = match.match(/\[([^\]]+)\]\s*TJ/g) || [];
    for (const tjArray of tjArrayMatches) {
      const innerMatches = tjArray.match(/\(([^)]*)\)/g) || [];
      for (const inner of innerMatches) {
        const content = inner.match(/\(([^)]*)\)/)?.[1] || '';
        if (content.trim()) {
          textMatches.push(content);
        }
      }
    }
  }
  
  if (textMatches.length > 0) {
    const result = textMatches
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`Extracted ${result.length} characters from PDF text objects`);
    return result;
  }
  
  // Fallback: extract any readable ASCII text
  const readableText = text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Filter out common PDF structure keywords
  const filtered = readableText
    .split(' ')
    .filter(word => 
      word.length > 2 && 
      !word.match(/^[0-9.]+$/) &&
      !['obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref', 'PDF'].includes(word)
    )
    .join(' ');
  
  console.log(`Extracted ${filtered.length} characters from PDF (fallback)`);
  return filtered.substring(0, 50000);
}
