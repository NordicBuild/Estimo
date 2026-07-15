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
    const { projectId, query, filters } = body;

    if (!projectId) {
      throw new Error('projectId is required');
    }

    let queryBuilder = supabaseClient
      .from('project_documents')
      .select('id, filename, document_type, tags, created_at, updated_at')
      .eq('project_id', projectId)
      .is('deleted_at', null);
      
    if (filters?.type && filters.type !== 'all') {
      queryBuilder = queryBuilder.eq('document_type', filters.type);
    }
    
    const { data: documents, error: docsError } = await queryBuilder.limit(1000);
    if (docsError) throw docsError;

    if (!documents) {
      return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const docIds = documents.map(d => d.id);
    let comments: any[] = [];
    if (docIds.length > 0 && query && query.length > 2) {
      const { data: commentsData } = await supabaseClient
        .from('document_comments')
        .select('document_id, content')
        .in('document_id', docIds)
        .ilike('content', `%${query}%`)
        .is('deleted_at', null);
      if (commentsData) comments = commentsData;
    }

    let results = documents.map(doc => {
      let score = 0;
      
      if (!query || query.trim() === '') {
        score = 1;
      } else {
        const lowerQuery = query.toLowerCase().trim();
        const tokens = lowerQuery.split(/\s+/).filter(Boolean);
        const lowerFilename = doc.filename.toLowerCase();
        const docTags = (doc.tags || []).map((t: string) => t.toLowerCase());

        tokens.forEach(token => {
          if (lowerFilename.includes(token)) score += 10;
          if (lowerFilename.startsWith(token)) score += 5;
          if (docTags.some((t: string) => t.includes(token))) score += 8;
          if (doc.document_type.toLowerCase().includes(token)) score += 3;
        });

        const docComments = comments.filter((c: any) => c.document_id === doc.id);
        if (docComments.length > 0) {
          score += (docComments.length * 5);
        }
      }

      return { ...doc, score };
    });

    if (query && query.trim() !== '') {
      results = results.filter(r => r.score > 0);
    }
    
    results.sort((a, b) => b.score - a.score);

    return new Response(JSON.stringify({ results: results.slice(0, 50) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
