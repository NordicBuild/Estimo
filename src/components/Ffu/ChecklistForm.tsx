import React, { useState } from 'react';
import { InspectionReport, InspectionItemVal, useInspections } from '../../ffu/hooks/useInspections';
import { Camera, ChevronLeft, Save, Send, Image as ImageIcon } from 'lucide-react';

export function ChecklistForm({ report, projectId, onClose }: { report: InspectionReport, projectId: string, onClose: () => void }) {
  const { saveInspectionDraft, submitInspection, uploadPhoto } = useInspections(projectId);
  const [items, setItems] = useState<InspectionItemVal[]>(report.items || []);
  const [isSaving, setIsSaving] = useState(false);
  
  const checklist = report.checklist;
  
  const updateItem = (itemId: string, data: Partial<InspectionItemVal>) => {
    setItems(prev => {
      const existing = prev.find(i => i.item_id === itemId);
      if (existing) {
        return prev.map(i => i.item_id === itemId ? { ...i, ...data, timestamp: new Date().toISOString() } : i);
      } else {
        return [...prev, { item_id: itemId, checked: false, notes: '', photo_urls: [], timestamp: new Date().toISOString(), ...data }];
      }
    });
  };

  const handlePhotoUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const url = await uploadPhoto(report.id, itemId, file);
      const existing = items.find(i => i.item_id === itemId);
      const urls = existing?.photo_urls || [];
      updateItem(itemId, { photo_urls: [...urls, url] });
    } catch (err) {
      console.error('Photo upload failed', err);
      alert('Kunde inte ladda upp bilden.');
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await saveInspectionDraft(report.id, items);
    setIsSaving(false);
  };

  const handleSubmit = async () => {
    if (!window.confirm('Är du säker på att du vill skicka in? Detta låser inspektionen.')) return;
    setIsSaving(true);
    await saveInspectionDraft(report.id, items);
    await submitInspection(report.id);
    setIsSaving(false);
    onClose();
  };

  if (!checklist) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-gray-900">{checklist.name}</h2>
            <p className="text-xs text-gray-500">Utkast</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            Spara
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            Skicka in
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <p className="text-gray-600 mb-6">{checklist.description}</p>
          
          <div className="space-y-8">
            {checklist.items.map(item => {
              const itemData = items.find(i => i.item_id === item.id) || { item_id: item.id, checked: false, notes: '', photo_urls: [], timestamp: '' };
              
              return (
                <div key={item.id} className="border-b pb-6 last:border-0 last:pb-0">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <input 
                        type="checkbox"
                        checked={itemData.checked}
                        onChange={(e) => updateItem(item.id, { checked: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="font-medium text-gray-900">{item.label}</label>
                        {item.required && <span className="text-xs text-red-500">*Obligatorisk</span>}
                      </div>
                      
                      <div className="mt-3">
                        <textarea
                          placeholder="Lägg till anteckningar..."
                          value={itemData.notes}
                          onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                          className="w-full text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                          rows={2}
                        />
                      </div>

                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {itemData.photo_urls.map((url, i) => (
                            <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-200">
                              <img src={url} alt="Photo" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors">
                            <Camera className="w-4 h-4" />
                            <span>Ta bild</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment"
                              className="hidden" 
                              onChange={(e) => handlePhotoUpload(item.id, e)}
                            />
                          </label>
                          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors">
                            <ImageIcon className="w-4 h-4" />
                            <span>Välj fil</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePhotoUpload(item.id, e)}
                            />
                          </label>
                          {item.expected_photo && itemData.photo_urls.length === 0 && (
                            <span className="text-xs text-amber-600 ml-2">Bild förväntas</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
