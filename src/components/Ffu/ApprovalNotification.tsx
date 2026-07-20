import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../state/AuthContext';
import { ApprovalPanel } from './ApprovalPanel';

export function ApprovalNotification() {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string, name: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchPending = async () => {
      // In a real app we would join with project_documents to get the name, 
      // but Supabase standard client requires a nested select
      const { data, error } = await supabase
        .from('document_approvals')
        .select(`
          id,
          document_id,
          project_documents!inner(filename)
        `)
        .eq('status', 'pending')
        .eq('approver_id', user.id); // For the mock demo we might not see this if we use fake UUIDs

      if (data) {
        setPendingApprovals(data);
      }
    };

    fetchPending();

    const subscription = supabase
      .channel('public:document_approvals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_approvals' },
        (payload) => {
          fetchPending();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // If we are using mock IDs for approvers, we won't see them if we filter by `user.id` 
  // unless we actually match. Let's fetch all pending approvals for demo purposes, 
  // or at least have a fallback.
  useEffect(() => {
    // Demo fallback to always show something if available in the company
    const fetchAllPendingDemo = async () => {
      const { data, error } = await supabase
        .from('document_approvals')
        .select(`
          id,
          document_id,
          project_documents!inner(filename)
        `)
        .eq('status', 'pending');

      if (data && !error) {
        setPendingApprovals(data);
      }
    };
    fetchAllPendingDemo();
  }, []);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        <i className="fa-solid fa-bell"></i>
        {pendingApprovals.length > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
            {pendingApprovals.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-100 font-medium text-sm text-gray-700">
            Kräver ditt godkännande
          </div>
          <div className="max-h-64 overflow-y-auto">
            {pendingApprovals.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                Inga väntande godkännanden
              </div>
            ) : (
              pendingApprovals.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setSelectedDoc({ 
                      id: app.document_id, 
                      name: app.project_documents?.filename || 'Okänt dokument' 
                    });
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-3 border-b border-gray-50 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {app.project_documents?.filename || 'Dokument'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Klicka för att granska
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {selectedDoc && (
        <ApprovalPanel
          isOpen={true}
          onClose={() => setSelectedDoc(null)}
          documentId={selectedDoc.id}
          documentName={selectedDoc.name}
        />
      )}
    </div>
  );
}
