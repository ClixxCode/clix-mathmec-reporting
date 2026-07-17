import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ParseRequest {
  fileContent: string;
  fileName: string;
  monthYear: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: "mathmec" } });

    const { fileContent, fileName, monthYear }: ParseRequest = await req.json();

    if (!fileContent || !fileName || !monthYear) {
      return new Response(
        JSON.stringify({ error: 'fileContent, fileName, and monthYear are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing document: ${fileName} for month: ${monthYear}`);

    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

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

    const { error } = await supabase
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
      });

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

// Extract text from DOCX with markdown formatting
async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    const zip = new JSZip();
    const content = await zip.loadAsync(bytes);
    
    const documentXml = await content.file('word/document.xml')?.async('string');
    const numberingXml = await content.file('word/numbering.xml')?.async('string');
    
    if (!documentXml) {
      console.error('Could not find word/document.xml in DOCX');
      return '';
    }

    // Parse numbering definitions to detect list types
    const numberingMap = parseNumberingDefinitions(numberingXml || '');

    // Process each paragraph
    const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
    const result: string[] = [];
    let match;
    let currentListLevel = -1;
    let isNumberedList = false;
    let listCounter = 0;

    while ((match = paragraphRegex.exec(documentXml)) !== null) {
      const paragraphContent = match[1];
      
      // Check for heading style
      const headingLevel = getHeadingLevel(paragraphContent);
      
      // Check for list properties
      const listInfo = getListInfo(paragraphContent, numberingMap);
      
      // Extract text with inline formatting
      const paragraphText = extractParagraphText(paragraphContent);
      
      if (!paragraphText.trim()) {
        // Empty paragraph - reset list if we were in one
        if (currentListLevel >= 0) {
          currentListLevel = -1;
          listCounter = 0;
        }
        continue;
      }

      // Format based on detected structure
      if (headingLevel > 0) {
        // Add heading markdown
        const prefix = '#'.repeat(Math.min(headingLevel, 3));
        result.push(`\n${prefix} ${paragraphText}\n`);
        currentListLevel = -1;
        listCounter = 0;
      } else if (listInfo.isList) {
        // Handle list items
        const indent = '  '.repeat(listInfo.level);
        
        if (listInfo.isNumbered) {
          // Start or continue numbered list
          if (!isNumberedList || listInfo.level !== currentListLevel) {
            listCounter = 1;
          } else {
            listCounter++;
          }
          result.push(`${indent}${listCounter}. ${paragraphText}`);
          isNumberedList = true;
        } else {
          // Bullet list
          result.push(`${indent}- ${paragraphText}`);
          isNumberedList = false;
          listCounter = 0;
        }
        currentListLevel = listInfo.level;
      } else {
        // Regular paragraph
        result.push(`\n${paragraphText}\n`);
        currentListLevel = -1;
        listCounter = 0;
        isNumberedList = false;
      }
    }

    // Clean up the result
    let finalText = result.join('\n')
      .replace(/\n{4,}/g, '\n\n\n')  // Max 3 newlines
      .replace(/^\n+/, '')           // Remove leading newlines
      .replace(/\n+$/, '')           // Remove trailing newlines
      .trim();

    console.log(`Extracted ${finalText.length} characters from DOCX with formatting`);
    return finalText;
    
  } catch (err) {
    console.error('DOCX extraction error:', err);
    return '';
  }
}

// Parse numbering.xml to understand list types
function parseNumberingDefinitions(numberingXml: string): Map<string, { isNumbered: boolean }> {
  const map = new Map<string, { isNumbered: boolean }>();
  
  // Find abstract numbering definitions
  const abstractRegex = /<w:abstractNum[^>]*w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g;
  let match;
  
  while ((match = abstractRegex.exec(numberingXml)) !== null) {
    const abstractNumId = match[1];
    const content = match[2];
    
    // Check if it's a numbered list (decimal, lowerLetter, etc.) or bullet
    const isNumbered = /<w:numFmt[^>]*w:val="(decimal|lowerLetter|upperLetter|lowerRoman|upperRoman)"/.test(content);
    map.set(abstractNumId, { isNumbered });
  }
  
  // Map numId to abstractNumId
  const numRegex = /<w:num[^>]*w:numId="(\d+)"[^>]*>[\s\S]*?<w:abstractNumId[^>]*w:val="(\d+)"[\s\S]*?<\/w:num>/g;
  while ((match = numRegex.exec(numberingXml)) !== null) {
    const numId = match[1];
    const abstractNumId = match[2];
    const abstractDef = map.get(abstractNumId);
    if (abstractDef) {
      map.set(`num-${numId}`, abstractDef);
    }
  }
  
  return map;
}

