import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const body = await req.json();
    const { documentId, byggdelId, linkType } = body;

    if (!documentId || !byggdelId || !linkType) {
      throw new Error('documentId, byggdelId and linkType are required');
    }

    // 1. Fetch document and byggdel to verify they exist and get metadata
    const [docResult, byggdelResult] = await Promise.all([
      supabaseClient.from('project_documents').select('project_id, document_type').eq('id', documentId).single(),
      supabaseClient.from('project_byggdelar').select('project_id').eq('id', byggdelId).single()
    ]);

    if (docResult.error || !docResult.data) throw new Error('Document not found');
    if (byggdelResult.error || !byggdelResult.data) throw new Error('Byggdel not found');

    const doc = docResult.data;
    const byggdel = byggdelResult.data;

    const errors: string[] = [];

    // 2. Check project match
    if (String(doc.project_id) !== String(byggdel.project_id)) {
      errors.push('Document and Byggdel must belong to the same project');
    }

    // 3. Validate link_type against document_type
    if (linkType === 'approves' && !['besiktning', 'kontroll', 'annat'].includes(doc.document_type)) {
      errors.push('Endast inspektionsrapporter eller kontrollprotokoll kan användas för "approves"');
    }
    
    if (linkType === 'specifies' && !['ritning', 'beskrivning'].includes(doc.document_type)) {
      errors.push('Endast ritningar eller beskrivningar kan användas för "specifies"');
    }

    return new Response(JSON.stringify({ 
      valid: errors.length === 0, 
      errors 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
