import React, { useState } from 'react';
import { useDocumentApprovals, Approval } from '../../ffu/hooks/useDocumentApprovals';
import { Button, Modal } from '../../ui';
import { ApprovalRequester } from './ApprovalRequester';

interface Props {
  documentId: string;
  documentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ApprovalPanel({ documentId, documentName, isOpen, onClose }: Props) {
  const { approvals, loading, requestApproval, approveDocument, rejectDocument } = useDocumentApprovals(documentId);
  const [isRequesterOpen, setIsRequesterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseComment, setResponseComment] = useState('');

  const handleRequestApproval = async (approverId: string, role: string, message: string, deadline: string) => {
    setIsSubmitting(true);
    try {
      await requestApproval(approverId, role, message, deadline);
      setIsRequesterOpen(false);
    } catch (e) {
      console.error(e);
      alert('Kunde inte begära godkännande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResponse = async (approvalId: string, type: 'approve' | 'reject') => {
    try {
      if (type === 'approve') {
        await approveDocument(approvalId, responseComment);
      } else {
        await rejectDocument(approvalId, responseComment);
      }
      setResponseComment('');
    } catch (e) {
      console.error(e);
      alert('Kunde inte spara svaret.');
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Godkännanden: ${documentName}`}>
        <div className="p-4 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Granskningshistorik</h3>
            <Button variant="primary" onClick={() => setIsRequesterOpen(true)} className="text-sm">
              Begär godkännande
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Laddar...</p>
          ) : approvals.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded text-center">
              Inga godkännanden har begärts för detta dokument.
            </p>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div key={approval.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          approval.status === 'approved' ? 'bg-green-100 text-green-700' :
                          approval.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {approval.status === 'approved' ? 'Godkänd' :
                           approval.status === 'rejected' ? 'Avvisad/Kräver ändring' :
                           'Väntar på granskning'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(approval.requested_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1">Roll: {approval.approval_role}</p>
                    </div>
                  </div>
                  
                  {approval.response_notes && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <strong className="text-gray-700">Notering:</strong> {approval.response_notes}
                    </div>
                  )}

                  {approval.status === 'pending' && (
                    <div className="mt-4 border-t pt-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Ditt svar (som granskare):</p>
                      <textarea
                        value={responseComment}
                        onChange={(e) => setResponseComment(e.target.value)}
                        placeholder="Lägg till en kommentar..."
                        className="w-full text-sm border-gray-300 rounded p-2 mb-2 focus:ring-blue-500 focus:border-blue-500 border"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button variant="primary" onClick={() => handleResponse(approval.id, 'approve')} className="text-sm px-3 py-1.5 h-auto bg-green-600 hover:bg-green-700 border-transparent">
                          <i className="fa-solid fa-check mr-1"></i> Godkänn
                        </Button>
                        <Button variant="ghost" onClick={() => handleResponse(approval.id, 'reject')} className="text-sm px-3 py-1.5 h-auto text-red-600 hover:bg-red-50">
                          <i className="fa-solid fa-xmark mr-1"></i> Avvisa / Begär ändring
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ApprovalRequester
        isOpen={isRequesterOpen}
        onClose={() => setIsRequesterOpen(false)}
        onSubmit={handleRequestApproval}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
