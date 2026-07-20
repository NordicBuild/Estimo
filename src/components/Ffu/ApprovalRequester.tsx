import { useState } from 'react';
import { Button, Modal } from '../../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (approverId: string, role: string, message: string, deadline: string) => Promise<void>;
  isSubmitting?: boolean;
}

const MOCK_TEAM = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Arbetsledare (Anna)', role: 'supervisor' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Kvalitetsansvarig (Erik)', role: 'admin' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Skyddsombud (Maria)', role: 'safety' }
];

export function ApprovalRequester({ isOpen, onClose, onSubmit, isSubmitting }: Props) {
  const [approverId, setApproverId] = useState(MOCK_TEAM[0].id);
  const [role, setRole] = useState(MOCK_TEAM[0].role);
  const [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(approverId, role, message, deadline);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Begär godkännande">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Välj granskare</label>
          <select 
            value={approverId} 
            onChange={(e) => {
              const user = MOCK_TEAM.find(u => u.id === e.target.value);
              setApproverId(e.target.value);
              if (user) setRole(user.role);
            }}
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {MOCK_TEAM.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Roll för godkännande</label>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="supervisor">Arbetsledare</option>
            <option value="admin">Administratör / QA</option>
            <option value="safety">Skyddsombud (KMA)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meddelande (frivilligt)</label>
          <textarea 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Vad behöver granskas särskilt?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (frivilligt)</label>
          <input 
            type="date" 
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Avbryt
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Skickar...' : 'Skicka förfrågan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
