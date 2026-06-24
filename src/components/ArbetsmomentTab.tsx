import React, { useState, useRef } from "react";
import * as XLSX from 'xlsx';
import { ArbetsMoment } from "../data";

interface Props {
  arbetsData: ArbetsMoment[];
  customCategories?: string[];
  updateArbete: (index: number, updates: Partial<ArbetsMoment>) => void;
  updateMultipleArbeten?: (indices: number[], updates: Partial<ArbetsMoment>) => void;
  addArbete: (arb: ArbetsMoment) => void;
  addArbeten: (arbs: ArbetsMoment[]) => void;
  deleteArbete: (index: number) => void;
  deleteMultipleArbeten?: (indices: number[]) => void;
  addCategory?: (cat: string) => void;
  renameCategory?: (oldCat: string, newCat: string) => void;
  removeCategory?: (cat: string) => void;
  showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function ArbetsmomentTab({ arbetsData, customCategories = [], updateArbete, updateMultipleArbeten, addArbete, addArbeten, deleteArbete, deleteMultipleArbeten, addCategory, renameCategory, removeCategory, showNotification }: Props) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkForm, setBulkForm] = useState({
    updateCat: false, cat: '',
    updateSv: false, sv: 1.0,
    updateTid: false, tid: 1.0
  });

  const [formState, setFormState] = useState({
    cat: 'Betongarbete',
    catNy: '',
    name: '',
    tid: 1.0,
    unit: 'm³',
    sv: 1.0,
    note: ''
  });

  const uniqueCats = Array.from(new Set([...arbetsData.map(a => a.cat), ...customCategories]));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        Kategori: 'Betongarbete',
        Momentnamn: 'Exempelmoment',
        TidEnhet: 1.5,
        Enhet: 'm³',
        Svarighetsgrad: 1.0,
        Notering: 'Exempelnotering'
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mall');
    XLSX.writeFile(wb, 'Arbetsmoment_Mall.xlsx');
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
        
        const newArbeten = jsonData.map((row, index) => {
          const getVal = (keyStr: string) => {
            const key = Object.keys(row).find(k => k.trim().toLowerCase() === keyStr.toLowerCase());
            return key ? row[key] : undefined;
          };

          const parseNum = (val: any, def: number) => {
             if (typeof val === 'number') return val;
             if (typeof val === 'string') {
                const parsed = parseFloat(val.replace(/\s/g, '').replace(',', '.'));
                return isNaN(parsed) ? def : parsed;
             }
             return def;
          };

          const cat = getVal('Kategori') || 'Övrigt';
          if (addCategory) addCategory(cat);
          
          return {
            id: Date.now() + index,
            cat: cat,
            name: getVal('Momentnamn') || 'Okänt moment',
            tid: parseNum(getVal('TidEnhet'), 0),
            unit: getVal('Enhet') || 'st',
            sv: parseNum(getVal('Svarighetsgrad'), 1.0),
            note: getVal('Notering') || ''
          };
        });

        if (newArbeten.length > 0) {
           addArbeten(newArbeten as ArbetsMoment[]);
           if (showNotification) showNotification(`${newArbeten.length} arbetsmoment importerades framgångsrikt.`, 'success');
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

  const handleSave = () => {
    if (!formState.name.trim()) {
      if (showNotification) showNotification('Ange momentets namn', 'error');
      return;
    }
    const cat = formState.catNy.trim() || formState.cat;
    
    if (cat === formState.catNy && addCategory) {
      addCategory(cat);
    }

    if (editIndex !== null) {
      updateArbete(editIndex, {
        cat,
        name: formState.name,
        tid: formState.tid,
        unit: formState.unit,
        sv: formState.sv,
        note: formState.note
      });
      if (showNotification) showNotification('Arbetsmoment uppdaterat.', 'success');
    } else {
      addArbete({
        id: Date.now(),
        cat,
        name: formState.name,
        tid: formState.tid,
        unit: formState.unit,
        sv: formState.sv,
        note: formState.note
      });
      if (showNotification) showNotification('Arbetsmoment tillagt.', 'success');
    }
    handleCancel();
    setShowAddForm(false);
  };

  const handleEdit = (a: ArbetsMoment, index: number) => {
    setEditIndex(index);
    setFormState({
      cat: a.cat,
      catNy: '',
      name: a.name,
      tid: a.tid,
      unit: a.unit,
      sv: a.sv,
      note: a.note || ''
    });
    setShowAddForm(true);
    setShowCatManager(false);
  };

  const handleCancel = () => {
    setEditIndex(null);
    setFormState({
      cat: 'Betongarbete',
      catNy: '',
      name: '',
      tid: 1.0,
      unit: 'm³',
      sv: 1.0,
      note: ''
    });
  };

  const filteredData = arbetsData.filter(a => {
    const matchS = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.cat.toLowerCase().includes(search.toLowerCase());
    const matchC = !filterCat || a.cat === filterCat;
    return matchS && matchC;
  });

  const CAT_COL: Record<string, string> = {
    'Betongarbete': 'var(--blue-lt)',
    'Armeringsarbete': 'var(--purple-lt)',
    'Formarbete': 'var(--amber-lt)',
    'Isoleringsarbete': 'var(--green-lt)',
    'Komplettering': 'var(--teal-lt)'
  };

  const SV_LABELS: Record<string, string> = { '1': 'Normal', '1.1': 'Medel-svår', '1.2': 'Svår', '1.35': 'Mycket svår', '0.9': 'Enkel' };
  const SV_COLORS: Record<string, string> = { '1': 'var(--green)', '1.1': 'var(--teal)', '1.2': 'var(--amber)', '1.35': 'var(--red)', '0.9': 'var(--blue)' };

  const TidInput = ({ initialValue, onChange }: { initialValue: number, onChange: (val: number) => void }) => {
    const [val, setVal] = useState(initialValue.toString());

    React.useEffect(() => {
      if (parseFloat(val) !== initialValue && val !== initialValue.toString() + '.') {
        setVal(initialValue.toString());
      }
    }, [initialValue]);

    return (
      <input 
        type="number" 
        step="0.001" 
        min="0"
        className="w-16 text-right font-mono font-bold text-blue-600 bg-transparent border border-transparent rounded px-1 py-0.5 text-xs hover:border-gray-300 focus:border-blue-500 outline-none transition-colors"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => {
          const parsed = parseFloat(val);
          if (!isNaN(parsed) && parsed >= 0) {
            onChange(parsed);
          } else {
            setVal(initialValue.toString());
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
      />
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Sök moment..." 
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
            {uniqueCats.map(cat => (
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
            id="excel-import-arbete" 
          />
          <button 
            onClick={downloadTemplate}
            className="px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap border border-[var(--border)] text-[var(--text2)] hover:bg-gray-50 flex items-center gap-2"
            title="Ladda ner Excel-mall"
          >
            <i className="fa-solid fa-download"></i> Mall
          </button>
          <label 
            htmlFor="excel-import-arbete"
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
            {showAddForm ? 'Avbryt' : (editIndex !== null ? 'Redigera Arbetsmoment' : '+ Nytt Arbetsmoment')}
          </button>
        </div>
      </div>

      {showCatManager && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-4 mb-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          <h3 className="font-semibold text-sm">Momentkategorier</h3>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              className="border border-[var(--border)] rounded px-3 py-1.5 w-64 outline-none focus:border-[var(--blue)] text-sm"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Ny kategori..."
            />
            <button 
              onClick={() => { if(newCatName && addCategory) { addCategory(newCatName); setNewCatName(''); if(showNotification) showNotification('Kategori tillagd.', 'success'); } }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Lägg till
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {uniqueCats.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2 text-sm">
                <span className="font-medium text-gray-700">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD / EDIT FORM (now top full width) */}
      {showAddForm && (
        <div className="card mb-4 border-t-4 border-t-amber-500 animate-in fade-in slide-in-from-top-2">
            <div className="card-header">
              <div className="card-icon purple"><i className="fa-solid fa-plus"></i></div>
              <span className="card-title">{editIndex !== null ? 'Redigera arbetsmoment' : 'Lägg till arbetsmoment'}</span>
            </div>
            <div className="p-4">
              <div className="grid gap-2.5">
                <div>
                  <label className="text-[0.73rem] font-semibold text-[var(--text2)] block mb-1">Kategori</label>
                  <div className="flex gap-1.5">
                    <select 
                      className="flex-1 border border-[var(--border)] rounded px-2 py-1 text-sm bg-white"
                      value={formState.cat}
                      onChange={e => setFormState({...formState, cat: e.target.value})}
                    >
                      <option>Betongarbete</option>
                      <option>Armeringsarbete</option>
                      <option>Formarbete</option>
                      <option>Isoleringsarbete</option>
                      <option>Komplettering</option>
                      <option>Övrigt</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Ny kategori…" 
                      className="flex-1 border border-[var(--border)] rounded px-2 py-1 text-sm"
                      value={formState.catNy}
                      onChange={e => setFormState({...formState, catNy: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[0.73rem] font-semibold text-[var(--text2)] block mb-1">Momentets namn *</label>
                  <input 
                    type="text" 
                    placeholder="t.ex. Gjutning betong" 
                    className="w-full border border-[var(--border)] rounded px-2 py-1 text-sm"
                    value={formState.name}
                    onChange={e => setFormState({...formState, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[0.73rem] font-semibold text-[var(--text2)] block mb-1">Tidsenhet (h/enh)</label>
                    <input 
                      type="number" 
                      step="0.001" 
                      className="w-full border border-[var(--border)] rounded px-2 py-1 text-sm text-right"
                      value={formState.tid}
                      onChange={e => setFormState({...formState, tid: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="text-[0.73rem] font-semibold text-[var(--text2)] block mb-1">Enhet</label>
                    <select 
                      className="w-full border border-[var(--border)] rounded px-2 py-1 text-sm bg-white"
                      value={formState.unit}
                      onChange={e => setFormState({...formState, unit: e.target.value})}
                    >
                      <option>m³</option><option>m²</option><option>m</option><option>kg</option><option>st</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[0.73rem] font-semibold text-[var(--text2)] block mb-1">Svårighetsgrad</label>
                  <select 
                    className="w-full border border-[var(--border)] rounded px-2 py-1 text-sm bg-white"
                    value={formState.sv}
                    onChange={e => setFormState({...formState, sv: parseFloat(e.target.value) || 1.0})}
                  >
                    <option value="1">Normal</option>
                    <option value="1.1">Medel-svår (+10%)</option>
                    <option value="1.2">Svår (+20%)</option>
                    <option value="1.35">Mycket svår (+35%)</option>
                    <option value="0.9">Enkel (-10%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[0.73rem] font-semibold text-[var(--text2)] block mb-1">Notering</label>
                  <input 
                    type="text" 
                    placeholder="Kommentar, förutsättning…" 
                    className="w-full border border-[var(--border)] rounded px-2 py-1 text-sm"
                    value={formState.note}
                    onChange={e => setFormState({...formState, note: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn btn-primary flex-1" onClick={handleSave}>
                  <i className="fa-solid fa-check"></i> <span>{editIndex !== null ? 'Spara ändringar' : 'Lägg till'}</span>
                </button>
                {editIndex !== null && (
                  <button className="btn btn-ghost" onClick={handleCancel}>
                    <i className="fa-solid fa-xmark"></i> Avbryt
                  </button>
                )}
              </div>
            </div>
          </div>
      )}

      {/* ARBETSMOMENT TABLE */}
      <div className="card overflow-x-auto shadow-sm">
        <div className="card-header justify-between bg-[var(--surface2)] border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="card-icon purple"><i className="fa-solid fa-table-list"></i></div>
            <span className="card-title">Arbetsmoment & Tidsnormer</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <span className="text-sm font-semibold text-blue-800">{selectedIds.length} valda</span>
            )}
            <span className="text-[0.72rem] text-[var(--text3)]">Visar {filteredData.length} av {arbetsData.length} totalt</span>
          </div>
        </div>
        
        {selectedIds.length > 0 && updateMultipleArbeten && (
          <div className="bg-blue-50 border-b border-blue-100 p-3 flex flex-wrap gap-4 items-end animate-in slide-in-from-top-2">
            <div>
              <label className="text-xs font-semibold text-blue-800 block mb-1">
                <input type="checkbox" checked={bulkForm.updateCat} onChange={e => setBulkForm({...bulkForm, updateCat: e.target.checked})} className="mr-1"/>
                Ny Kategori
              </label>
              <select 
                disabled={!bulkForm.updateCat}
                className="border border-blue-200 rounded px-2 py-1 text-sm bg-white disabled:opacity-50"
                value={bulkForm.cat}
                onChange={e => setBulkForm({...bulkForm, cat: e.target.value})}
              >
                <option value="">-- Välj --</option>
                {uniqueCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-blue-800 block mb-1">
                <input type="checkbox" checked={bulkForm.updateSv} onChange={e => setBulkForm({...bulkForm, updateSv: e.target.checked})} className="mr-1"/>
                Ny Svårighet
              </label>
              <select 
                disabled={!bulkForm.updateSv}
                className="border border-blue-200 rounded px-2 py-1 text-sm bg-white disabled:opacity-50"
                value={bulkForm.sv}
                onChange={e => setBulkForm({...bulkForm, sv: parseFloat(e.target.value) || 1.0})}
              >
                <option value="1">Normal</option>
                <option value="1.1">Medel-svår (+10%)</option>
                <option value="1.2">Svår (+20%)</option>
                <option value="1.35">Mycket svår (+35%)</option>
                <option value="0.9">Enkel (-10%)</option>
              </select>
            </div>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors h-8"
              onClick={() => {
                const updates: Partial<ArbetsMoment> = {};
                if (bulkForm.updateCat && bulkForm.cat) updates.cat = bulkForm.cat;
                if (bulkForm.updateSv) updates.sv = bulkForm.sv;
                
                if (Object.keys(updates).length > 0) {
                  updateMultipleArbeten(selectedIds, updates);
                  setSelectedIds([]);
                  setBulkForm({updateCat: false, cat: '', updateSv: false, sv: 1.0, updateTid: false, tid: 1.0});
                  if (showNotification) showNotification(`Tillägningar sparades för ${selectedIds.length} arbetsmoment.`, 'success');
                }
              }}
            >
              Tillämpa på {selectedIds.length} valda
            </button>
            <button 
              className="text-blue-600 hover:underline text-sm px-2 h-8"
              onClick={() => setSelectedIds([])}
            >
              Avbryt
            </button>
            {deleteMultipleArbeten && (
              <button 
                onClick={() => {
                  deleteMultipleArbeten(selectedIds);
                  setSelectedIds([]);
                  if (showNotification) showNotification('Flera arbetsmoment har raderats', 'success');
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors ml-auto h-8 flex items-center gap-2"
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
                  <th className="p-2 w-8 text-center">
                    <input 
                      type="checkbox" 
                      className="cursor-pointer"
                      checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(filteredData.map(a => arbetsData.findIndex(ar => ar.id === a.id)));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      ref={input => {
                        if (input) {
                          input.indeterminate = selectedIds.length > 0 && selectedIds.length < filteredData.length;
                        }
                      }}
                    />
                  </th>
                  <th className="p-2 text-left text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Kategori</th>
                  <th className="p-2 w-[35%] max-w-[250px] text-left text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Moment</th>
                  <th className="p-2 text-right text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">tim/enh</th>
                  <th className="p-2 text-center text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Enhet</th>
                  <th className="p-2 text-center text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Svårighet</th>
                  <th className="p-2 text-right text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Effektiv tim/enh</th>
                  <th className="p-2 text-left text-[0.66rem] font-bold uppercase tracking-wider text-[var(--text3)]">Notering</th>
                  <th className="p-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-[var(--text3)]"><i className="fa-solid fa-hard-hat text-2xl opacity-20 mb-3 block"></i><p>Inga moment matchar filtret</p></td></tr>
                ) : (
                  filteredData.map(a => {
                    const actualIndex = arbetsData.findIndex(ar => ar.id === a.id);
                    const svKey = String(a.sv);
                    const effTid = (a.tid * a.sv).toFixed(3);
                    const svColor = SV_COLORS[svKey] || 'var(--text2)';
                    const bg = CAT_COL[a.cat] || 'var(--surface2)';
                    const isSelected = selectedIds.includes(actualIndex);

                    return (
                      <tr key={a.id} className={`border-b border-[var(--border)] hover:bg-gray-50 group ${isSelected ? 'bg-blue-50/50' : ''}`}>
                        <td className="p-2 text-center">
                          <input 
                            type="checkbox" 
                            className="cursor-pointer"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) setSelectedIds([...selectedIds, actualIndex]);
                              else setSelectedIds(selectedIds.filter(id => id !== actualIndex));
                            }}
                          />
                        </td>
                        <td className="p-2"><span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-md text-[var(--text2)]" style={{background: bg}}>{a.cat}</span></td>
                        <td className="p-2 font-semibold text-sm w-[35%] max-w-[250px] whitespace-normal break-words leading-tight">{a.name}</td>
                        <td className="p-2 text-right">
                          <TidInput 
                            initialValue={a.tid ?? 0}
                            onChange={(newTid) => updateArbete(actualIndex, { tid: newTid })}
                          />
                        </td>
                        <td className="p-2 text-center"><span className="text-[0.6rem] font-extrabold uppercase tracking-wide bg-[var(--blue-lt)] text-[var(--blue)] px-2 py-0.5 rounded-md">{a.unit}</span></td>
                        <td className="p-2 text-center" style={{color: svColor}}><span className="text-[0.68rem] font-bold">{SV_LABELS[svKey] || svKey}</span></td>
                        <td className="p-2 text-right font-mono font-bold text-[var(--purple)]">{effTid}</td>
                        <td className="p-2 text-[0.75rem] text-[var(--text3)]">{a.note}</td>
                        <td className="p-2">
                          <div className="flex gap-1 justify-end transition-opacity">
                            <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border)] hover:bg-[var(--blue-lt)] hover:text-[var(--blue)] hover:border-blue-200 transition-colors text-[var(--text3)]" onClick={() => handleEdit(a, actualIndex)} title="Redigera">
                              <i className="fa-solid fa-pen text-[0.65rem]"></i>
                            </button>
                            <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border)] hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors text-[var(--text3)]" onClick={() => { addArbete({ ...a, id: Date.now(), name: `${a.name} (Kopia)` }); if (showNotification) showNotification('Arbetsmoment duplicerat.', 'success'); }} title="Duplicera">
                              <i className="fa-regular fa-copy text-[0.65rem]"></i>
                            </button>
                            <button className="w-6 h-6 flex items-center justify-center rounded border border-[var(--border)] hover:bg-[var(--red-lt)] hover:text-[var(--red)] hover:border-red-200 transition-colors text-[var(--text3)]" onClick={() => { deleteArbete(actualIndex); if (showNotification) showNotification('Arbetsmoment borttaget.', 'success'); }} title="Ta bort">
                              <i className="fa-solid fa-trash text-[0.65rem]"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
