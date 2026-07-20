import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../state/AuthContext';
import { useActiveSpace } from '../../state/ActiveSpaceContext';

export interface Approval {
  id: string;
  document_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected';
  approval_role: string;
  requested_at: string;
  responded_at?: string;
  response_notes?: string;
}

export function useDocumentApprovals(documentId?: string) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { activeCompanyId } = useActiveSpace();

  useEffect(() => {
    if (!documentId) return;

    fetchApprovals();

    // Subscribe to realtime updates
    const subscription = supabase
      .channel(`public:document_approvals:document_id=eq.${documentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_approvals', filter: `document_id=eq.${documentId}` },
        (payload) => {
          console.log('Realtime update for document_approvals:', payload);
          fetchApprovals(); // Refresh list on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [documentId]);

  const fetchApprovals = async () => {
    if (!documentId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', documentId)
      .order('requested_at', { ascending: false });

    if (!error && data) {
      setApprovals(data as Approval[]);
    }
    setLoading(false);
  };

  const requestApproval = async (approverId: string, role: string, message: string, deadline: string) => {
    if (!documentId || !activeCompanyId) throw new Error('Missing document or company context');

    const { data, error } = await supabase
      .from('document_approvals')
      .insert({
        company_id: activeCompanyId,
        document_id: documentId,
        approver_id: approverId,
        approval_role: role,
        status: 'pending',
        response_notes: message ? `Meddelande: ${message}` : null,
      })
      .select()
      .single();

    if (error) throw error;
    
    // Optionally trigger an edge function here
    // supabase.functions.invoke('send-approval-notification', { body: { approvalId: data.id, deadline } });
    
    return data;
  };

  const respondToApproval = async (approvalId: string, status: 'approved' | 'rejected', comments: string) => {
    const { data, error } = await supabase
      .from('document_approvals')
      .update({
        status,
        response_notes: comments,
        responded_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const approveDocument = (approvalId: string, comments: string) => respondToApproval(approvalId, 'approved', comments);
  const rejectDocument = (approvalId: string, comments: string) => respondToApproval(approvalId, 'rejected', comments);
  const requestChanges = (approvalId: string, comments: string) => respondToApproval(approvalId, 'rejected', comments); // Maps to rejected conceptually for now

  return {
    approvals,
    loading,
    requestApproval,
    approveDocument,
    rejectDocument,
    requestChanges
  };
}
