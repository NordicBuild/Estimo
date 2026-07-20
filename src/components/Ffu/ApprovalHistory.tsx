import React from 'react';
import { Approval } from '../../ffu/hooks/useDocumentApprovals';

export function ApprovalHistory({ approvals }: { approvals: Approval[] }) {
  if (approvals.length === 0) {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded text-center">
        Inga godkännanden har begärts för detta dokument.
      </div>
    );
  }

  return (
    <div className="relative border-l border-gray-200 ml-3 space-y-6">
      {approvals.map((approval) => (
        <div key={approval.id} className="relative pl-6">
          {/* Status dot */}
          <span className={`absolute -left-2 top-1 w-4 h-4 rounded-full border-2 border-white ${
            approval.status === 'approved' ? 'bg-green-500' :
            approval.status === 'rejected' ? 'bg-red-500' :
            'bg-yellow-500'
          }`} />
          
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-sm">
            <div className="flex justify-between text-gray-500 mb-1">
              <span>
                Begäran till: <span className="font-medium text-gray-900">{approval.approval_role}</span>
              </span>
              <span>{new Date(approval.requested_at).toLocaleDateString()}</span>
            </div>
            
            <div className="mb-2">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                approval.status === 'approved' ? 'bg-green-100 text-green-700' :
                approval.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {approval.status === 'approved' ? 'Godkänd' :
                 approval.status === 'rejected' ? 'Avvisad / Kräver ändring' :
                 'Väntar på granskning'}
              </span>
            </div>

            {approval.responded_at && (
              <div className="text-xs text-gray-500 mb-2">
                Svarade: {new Date(approval.responded_at).toLocaleDateString()}
              </div>
            )}

            {approval.response_notes && (
              <div className="mt-2 text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                <strong className="text-gray-700 block text-xs uppercase mb-1">Notering / Meddelande:</strong>
                {approval.response_notes}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