// Detect heading level from paragraph style
function getHeadingLevel(paragraphContent: string): number {
  // Check for heading styles
  const styleMatch = paragraphContent.match(/<w:pStyle[^>]*w:val="([^"]+)"/);
  if (styleMatch) {
    const style = styleMatch[1].toLowerCase();
    if (style.includes('heading1') || style === 'title') return 1;
    if (style.includes('heading2') || style === 'subtitle') return 2;
    if (style.includes('heading3')) return 3;
    if (style.includes('heading')) return 2; // Default heading
  }
  
  // Check for large font size as heading indicator
  const szMatch = paragraphContent.match(/<w:sz[^>]*w:val="(\d+)"/);
  if (szMatch) {
    const fontSize = parseInt(szMatch[1], 10);
    if (fontSize >= 32) return 1;  // 16pt+
    if (fontSize >= 28) return 2;  // 14pt+
    if (fontSize >= 24) return 3;  // 12pt+
  }
  
  return 0;
}

// Get list information from paragraph
function getListInfo(paragraphContent: string, numberingMap: Map<string, { isNumbered: boolean }>): { isList: boolean; isNumbered: boolean; level: number } {
  // Check for list numbering properties
  const numPrMatch = paragraphContent.match(/<w:numPr>([\s\S]*?)<\/w:numPr>/);
  
  if (!numPrMatch) {
    return { isList: false, isNumbered: false, level: 0 };
  }
  
  const numPrContent = numPrMatch[1];
  
  // Get list level (ilvl)
  const ilvlMatch = numPrContent.match(/<w:ilvl[^>]*w:val="(\d+)"/);
  const level = ilvlMatch ? parseInt(ilvlMatch[1], 10) : 0;
  
  // Get numId to determine if numbered or bulleted
  const numIdMatch = numPrContent.match(/<w:numId[^>]*w:val="(\d+)"/);
  let isNumbered = false;
  
  if (numIdMatch) {
    const numId = numIdMatch[1];
    const numDef = numberingMap.get(`num-${numId}`);
    isNumbered = numDef?.isNumbered ?? false;
  }
  
  return { isList: true, isNumbered, level };
}

// Extract text from paragraph with inline formatting
function extractParagraphText(paragraphContent: string): string {
  const textParts: string[] = [];
  
  // Process each run (<w:r>) which contains text and formatting
  const runRegex = /<w:r[^>]*>([\s\S]*?)<\/w:r>/g;
  let runMatch;
  
  while ((runMatch = runRegex.exec(paragraphContent)) !== null) {
    const runContent = runMatch[1];
    
    // Check for bold
    const isBold = /<w:b(?:\s|\/|>)/.test(runContent) || /<w:b[^>]*w:val="(?:true|1|on)"/.test(runContent);
    
    // Extract text
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let textMatch;
    
    while ((textMatch = textRegex.exec(runContent)) !== null) {
      let text = textMatch[1];
      
      // Apply bold formatting
      if (isBold && text.trim()) {
        text = `**${text}**`;
      }
      
      textParts.push(text);
    }
  }
  
  // Join and clean up
  let result = textParts.join('')
    .replace(/\*\*\*\*/g, '')  // Remove empty bold markers
    .replace(/\*\*\s+\*\*/g, ' ')  // Remove bold around whitespace
    .trim();
  
  // Clean up adjacent bold markers
  result = result.replace(/\*\*\*\*/g, '');
  
  return result;
}

// PDF text extraction (simplified)
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  const textMatches: string[] = [];
  const btEtRegex = /BT[\s\S]*?ET/g;
  const matches = text.match(btEtRegex) || [];
  
  for (const match of matches) {
    const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g) || [];
    for (const tj of tjMatches) {
      const content = tj.match(/\(([^)]*)\)/)?.[1] || '';
      if (content.trim()) {
        textMatches.push(content);
      }
    }
    
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
    return textMatches.join(' ').replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();
  }
  
  // Fallback
  return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 50000);
}
