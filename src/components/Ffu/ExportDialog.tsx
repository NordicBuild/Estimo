import { useState } from 'react';
import { useBatchOperations } from '../../ffu/hooks/useBatchOperations';
import { Button, Modal } from '../../ui';

interface Props {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedIds?: string[];
}

export function ExportDialog({ projectId, isOpen, onClose, selectedIds = [] }: Props) {
  const { isProcessing, generateProjectManifest, downloadAsZip } = useBatchOperations(projectId);
  const [exportType, setExportType] = useState<'manifest' | 'zip'>('manifest');

  const handleExport = async () => {
    try {
      if (exportType === 'manifest') {
        await generateProjectManifest();
      } else if (exportType === 'zip') {
        if (selectedIds.length === 0) {
          alert('Välj dokument först för ZIP-export');
          return;
        }
        await downloadAsZip(selectedIds);
      }
      onClose();
    } catch (e) {
      alert('Kunde inte exportera');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exportera Projektdata">
      <div className="p-4 space-y-4">
        
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 border-gray-200">
            <input 
              type="radio" 
              name="exportType" 
              value="manifest"
              checked={exportType === 'manifest'}
              onChange={() => setExportType('manifest')}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Projektmanifest (JSON)</div>
              <div className="text-sm text-gray-500">Exportera all metadata, struktur och kopplingar som en strukturerad JSON-fil.</div>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedIds.length === 0 ? 'opacity-50' : 'hover:bg-gray-50 border-gray-200'}`}>
            <input 
              type="radio" 
              name="exportType" 
              value="zip"
              checked={exportType === 'zip'}
              onChange={() => setExportType('zip')}
              disabled={selectedIds.length === 0}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">ZIP-arkiv ({selectedIds.length} valda)</div>
              <div className="text-sm text-gray-500">Ladda ner valda dokument som en komprimerad ZIP-fil.</div>
              {selectedIds.length === 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  Du måste markera dokument i listan först.
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Avbryt
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={isProcessing}>
            {isProcessing ? 'Exporterar...' : 'Exportera'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
