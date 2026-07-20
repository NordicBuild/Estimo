import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../state/AuthContext';

export interface DocumentByggdelLink {
  id: string;
  document_id: string;
  byggdel_id: string;
  link_type: 'specifies' | 'approves' | 'references' | 'inspects';
  created_by: string;
  created_at: string;
  notes: string;
  document?: any; // joined document data
  byggdel?: any;  // joined byggdel data
  creator?: any;  // joined profile
}

export function useDocumentBygdelLinks(projectId: string | null) {
  const { user } = useAuth();
  const [links, setLinks] = useState<DocumentByggdelLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!projectId || !user) return;
    setIsLoading(true);
    
    // We fetch links for the whole project to cache them, or we could filter by document/byggdel later
    const { data, error } = await supabase
      .from('document_byggdel_links')
      .select(`
        *,
        document:project_documents(id, filename, document_type),
        byggdel:project_byggdelar(id, data),
        creator:profiles!created_by(first_name, last_name)
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null);
      
    if (error) {
      // console.warn('Table might not exist, using empty array for links', error);
      setLinks([]);
    } else {
      setLinks(data as any || []);
    }
    setIsLoading(false);
  }, [projectId, user]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const addLink = async (documentId: string, byggdelId: string, linkType: string, notes: string = '') => {
    if (!projectId || !user || !user) throw new Error('Missing context');

    // Validate link via Edge Function
    const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-document-byggdel-link', {
      body: { documentId, byggdelId, linkType }
    });

    if (validationError) throw validationError;
    if (!validationData.valid) {
      throw new Error(validationData.errors.join('\\n'));
    }

    const { data, error } = await supabase
      .from('document_byggdel_links')
      .insert({
        company_id: (user?.user_metadata?.company_id || localStorage.getItem('companyId') || ''),
        project_id: projectId,
        document_id: documentId,
        byggdel_id: byggdelId,
        link_type: linkType,
        created_by: user.id,
        notes
      })
      .select()
      .single();

    if (error) throw error;
    await fetchLinks();
    return data;
  };

  const removeLink = async (linkId: string) => {
    const { error } = await supabase
      .from('document_byggdel_links')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', linkId);
      
    if (error) throw error;
    await fetchLinks();
  };

  const getLinksForDocument = (documentId: string) => {
    return links.filter(l => l.document_id === documentId);
  };

  const getLinksForByggdel = (byggdelId: string) => {
    return links.filter(l => l.byggdel_id === byggdelId);
  };

  return {
    links,
    isLoading,
    addLink,
    removeLink,
    getLinksForDocument,
    getLinksForByggdel,
    refresh: fetchLinks
  };
}
