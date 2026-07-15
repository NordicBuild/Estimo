import React, { useState } from 'react';
import { useDocumentBygdelLinks, DocumentByggdelLink } from '../../ffu/hooks/useDocumentBygdelLinks';
import { Link2, Trash2, Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface BygdelLinkPanelProps {
  documentId: string;
  projectId: string;
  availableByggdelar: any[]; // Passed from KalkylStore or fetched locally
}

export function BygdelLinkPanel({ documentId, projectId, availableByggdelar }: BygdelLinkPanelProps) {
  const { getLinksForDocument, addLink, removeLink, isLoading } = useDocumentBygdelLinks(projectId);
  const [isLinking, setIsLinking] = useState(false);
  const [selectedByggdel, setSelectedByggdel] = useState('');
  const [linkType, setLinkType] = useState('references');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const linkedDocs = getLinksForDocument(documentId);

  const handleAddLink = async () => {
    if (!selectedByggdel) return;
    setError('');
    setIsSubmitting(true);
    try {
      await addLink(documentId, selectedByggdel, linkType, '');
      setIsLinking(false);
      setSelectedByggdel('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'specifies': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approves': return 'bg-green-100 text-green-800 border-green-200';
      case 'inspects': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const translateType = (type: string) => {
    switch (type) {
      case 'specifies': return 'Specificerar';
      case 'approves': return 'Godkänner';
      case 'inspects': return 'Inspekterar';
      case 'references': return 'Refererar till';
      default: return type;
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-gray-500" />
          Kopplade Byggdelar
        </h3>
        <button
          onClick={() => setIsLinking(!isLinking)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
        >
          {isLinking ? 'Avbryt' : <><Plus className="w-3 h-3" /> Lägg till koppling</>}
        </button>
      </div>

      {isLinking && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Välj Byggdel</label>
              <select
                value={selectedByggdel}
                onChange={(e) => setSelectedByggdel(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md p-2 bg-white"
              >
                <option value="">-- Välj --</option>
                {availableByggdelar.map(b => {
                  const data = typeof b.data === 'string' ? JSON.parse(b.data) : b.data;
                  return (
                    <option key={b.id} value={b.id}>
                      {data?.namn || 'Okänd byggdel'}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kopplingstyp</label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md p-2 bg-white"
              >
                <option value="references">Refererar till (Allmän info)</option>
                <option value="specifies">Specificerar (Ritning/Beskrivning)</option>
                <option value="approves">Godkänner (Inspektion)</option>
                <option value="inspects">Inspekterar (QA)</option>
              </select>
            </div>
            
            {error && (
              <div className="flex items-start gap-1.5 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleAddLink}
              disabled={!selectedByggdel || isSubmitting}
              className="w-full bg-blue-600 text-white py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Spara koppling
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-500 animate-pulse">Laddar kopplingar...</div>
      ) : linkedDocs.length === 0 ? (
        <div className="text-sm text-gray-500 italic">Inga byggdelar kopplade till detta dokument.</div>
      ) : (
        <div className="space-y-2">
          {linkedDocs.map((link) => {
            const byggdelData = typeof link.byggdel?.data === 'string' ? JSON.parse(link.byggdel.data) : link.byggdel?.data;
            return (
              <div key={link.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md border border-transparent hover:border-gray-200 transition-colors group">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {byggdelData?.namn || 'Okänd byggdel'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${getBadgeColor(link.link_type)}`}>
                      {translateType(link.link_type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      av {link.creator?.first_name} {link.creator?.last_name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeLink(link.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Ta bort koppling"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
