import React, { useState, Fragment, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Material, DEFAULT_MATERIAL } from '../data';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  materials: Material[];
  customCategories: string[];
  updateMaterial: (index: number, updates: Partial<Material>) => void;
  updateMultipleMaterials: (indices: number[], updates: Partial<Material>, addHistory?: { price: number, date: string, updateCurrentPrice: boolean }) => void;
  addMaterial: (mat: Material) => void;
  addMaterials: (mats: Material[]) => void;
  deleteMaterial: (index: number) => void;
  deleteMultipleMaterials?: (indices: number[]) => void;
  addCategory: (cat: string) => void;
  renameCategory: (oldCat: string, newCat: string) => void;
  removeCategory: (cat: string) => void;
  showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function MaterialTab({ materials, customCategories, updateMaterial, updateMultipleMaterials, addMaterial, addMaterials, deleteMaterial, deleteMultipleMaterials, addCategory, renameCategory, removeCategory, showNotification }: Props) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newMatForm, setNewMatForm] = useState({ name: '', cat: '', catNy: '', unit: 'st', konto: '4000' });
  const [newCatName, setNewCatName] = useState('');
  const [editingCatName, setEditingCatName] = useState<{old: string, new: string} | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkForm, setBulkForm] = useState<{
    updateCat: boolean; cat: string;
    updateKonto: boolean; konto: string;
    updatePrice: boolean; price: number | string;
    updateSpill: boolean; spill: number | string;
    updateHistory: boolean; historyPrice: number | string; historyDate: string; historyUpdateCurrentPrice: boolean;
  }>({
    updateCat: false, cat: '',
    updateKonto: false, konto: '',
    updatePrice: false, price: 0,
    updateSpill: false, spill: 0,
    updateHistory: false, historyPrice: 0, historyDate: new Date().toISOString().split('T')[0], historyUpdateCurrentPrice: true
  });

  const categories = Array.from(new Set([...materials.map(m => m.cat), ...customCategories]));
  const filteredCategories = categories.filter(c => c.toLowerCase().includes(catSearch.toLowerCase()));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        Kategori: 'Betong',
        Material: 'Exempelbetong',
        Enhet: 'm³',
        Konto: '4011',
        Pris: 1500,
        SpillProcent: 5,
        Leverantör: '',
        Anteckning: ''
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mall');
    XLSX.writeFile(wb, 'Material_Mall.xlsx');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        const newMaterials = jsonData.map(row => {
          let cat = row.Kategori || 'Övrigt';
          addCategory(cat);
          
          return {
            cat: cat,
            name: row.Material || 'Okänt material',
            unit: row.Enhet || 'st',
            konto: row.Konto?.toString() || '4000',
            price: parseFloat(row.Pris) || 0,
            spill: parseFloat(row.SpillProcent) || 0,
            lev: row.Leverantör || '',
            note: row.Anteckning || ''
          };
        });

        if (newMaterials.length > 0) {
           addMaterials(newMaterials as Material[]);
           if (showNotification) showNotification(`${newMaterials.length} material importerades framgångsrikt.`, 'success');
        }
      } catch (err) {
         console.error(err);
         if (showNotification) showNotification("Ett fel uppstod vid inläsning av Excel-filen.", 'error');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddMaterial = () => {
    const finalCat = newMatForm.cat === 'ny' ? newMatForm.catNy : newMatForm.cat;
    if (!newMatForm.name || !finalCat) {
      if (showNotification) showNotification('Var god fyll i materialnamn och kategori.', 'error');
      return;
    }

    if (editIndex !== null) {
      updateMaterial(editIndex, {
        cat: finalCat,
        name: newMatForm.name,
        unit: newMatForm.unit || 'st',
        konto: newMatForm.konto || '4000'
      });
      setEditIndex(null);
      if (showNotification) showNotification('Material uppdaterat.', 'success');
    } else {
      addMaterial({
        ...(DEFAULT_MATERIAL as any),
        cat: finalCat,
        name: newMatForm.name,
        unit: newMatForm.unit || 'st',
        konto: newMatForm.konto || '4000'
      });
      if (showNotification) showNotification('Material tillagt.', 'success');
    }

    if (newMatForm.cat === 'ny') addCategory(finalCat);
    setNewMatForm({ name: '', cat: '', catNy: '', unit: 'st', konto: '4000' });
    setShowAddForm(false);
  };

  const handleEdit = (m: Material, idx: number) => {
    setNewMatForm({
      name: m.name,
      cat: m.cat,
      catNy: '',
      unit: m.unit,
      konto: m.konto || '4000'
    });
    setEditIndex(idx);
    setShowAddForm(true);
    setShowCatManager(false);
  };

  const filtered = materials.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.cat.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || m.cat === filterCat;
    return matchSearch && matchCat;
  });

  const CAT_COLORS: Record<string, string> = {
    Betong: 'var(--blue-lt)',
    Armering: 'var(--purple-lt)',
    Isolering: 'var(--green-lt)',
    Komplettering: 'var(--amber-lt)'
  };

  const SpillEditable = ({ index, mat }: { index: number, mat: Material }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(mat.spill?.toString() ?? '0');

    const handleBlur = () => {
      const parsed = Number(val.replace(',', '.'));
      let newSpillValue = mat.spill ?? 0;
      if (!isNaN(parsed) && parsed >= 0) {
        newSpillValue = parsed;
      }
      
      if (newSpillValue !== mat.spill) {
        updateMaterial(index, { spill: newSpillValue });
      } else {
        setVal(newSpillValue.toString());
      }
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <input 
          autoFocus
          type="number" 
          step="any"
          min="0"
          className="w-14 text-right font-mono border border-[var(--blue)] rounded px-1 py-0.5 text-xs outline-none"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') handleBlur(); }}
        />
      );
    }

    return (
      <span 
        onClick={() => setIsEditing(true)} 
        className="w-14 inline-block text-right font-mono bg-transparent border border-transparent rounded px-1 py-0.5 text-xs hover:border-gray-300 outline-none cursor-pointer"
      >
        {mat.spill ?? 0}
      </span>
    );
  };

  const PriceEditable = ({ index, mat }: { index: number, mat: Material }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(mat.price?.toString() ?? '0');

    const handleBlur = () => {
      const parsed = Number(val.replace(',', '.'));
      let newPriceValue = mat.price ?? 0;
      if (!isNaN(parsed) && parsed >= 0) {
        newPriceValue = parsed;
      }
      
      if (newPriceValue !== mat.price) {
        const newHistory = [...(mat.priceHistory || [])];
        if (newHistory.length === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          newHistory.push({ date: yesterday.toISOString().split('T')[0], price: mat.price ?? 0 });
        }
        newHistory.push({ date: new Date().toISOString().split('T')[0], price: newPriceValue });
        updateMaterial(index, { price: newPriceValue, priceHistory: newHistory });
      } else {
        setVal(newPriceValue.toString());
      }
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <input 
          autoFocus
          type="number" 
          step="any"
          min="0"
          className="w-20 text-right font-mono font-bold text-blue-600 bg-white border border-gray-300 rounded px-1 py-0.5 text-xs focus:border-blue-500 outline-none transition-colors"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <span 
        onClick={() => { setIsEditing(true); setVal(mat.price?.toString() ?? '0'); }}
        className="cursor-pointer text-blue-600 border border-transparent hover:border-gray-300 px-1 py-0.5 rounded transition-colors inline-block min-w-[3rem] font-bold font-mono text-right text-xs"
        title="Klicka för att redigera"
      >
        {mat.price ?? 0}
      </span>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Sök material..." 
            className="border border-[var(--border)] rounded px-3 py-2 w-full sm:w-64 outline-none focus:border-[var(--blue)]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select 
            className="border border-[var(--border)] rounded px-3 py-2 w-full sm:w-64 outline-none focus:border-[var(--blue)]"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">Alla kategorier</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
            id="excel-import" 
          />
          <button 
            onClick={downloadTemplate}
            className="px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap border border-[var(--border)] text-[var(--text2)] hover:bg-gray-50 flex items-center gap-2"
            title="Ladda ner Excel-mall"
          >
            <i className="fa-solid fa-download"></i> Mall
          </button>
          <label 
            htmlFor="excel-import"
            className="px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap border border-[var(--border)] text-[var(--text2)] hover:bg-gray-50 cursor-pointer flex items-center gap-2"
            title="Importera från Excel"
          >
            <i className="fa-solid fa-file-excel text-green-600"></i> Importera
          </label>
          <button 
            onClick={() => { setShowCatManager(!showCatManager); setShowAddForm(false); }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap border ${showCatManager ? 'bg-gray-100 border-gray-300 text-gray-800' : 'border-[var(--border)] text-[var(--text2)] hover:bg-gray-50'}`}
          >
            Hantera Kategorier
          </button>
          <button 
            onClick={() => { setShowAddForm(!showAddForm); setShowCatManager(false); if (showAddForm) setEditIndex(null); }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap text-white ${editIndex !== null ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[var(--blue)] hover:bg-blue-700'}`}
          >
            {showAddForm ? 'Avbryt' : (editIndex !== null ? 'Redigera Material' : '+ Nytt Material')}
          </button>
        </div>
      </div>

      {showCatManager && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-4 mb-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-semibold text-sm">Materialkategorier</h3>
            <div className="relative w-full sm:w-auto">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input 
                type="text" 
                className="border border-[var(--border)] rounded-full px-3 py-1.5 pl-8 w-full sm:w-64 outline-none focus:border-[var(--blue)] text-sm"
                value={catSearch}
                onChange={e => setCatSearch(e.target.value)}
                placeholder="Sök eller filtrera kategorier..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              className="border border-[var(--border)] rounded px-3 py-1.5 w-64 outline-none focus:border-[var(--blue)] text-sm"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Ny kategori..."
            />
            <button 
              onClick={() => { if(newCatName) { addCategory(newCatName); setNewCatName(''); if(showNotification) showNotification('Kategori tillagd.', 'success'); } }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Lägg till
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredCategories.length === 0 ? (
              <div className="col-span-full text-sm text-[var(--text3)] py-4 text-center">
                Inga kategorier matchar din sökning.
              </div>
            ) : filteredCategories.map(c => (
              <div key={c} className="bg-white border border-[var(--border)] rounded p-2 flex items-center justify-between">
                {editingCatName?.old === c ? (
                  <div className="flex gap-1 flex-1 mr-2">
                    <input 
                      type="text" 
                      className="border border-[var(--border)] rounded px-2 py-1 flex-1 text-sm outline-none focus:border-[var(--blue)]"
                      value={editingCatName.new}
                      onChange={e => setEditingCatName({...editingCatName, new: e.target.value})}
                    />
                    <button 
                      onClick={() => { if(editingCatName.new) { renameCategory(c, editingCatName.new); setEditingCatName(null); if(showNotification) showNotification('Kategori uppdaterad.', 'success'); } }}
                      className="text-green-600 hover:bg-green-50 px-2 py-1 rounded"
                    >
                      <i className="fa-solid fa-check"></i>
                    </button>
                    <button 
                      onClick={() => setEditingCatName(null)}
                      className="text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium truncate flex-1 min-w-0 mr-2">{c}</span>
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => setEditingCatName({old: c, new: c})}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--blue-lt)] hover:text-[var(--blue)] transition-colors text-[var(--text3)]"
                        title="Redigera"
                      >
                        <i className="fa-solid fa-pen text-[0.65rem]"></i>
                      </button>
                      <button 
                        onClick={() => { removeCategory(c); if(showNotification) showNotification('Kategori borttagen.', 'success'); }}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--red-lt)] hover:text-[var(--red)] transition-colors text-[var(--text3)]"
                        title="Ta bort"
                      >
                        <i className="fa-solid fa-trash text-[0.65rem]"></i>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-4 mb-4 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Namn</label>
            <input 
              type="text" 
              className="border border-[var(--border)] rounded px-3 py-2 w-full sm:w-64 outline-none focus:border-[var(--blue)] text-sm"
              value={newMatForm.name}
              onChange={e => setNewMatForm({...newMatForm, name: e.target.value})}
              placeholder="Materialnamn"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Kategori</label>
            <select 
              className="border border-[var(--border)] rounded px-3 py-2 w-full sm:w-48 outline-none focus:border-[var(--blue)] text-sm"
              value={newMatForm.cat}
              onChange={e => setNewMatForm({...newMatForm, cat: e.target.value})}
            >
              <option value="">Välj...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="ny">+ Ny kategori</option>
            </select>
          </div>
          {newMatForm.cat === 'ny' && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Ny kategori</label>
              <input 
                type="text" 
                className="border border-[var(--border)] rounded px-3 py-2 w-full sm:w-48 outline-none focus:border-[var(--blue)] text-sm"
                value={newMatForm.catNy}
                onChange={e => setNewMatForm({...newMatForm, catNy: e.target.value})}
                placeholder="Kategorinamn"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Enhet</label>
            <input 
              type="text" 
              className="border border-[var(--border)] rounded px-3 py-2 w-32 outline-none focus:border-[var(--blue)] text-sm"
              value={newMatForm.unit}
              onChange={e => setNewMatForm({...newMatForm, unit: e.target.value})}
              placeholder="t.ex st, pall"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Konto</label>
            <input 
              type="text" 
              className="border border-[var(--border)] rounded px-3 py-2 w-32 outline-none focus:border-[var(--blue)] text-sm"
              value={newMatForm.konto}
              onChange={e => setNewMatForm({...newMatForm, konto: e.target.value})}
              placeholder="t.ex 4011"
            />
          </div>
          <button 
            onClick={handleAddMaterial}
            disabled={!newMatForm.name || (!newMatForm.cat && newMatForm.cat !== 'ny') || (newMatForm.cat === 'ny' && !newMatForm.catNy)}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Spara
          </button>
        </div>
      )}

      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface2)] flex items-center justify-between font-bold text-[var(--text2)] uppercase tracking-wider text-xs">
          <span>Materialkatalog</span>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border-b border-[var(--border)] p-3 flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-blue-800">{selectedIds.length} valda</span>
            <div className="flex gap-4 flex-wrap flex-1 text-sm border-l border-blue-200 pl-4">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={bulkForm.updateCat} onChange={(e) => setBulkForm({...bulkForm, updateCat: e.target.checked})} />
                Byt Kategori
              </label>
              {bulkForm.updateCat && (
                <select className="border border-blue-200 rounded px-2 py-0.5" value={bulkForm.cat} onChange={e => setBulkForm({...bulkForm, cat: e.target.value})}>
                  <option value="">Välj...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}

              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={bulkForm.updateKonto} onChange={(e) => setBulkForm({...bulkForm, updateKonto: e.target.checked})} />
                Byt Konto
              </label>
              {bulkForm.updateKonto && <input type="text" className="w-20 border border-blue-200 rounded px-2 py-0.5" value={bulkForm.konto} onChange={e => setBulkForm({...bulkForm, konto: e.target.value})} />}

              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={bulkForm.updatePrice} onChange={(e) => setBulkForm({...bulkForm, updatePrice: e.target.checked})} />
                Byt Pris
              </label>
              {bulkForm.updatePrice && <input type="number" step="any" min="0" className="w-20 border border-blue-200 rounded px-2 py-0.5" value={bulkForm.price} onChange={e => setBulkForm({...bulkForm, price: e.target.value})} />}

              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={bulkForm.updateSpill} onChange={(e) => setBulkForm({...bulkForm, updateSpill: e.target.checked})} />
                Byt Spill %
              </label>
              {bulkForm.updateSpill && <input type="number" step="any" min="0" className="w-16 border border-blue-200 rounded px-2 py-0.5" value={bulkForm.spill} onChange={e => setBulkForm({...bulkForm, spill: e.target.value})} />}

              <div className="w-full h-0"></div>

              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={bulkForm.updateHistory} onChange={(e) => setBulkForm({...bulkForm, updateHistory: e.target.checked})} />
                Lägg till i prishistorik
              </label>
              {bulkForm.updateHistory && (
                <div className="flex gap-2 items-center">
                  <input type="number" step="any" min="0" placeholder="Pris" className="w-20 border border-blue-200 rounded px-2 py-0.5" value={bulkForm.historyPrice} onChange={e => setBulkForm({...bulkForm, historyPrice: e.target.value})} />
                  <input type="date" className="border border-blue-200 rounded px-2 py-0.5" value={bulkForm.historyDate} onChange={e => setBulkForm({...bulkForm, historyDate: e.target.value})} />
                  <label className="flex items-center gap-1 text-xs cursor-pointer ml-2">
                    <input type="checkbox" checked={bulkForm.historyUpdateCurrentPrice} onChange={e => setBulkForm({...bulkForm, historyUpdateCurrentPrice: e.target.checked})} />
                    Ändra även nuvarande pris
                  </label>
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                const sn = (val: string | number) => Number(String(val).replace(',', '.')) || 0;
                const updates: Partial<Material> = {};
                if (bulkForm.updateCat && bulkForm.cat) updates.cat = bulkForm.cat;
                if (bulkForm.updateKonto) updates.konto = bulkForm.konto;
                if (bulkForm.updatePrice && !bulkForm.updateHistory) updates.price = sn(bulkForm.price);
                if (bulkForm.updateSpill) updates.spill = sn(bulkForm.spill);
                
                let addHistoryArg = undefined;
                if (bulkForm.updateHistory) {
                  addHistoryArg = {
                    price: sn(bulkForm.historyPrice),
                    date: bulkForm.historyDate,
                    updateCurrentPrice: bulkForm.historyUpdateCurrentPrice
                  };
                }

                if (Object.keys(updates).length > 0 || addHistoryArg) {
                  updateMultipleMaterials(selectedIds, updates, addHistoryArg);
                  setSelectedIds([]);
                  setBulkForm({ 
                    updateCat: false, cat: '', 
                    updateKonto: false, konto: '', 
                    updatePrice: false, price: 0, 
                    updateSpill: false, spill: 0,
                    updateHistory: false, historyPrice: 0, historyDate: new Date().toISOString().split('T')[0], historyUpdateCurrentPrice: true
                  });
                }
              }}
              disabled={!(bulkForm.updateCat && bulkForm.cat) && !bulkForm.updateKonto && !bulkForm.updatePrice && !bulkForm.updateSpill && !bulkForm.updateHistory}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Tillämpa på {selectedIds.length} rader
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-xs text-blue-600 hover:underline ml-2 uppercase"
            >
              Avbryt
            </button>
            {deleteMultipleMaterials && (
              <button 
                onClick={() => {
                  deleteMultipleMaterials(selectedIds);
                  setSelectedIds([]);
                  if (showNotification) showNotification('Flera material har raderats.', 'success');
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors ml-auto flex items-center gap-2"
              >
                <i className="fa-solid fa-trash text-xs"></i>
                Ta bort {selectedIds.length} valda
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-[var(--surface3)] border-b-2 border-[var(--border2)]">
                <th className="p-2 w-8 text-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    ref={input => {
                      if (input) {
                        input.indeterminate = selectedIds.length > 0 && selectedIds.length < filtered.length;
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filtered.map(m => materials.indexOf(m)).filter(idx => idx !== -1));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                <th className="p-2 text-left text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Kategori</th>
                <th className="p-2 w-[35%] max-w-[250px] text-left text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Material</th>
                <th className="p-2 text-center text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Enhet</th>
                <th className="p-2 text-center text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Konto</th>
                <th className="p-2 text-right text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Pris (kr)</th>
                <th className="p-2 text-right text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Spill %</th>
                <th className="p-2 text-left text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Leverantör</th>
                <th className="p-2 text-left text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Notering</th>
                <th className="p-2 w-32 text-right text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[var(--text3)]">
                    <i className="fa-solid fa-box text-2xl opacity-20 mb-3 block"></i>
                    <p>Inga material matchar filtret</p>
                  </td>
                </tr>
              ) : (
                filtered.map((m, filterIndex) => {
                  const actualIndex = materials.indexOf(m);
                  if (actualIndex === -1) return null;
                  const bg = CAT_COLORS[m.cat] || 'var(--surface2)';
                  
                  return (
                    <Fragment key={actualIndex}>
                      <tr className={`border-b border-[var(--border)] hover:bg-gray-50 group ${selectedIds.includes(actualIndex) ? 'bg-blue-50/50' : ''}`}>
                        <td className="p-2 px-3 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedIds.includes(actualIndex)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds([...selectedIds, actualIndex]);
                              else setSelectedIds(selectedIds.filter(id => id !== actualIndex));
                            }}
                          />
                        </td>
                        <td className="p-2 px-3">
                          <select 
                            className="bg-transparent text-[.59rem] font-bold py-0.5 px-2 rounded-md outline-none border border-transparent hover:border-gray-300 focus:border-[var(--blue)] focus:bg-white transition-colors cursor-pointer"
                            style={{ background: bg, color: 'var(--text2)' }}
                            value={m.cat}
                            onChange={(e) => updateMaterial(actualIndex, { cat: e.target.value })}
                          >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="p-2 px-3 font-semibold text-sm w-[35%] max-w-[250px] whitespace-normal break-words leading-tight">{m.name}</td>
                        <td className="p-2 px-3 text-center">
                          <input 
                            type="text"
                            value={m.unit}
                            onChange={(e) => updateMaterial(actualIndex, { unit: e.target.value })}
                            className="w-16 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 outline-none text-center transition-colors"
                            placeholder="Enhet"
                          />
                        </td>
                        <td className="p-2 px-3 text-center">
                          <input 
                            type="text"
                            value={m.konto || ''}
                            onChange={(e) => updateMaterial(actualIndex, { konto: e.target.value })}
                            className="w-16 bg-gray-100 text-[var(--text2)] text-xs px-2 py-0.5 rounded border border-transparent hover:border-gray-300 focus:border-blue-500 outline-none text-center transition-colors"
                            placeholder="Konto"
                          />
                        </td>
                        <td className="p-2 px-3 text-right">
                          <PriceEditable index={actualIndex} mat={m} />
                        </td>
                        <td className="p-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <SpillEditable index={actualIndex} mat={m} />
                            <span>%</span>
                          </div>
                        </td>
                        <td className="p-2 px-3 text-[.58rem] text-gray-500">{m.lev || '—'}</td>
                        <td className="p-2 px-3 text-[.57rem] text-gray-500">{m.note || ''}</td>
                        <td className="p-2 px-3 text-right">
                          <div className="flex justify-end gap-1 transition-opacity">
                            <button 
                              onClick={() => setExpandedHistory(expandedHistory === actualIndex ? null : actualIndex)}
                              className={`w-6 h-6 flex items-center justify-center rounded border border-[var(--border)] transition-colors ${expandedHistory === actualIndex ? 'bg-[var(--blue-lt)] text-[var(--blue)] border-blue-200' : 'text-[var(--text3)] hover:bg-[var(--blue-lt)] hover:text-[var(--blue)] hover:border-blue-200'}`}
                              title="Visa prishistorik"
                            >
                              <i className="fa-solid fa-chart-line text-[0.65rem]"></i>
                            </button>
                            <button 
                              onClick={() => handleEdit(m, actualIndex)}
                              className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border)] hover:bg-[var(--blue-lt)] hover:text-[var(--blue)] hover:border-blue-200 transition-colors text-[var(--text3)]"
                              title="Redigera"
                            >
                              <i className="fa-solid fa-pen text-[0.65rem]"></i>
                            </button>
                            <button 
                              onClick={() => { addMaterial({ ...m, name: `${m.name} (Kopia)` }); if (showNotification) showNotification('Material duplicerat.', 'success'); }}
                              className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border)] hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors text-[var(--text3)]"
                              title="Duplicera"
                            >
                              <i className="fa-regular fa-copy text-[0.65rem]"></i>
                            </button>
                            <button 
                              onClick={() => { deleteMaterial(actualIndex); if (showNotification) showNotification('Material borttaget.', 'success'); }}
                              className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border)] hover:bg-[var(--red-lt)] hover:text-[var(--red)] hover:border-red-200 transition-colors text-[var(--text3)]"
                              title="Ta bort"
                            >
                              <i className="fa-solid fa-trash text-[0.65rem]"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedHistory === actualIndex && (
                        <tr className="bg-[var(--surface2)]">
                          <td colSpan={10} className="p-4 border-b border-[var(--border)]">
                            <div className="flex items-center justify-between font-bold text-xs text-[var(--text2)] uppercase tracking-wider mb-2">
                              <span>Prishistorik för {m.name}</span>
                              <button 
                                onClick={() => setExpandedHistory(null)}
                                className="text-[var(--text2)] hover:text-gray-900"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                            <div className="h-48 w-full bg-white border border-[var(--border)] rounded-lg p-2">
                              {m.priceHistory && m.priceHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={m.priceHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{fontSize: 10}} stroke="#9ca3af" tickMargin={8} minTickGap={15} />
                                    <YAxis tick={{fontSize: 10}} stroke="#9ca3af" width={40} tickFormatter={(v) => `${v}`} />
                                    <Tooltip 
                                      contentStyle={{fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'}}
                                      formatter={(value: number) => [`${value} kr`, 'Pris']}
                                      labelStyle={{color: 'var(--text2)', marginBottom: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '4px'}}
                                    />
                                    <Line type="monotone" dataKey="price" stroke="var(--blue)" strokeWidth={2} dot={{r: 4, fill: 'var(--blue)'}} activeDot={{r: 6}} />
                                  </LineChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="flex items-center justify-center h-full text-sm text-[var(--text3)]">
                                  Ingen prishistorik tillgänglig. Ändra priset ovan för att börja spara historik.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
