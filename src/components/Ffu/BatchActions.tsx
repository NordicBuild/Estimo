import { useState } from 'react';
import { useBatchOperations } from '../../ffu/hooks/useBatchOperations';
import { Button, Modal, Input } from '../../ui';

interface Props {
  projectId: string;
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function BatchActions({ projectId, selectedIds, onClearSelection, onRefresh }: Props) {
  const { isProcessing, progress, downloadAsZip, batchTag, batchDelete } = useBatchOperations(projectId);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  if (selectedIds.length === 0) return null;

  const handleDownload = async () => {
    try {
      await downloadAsZip(selectedIds);
      onClearSelection();
    } catch (e) {
      alert('Kunde inte ladda ner filer');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Är du säker på att du vill radera ${selectedIds.length} dokument?`)) return;
    try {
      await batchDelete(selectedIds);
      onRefresh();
      onClearSelection();
    } catch (e) {
      alert('Ett fel uppstod vid radering');
    }
  };

  const handleTag = async () => {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) return;
    
    try {
      await batchTag(selectedIds, tags);
      setShowTagModal(false);
      setTagsInput('');
      onRefresh();
      onClearSelection();
    } catch (e) {
      alert('Ett fel uppstod vid taggning');
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border border-gray-200 px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs">
            {selectedIds.length}
          </span>
          valda dokument
        </div>
        
        <div className="w-px h-6 bg-gray-200"></div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleDownload} disabled={isProcessing} className="flex items-center gap-2 text-sm px-3 py-1.5 h-auto">
            <i className="fa-solid fa-file-zipper text-gray-500"></i>
            {isProcessing && progress > 0 ? `${progress}%` : 'Ladda ner (ZIP)'}
          </Button>
          
          <Button variant="ghost" onClick={() => setShowTagModal(true)} disabled={isProcessing} className="flex items-center gap-2 text-sm px-3 py-1.5 h-auto">
            <i className="fa-solid fa-tags text-gray-500"></i>
            Tagga
          </Button>
          
          <Button variant="ghost" onClick={handleDelete} disabled={isProcessing} className="flex items-center gap-2 text-sm px-3 py-1.5 h-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-transparent">
            <i className="fa-solid fa-trash-can"></i>
            Radera
          </Button>
        </div>
        
        <div className="w-px h-6 bg-gray-200"></div>
        
        <button onClick={onClearSelection} className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <Modal isOpen={showTagModal} onClose={() => setShowTagModal(false)} title="Lägg till taggar">
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Dessa taggar kommer att ersätta eventuella befintliga taggar på de {selectedIds.length} valda dokumenten.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taggar (kommaseparerade)</label>
            <Input 
              value={tagsInput} 
              onChange={e => setTagsInput(e.target.value)} 
              placeholder="t.ex. ritning, plan 1, godkänd"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowTagModal(false)}>Avbryt</Button>
            <Button variant="primary" onClick={handleTag} disabled={isProcessing || !tagsInput.trim()}>
              Spara taggar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
