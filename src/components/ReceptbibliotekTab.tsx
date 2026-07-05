import React, { useState, useEffect } from 'react';
import { listRecept, saveRecept, deleteRecept, DbRecept } from '../recept/api';
import { Recept, receptStyckkostnad, receptCo2PerEnhet, ReceptMaterial, ReceptArbete } from '../recept/recept';
import { ResponsiveDialog } from './Modals/ResponsiveDialog';

interface Props {
  companyId: string;
}

export function ReceptbibliotekTab({ companyId }: Props) {
  const [receptList, setReceptList] = useState<DbRecept[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingRecept, setEditingRecept] = useState<DbRecept | null>(null);

  const fetchRecept = async () => {
    setLoading(true);
    try {
      const data = await listRecept(companyId);
      setReceptList(data);
    } catch (err) {
      // warning removed
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecept();
  }, [companyId]);

  const handleEdit = (rec: DbRecept) => {
    setEditingRecept(rec);
    setShowModal(true);
  };

  const handleCreateNew = () => {
    const emptyRecept: DbRecept = {
      id: crypto.randomUUID(),
      company_id: companyId,
      kod: '',
      namn: '',
      enhet: 'st',
      byggdel_type: '',
      byggdelsgrupp: '',
      data: {
        id: crypto.randomUUID(),
        mangd: 1,
        material: [],
        arbete: [],
      }
    };
    setEditingRecept(emptyRecept);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Vill du verkligen ta bort detta recept?')) {
      await deleteRecept(id);
      fetchRecept();
    }
  };

  const handleSaveModal = async (dbRecept: DbRecept) => {
    await saveRecept(dbRecept);
    setShowModal(false);
    fetchRecept();
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laddar receptbibliotek...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Receptbibliotek</h2>
        <button onClick={handleCreateNew} className="btn btn-primary">
          <i className="fa-solid fa-plus mr-2"></i> Nytt recept
        </button>
      </div>

      <div className="bg-white rounded shadow-sm border overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-3 font-semibold">Kod</th>
              <th className="p-3 font-semibold">Namn</th>
              <th className="p-3 font-semibold">Enhet</th>
              <th className="p-3 font-semibold text-right">kr/enh</th>
              <th className="p-3 font-semibold text-right">kg CO₂e/enh</th>
              <th className="p-3 font-semibold text-right">Åtgärder</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {receptList.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 italic">Inga recept inlagda ännu.</td>
              </tr>
            ) : (
              receptList.map(rec => {
                const kostnad = receptStyckkostnad(rec.data);
                const co2 = receptCo2PerEnhet(rec.data);
                
                return (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-600">{rec.kod}</td>
                    <td className="p-3 font-medium text-gray-900">{rec.namn}</td>
                    <td className="p-3 text-gray-500">{rec.enhet}</td>
                    <td className="p-3 num text-right">{kostnad.total.toFixed(2)}</td>
                    <td className="p-3 num text-right text-gray-600">{co2.toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleEdit(rec)} className="text-blue-600 hover:text-blue-800 p-2">
                        <i className="fa-solid fa-pencil"></i>
                      </button>
                      <button onClick={() => handleDelete(rec.id)} className="text-red-600 hover:text-red-800 p-2 ml-2">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && editingRecept && (
        <ReceptModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          initialData={editingRecept} 
          onSave={handleSaveModal} 
        />
      )}
    </div>
  );
}

interface ReceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: DbRecept;
  onSave: (dbRecept: DbRecept) => Promise<void>;
}

function ReceptModal({ isOpen, onClose, initialData, onSave }: ReceptModalProps) {
  const [dbRecept, setDbRecept] = useState<DbRecept>(JSON.parse(JSON.stringify(initialData)));
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: keyof DbRecept, value: any) => {
    setDbRecept(prev => ({ ...prev, [field]: value }));
  };

  const handleDataChange = (field: keyof Recept, value: any) => {
    setDbRecept(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value }
    }));
  };

  const addMaterial = () => {
    const newMat: ReceptMaterial = { id: crypto.randomUUID(), atgang: 1, spill: 0, aPris: 0, co2PerEnhet: 0 };
    handleDataChange('material', [...dbRecept.data.material, newMat]);
  };

  const addArbete = () => {
    const newArb: ReceptArbete = { id: crypto.randomUUID(), atgang: 1, aPris: 0 };
    handleDataChange('arbete', [...dbRecept.data.arbete, newArb]);
  };

  const updateMaterial = (index: number, field: keyof ReceptMaterial, value: number | string) => {
    const newMats = [...dbRecept.data.material];
    newMats[index] = { ...newMats[index], [field]: value };
    handleDataChange('material', newMats);
  };

  const updateArbete = (index: number, field: keyof ReceptArbete, value: number | string) => {
    const newArbs = [...dbRecept.data.arbete];
    newArbs[index] = { ...newArbs[index], [field]: value };
    handleDataChange('arbete', newArbs);
  };

  const removeMaterial = (index: number) => {
    const newMats = [...dbRecept.data.material];
    newMats.splice(index, 1);
    handleDataChange('material', newMats);
  };

  const removeArbete = (index: number) => {
    const newArbs = [...dbRecept.data.arbete];
    newArbs.splice(index, 1);
    handleDataChange('arbete', newArbs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(dbRecept);
    } catch (err) {
      // warning removed
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onClose={onClose} title="Redigera recept">
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Namn *</label>
            <input required type="text" value={dbRecept.namn} onChange={e => handleInputChange('namn', e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kod</label>
            <input type="text" value={dbRecept.kod || ''} onChange={e => handleInputChange('kod', e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Enhet</label>
            <input type="text" value={dbRecept.enhet || ''} onChange={e => handleInputChange('enhet', e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Byggdelstyp (kopplas till geometri)</label>
            <input type="text" value={dbRecept.byggdel_type || ''} onChange={e => {
              handleInputChange('byggdel_type', e.target.value);
              handleDataChange('byggdelType', e.target.value);
            }} className="input w-full" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-gray-800">Material</h4>
            <button type="button" onClick={addMaterial} className="btn btn-secondary text-xs px-2 py-1">
              <i className="fa-solid fa-plus mr-1"></i> Lägg till
            </button>
          </div>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Id (T.ex. artikelnummer)</th>
                  <th className="p-2 w-24">Åtgång</th>
                  <th className="p-2 w-24">Spill (%)</th>
                  <th className="p-2 w-24">À-pris</th>
                  <th className="p-2 w-24">CO₂e</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dbRecept.data.material.map((mat, i) => (
                  <tr key={i} className="bg-white">
                    <td className="p-1">
                      <input type="text" value={mat.id} onChange={e => updateMaterial(i, 'id', e.target.value)} className="input w-full py-1 px-2 text-xs" />
                    </td>
                    <td className="p-1">
                      <input type="number" step="0.001" value={mat.atgang} onChange={e => updateMaterial(i, 'atgang', parseFloat(e.target.value) || 0)} className="input w-full py-1 px-2 text-xs text-right" />
                    </td>
                    <td className="p-1">
                      <input type="number" step="0.01" value={mat.spill} onChange={e => updateMaterial(i, 'spill', parseFloat(e.target.value) || 0)} className="input w-full py-1 px-2 text-xs text-right" />
                    </td>
                    <td className="p-1">
                      <input type="number" step="0.01" value={mat.aPris} onChange={e => updateMaterial(i, 'aPris', parseFloat(e.target.value) || 0)} className="input w-full py-1 px-2 text-xs text-right" />
                    </td>
                    <td className="p-1">
                      <input type="number" step="0.01" value={mat.co2PerEnhet} onChange={e => updateMaterial(i, 'co2PerEnhet', parseFloat(e.target.value) || 0)} className="input w-full py-1 px-2 text-xs text-right" />
                    </td>
                    <td className="p-1 text-center">
                      <button type="button" onClick={() => removeMaterial(i)} className="text-red-500 hover:text-red-700">
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {dbRecept.data.material.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-2 text-center text-xs text-gray-500 italic">Inga material tillagda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-gray-800">Arbete</h4>
            <button type="button" onClick={addArbete} className="btn btn-secondary text-xs px-2 py-1">
              <i className="fa-solid fa-plus mr-1"></i> Lägg till
            </button>
          </div>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Id (T.ex. resurskod)</th>
                  <th className="p-2 w-24">Åtgång (tim)</th>
                  <th className="p-2 w-24">À-pris (kr/h)</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dbRecept.data.arbete.map((arb, i) => (
                  <tr key={i} className="bg-white">
                    <td className="p-1">
                      <input type="text" value={arb.id} onChange={e => updateArbete(i, 'id', e.target.value)} className="input w-full py-1 px-2 text-xs" />
                    </td>
                    <td className="p-1">
                      <input type="number" step="0.001" value={arb.atgang} onChange={e => updateArbete(i, 'atgang', parseFloat(e.target.value) || 0)} className="input w-full py-1 px-2 text-xs text-right" />
                    </td>
                    <td className="p-1">
                      <input type="number" step="0.01" value={arb.aPris} onChange={e => updateArbete(i, 'aPris', parseFloat(e.target.value) || 0)} className="input w-full py-1 px-2 text-xs text-right" />
                    </td>
                    <td className="p-1 text-center">
                      <button type="button" onClick={() => removeArbete(i)} className="text-red-500 hover:text-red-700">
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {dbRecept.data.arbete.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-2 text-center text-xs text-gray-500 italic">Inget arbete tillagt.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary">Avbryt</button>
          <button type="submit" disabled={saving || !dbRecept.namn} className="btn btn-primary">
            {saving ? 'Sparar...' : 'Spara recept'}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
