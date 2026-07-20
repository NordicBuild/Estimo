import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../state/AuthContext';

export interface Comment {
  id: string;
  document_id: string;
  document_version_id?: string | null;
  author_id: string;
  parent_comment_id?: string | null;
  content: string;
  resolved: boolean;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  replies?: Comment[];
}

export function useDocumentComments(documentId: string | null) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!documentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('document_comments')
        .select(`
          *,
          profiles (id, first_name, last_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Organize into threads
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      data?.forEach((c: any) => {
        const comment = { ...c, replies: [] };
        commentMap.set(comment.id, comment);
      });

      data?.forEach((c: any) => {
        if (c.parent_comment_id) {
          const parent = commentMap.get(c.parent_comment_id);
          if (parent) {
            parent.replies!.push(commentMap.get(c.id)!);
          }
        } else {
          rootComments.push(commentMap.get(c.id)!);
        }
      });

      setComments(rootComments);
    } catch (err: any) {
      console.warn('Comments fetch (expected if missing tables):', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (!documentId) return;

    const subscription = supabase
      .channel(`public:document_comments:document_id=eq.${documentId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'document_comments',
        filter: `document_id=eq.${documentId}`
      }, (payload) => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [documentId, fetchComments]);

  const addComment = async (content: string, parentId?: string | null) => {
    if (!documentId || !user || !user) return null;
    
    try {
      const { data, error } = await supabase
        .from('document_comments')
        .insert({
          document_id: documentId,
          company_id: (user?.user_metadata?.company_id || localStorage.getItem('companyId') || ''),
          author_id: user.id,
          parent_comment_id: parentId || null,
          content
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  const resolveComment = async (commentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('document_comments')
        .update({
          resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', commentId);
        
      if (error) throw error;
    } catch (err: any) {
      console.error('Error resolving comment:', err);
      throw err;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('document_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId);
        
      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  return {
    comments,
    isLoading,
    error,
    addComment,
    resolveComment,
    deleteComment,
    refreshComments: fetchComments
  };
}
