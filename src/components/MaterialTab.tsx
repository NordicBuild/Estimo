import React, { useState, Fragment, useRef, useEffect, lazy, Suspense } from 'react';
// import removed
import { Material, DEFAULT_MATERIAL } from '../data';
import { EXAMPLE_CO2_FACTORS } from '../climate/co2';
import { OpenLcaClient, Ref, CalcSetup } from '../climate/openLcaClient';
import { Button, IconButton, Input, Select, Modal, Badge, Toolbar, Table, Thead, Tbody, Tr, Th, Td } from '../ui';

import MaterialPriceChart from './MaterialPriceChart';

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

  // OpenLCA State
  const [showOpenLcaPanel, setShowOpenLcaPanel] = useState(false);
  const [olcaUrl, setOlcaUrl] = useState('http://localhost:8080');
  const [olcaMethods, setOlcaMethods] = useState<Ref[]>([]);
  const [olcaMethod, setOlcaMethod] = useState<Ref | null>(null);
  const [olcaSearch, setOlcaSearch] = useState('');
  const [olcaResults, setOlcaResults] = useState<Ref[]>([]);
  const [olcaSelectedTarget, setOlcaSelectedTarget] = useState<Ref | null>(null);
  const [olcaTargetMaterialIndex, setOlcaTargetMaterialIndex] = useState<number | null>(null);
  const [olcaLoading, setOlcaLoading] = useState(false);
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const XLSX = await import('xlsx');
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
         // warning removed
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
          className="w-14 num border border-[var(--blue)] rounded px-1 py-0.5 text-xs outline-none"
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
        className="w-14 inline-block num bg-transparent border border-transparent rounded px-1 py-0.5 text-xs hover:border-gray-300 outline-none cursor-pointer"
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
          className="w-20 num font-bold text-blue-600 bg-white border border-gray-300 rounded px-1 py-0.5 text-xs focus:border-blue-500 outline-none transition-colors"
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
        className="cursor-pointer text-blue-600 border border-transparent hover:border-gray-300 px-1 py-0.5 rounded transition-colors inline-block min-w-[3rem] font-bold num text-xs"
        title="Klicka för att redigera"
      >
        {mat.price ?? 0}
      </span>
    );
  };

  const CO2Editable = ({ index, mat }: { index: number, mat: Material }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(mat.co2PerUnit?.toString() ?? '0');

    const handleBlur = () => {
      const parsed = Number(val.replace(',', '.'));
      let newCO2Value = mat.co2PerUnit ?? 0;
      if (!isNaN(parsed) && parsed >= 0) {
        newCO2Value = parsed;
      }
      
      if (newCO2Value !== mat.co2PerUnit) {
        updateMaterial(index, { co2PerUnit: newCO2Value });
      } else {
        setVal(newCO2Value.toString());
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
          className="w-16 num text-[var(--text2)] bg-white border border-gray-300 rounded px-1 py-0.5 text-[0.65rem] focus:border-green-500 outline-none transition-colors"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      );
    }

    return (
      <span 
        onClick={() => { setIsEditing(true); setVal(mat.co2PerUnit?.toString() ?? '0'); }}
        className="cursor-pointer text-gray-600 border border-transparent hover:border-gray-300 px-1 py-0.5 rounded transition-colors inline-block min-w-[2.5rem] num text-[0.65rem]"
        title="Klicka för att redigera CO2-faktor"
      >
        {mat.co2PerUnit ?? 0}
      </span>
    );
  };

  const handleFillExampleCO2 = () => {
    const indicesToUpdate: number[] = [];
    materials.forEach((m, i) => {
      // Find a match based on name. It's case insensitive matching.
      for (const [key, value] of Object.entries(EXAMPLE_CO2_FACTORS)) {
        if (m.name.toLowerCase().includes(key.toLowerCase()) && m.co2PerUnit === undefined) {
           indicesToUpdate.push(i);
        }
      }
    });
    
    // Instead of using updateMultipleMaterials one by one which might be slow,
    // let's do it in a loop if updateMultipleMaterials handles partial updates per index
    // Wait, updateMultipleMaterials takes `indices: number[], updates: Partial<Material>`.
    // It sets the same updates to all indices.
    // So we have to do it individually if they have different values, or use updateMaterial.
    // Let's just use updateMaterial in a loop for now, it's fast enough in React.
    let count = 0;
    materials.forEach((m, i) => {
      let matchedKey = null;
      for (const key of Object.keys(EXAMPLE_CO2_FACTORS)) {
        if (m.name.toLowerCase().includes(key.toLowerCase()) && !m.co2PerUnit) {
           matchedKey = key;
           break;
        }
      }
      if (matchedKey) {
         updateMaterial(i, { co2PerUnit: EXAMPLE_CO2_FACTORS[matchedKey] });
         count++;
      }
    });

    if (showNotification) {
      if (count > 0) {
        showNotification(`Fyllde i exempelvärden för ${count} material. Kom ihåg att ersätta dem!`, 'success');
      } else {
        showNotification('Hittade inga material som matchade och saknade CO2-värde.', 'info');
      }
    }
  };

  const loadOlcaMethods = async () => {
    setOlcaLoading(true);
    try {
      const client = new OpenLcaClient(olcaUrl);
      const methods = await client.getDescriptors('ImpactMethod');
      setOlcaMethods(methods);
      if (methods.length > 0) setOlcaMethod(methods[0]);
    } catch (e: any) {
      if (showNotification) showNotification('Kunde inte ladda metoder: ' + e.message, 'error');
    } finally {
      setOlcaLoading(false);
    }
  };

  const searchOlcaTargets = async () => {
    if (!olcaSearch) return;
    setOlcaLoading(true);
    try {
      const client = new OpenLcaClient(olcaUrl);
      const ps = await client.getDescriptors('ProductSystem');
      const processes = await client.getDescriptors('Process');
      const epds = await client.getDescriptors('Epd');
      const all = [...ps, ...processes, ...epds];
      const res = all.filter(d => (d.name || '').toLowerCase().includes(olcaSearch.toLowerCase()));
      setOlcaResults(res);
    } catch (e: any) {
      if (showNotification) showNotification('Sökning misslyckades: ' + e.message, 'error');
    } finally {
      setOlcaLoading(false);
    }
  };

  const applyOlcaImpact = async () => {
    if (olcaTargetMaterialIndex === null || !olcaMethod || !olcaSelectedTarget) return;
    setOlcaLoading(true);
    try {
      const client = new OpenLcaClient(olcaUrl);
      const setup: CalcSetup = {
        target: { '@type': olcaSelectedTarget['@type'], '@id': olcaSelectedTarget['@id'] },
        impactMethod: { '@type': olcaMethod['@type'], '@id': olcaMethod['@id'] },
        amount: 1
      };
      const impacts = await client.impactsFor(setup);
      const gwp = OpenLcaClient.pickGwp(impacts);
      
      const indicators = impacts.map(ir => ({
        name: ir.indicator.name || 'Unknown',
        unit: ir.indicator.referenceUnit || '',
        amount: ir.amount
      }));

      const updateObj: Partial<Material> = {
        co2Source: 'OpenLCA',
        lcaIndicators: indicators
      };
      if (gwp !== null) updateObj.co2PerUnit = gwp;
      
      updateMaterial(olcaTargetMaterialIndex, updateObj);
      if (showNotification) showNotification('Klimatdata (GWP) uppdaterad från openLCA!', 'success');
      setShowOpenLcaPanel(false);
    } catch (e: any) {
      if (showNotification) showNotification('Kunde inte beräkna miljöpåverkan: ' + e.message, 'error');
    } finally {
      setOlcaLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Sök material..." 
            className="w-full sm:w-64"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select 
            className="w-full sm:w-64"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">Alla kategorier</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
        </div>
        <Toolbar className="justify-end w-full">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
            id="excel-import" 
          />
          <Button 
            onClick={downloadTemplate}
            variant="ghost"
            title="Ladda ner Excel-mall"
            icon="download"
          >
            Mall
          </Button>
          <label 
            htmlFor="excel-import"
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)] cursor-pointer flex items-center gap-2 h-8"
            title="Importera från Excel"
          >
            <i className="material-symbols-outlined text-green-600 text-[18px] leading-none">table</i> Importera
          </label>
          <Button 
            onClick={handleFillExampleCO2}
            className="text-green-700 bg-green-50 hover:bg-green-100 border-green-200"
            title="Fyll automatiskt i standard CO2-värden för kända material (ersätt med riktiga EPD-/Boverket-värden innan inlämning!)"
            icon="eco"
          >
            Fyll i exempelvärden
          </Button>
          
          <Button 
            onClick={() => {
              if (!isLocalhost && showNotification) {
                showNotification('openLCA-koppling körs via scripts/sync-openlca-co2.mjs i hostad drift.', 'info');
                return;
              }
              setShowOpenLcaPanel(!showOpenLcaPanel);
              if (!showOpenLcaPanel && olcaMethods.length === 0) loadOlcaMethods();
            }}
            variant="ghost"
            className={showOpenLcaPanel ? 'bg-blue-100 text-blue-800' : ''}
            title="Länka LCA-data via lokalt openLCA (IPC)"
            icon="cable"
          >
            openLCA
          </Button>

          <Button 
            onClick={() => { setShowCatManager(!showCatManager); setShowAddForm(false); }}
            variant="ghost"
            className={showCatManager ? 'bg-gray-100 text-gray-800' : ''}
          >
            Hantera Kategorier
          </Button>
          <Button 
            onClick={() => { setShowAddForm(!showAddForm); setShowCatManager(false); if (showAddForm) setEditIndex(null); }}
            variant="primary"
            className={editIndex !== null && !showAddForm ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            {showAddForm ? 'Avbryt' : (editIndex !== null ? 'Redigera Material' : '+ Nytt Material')}
          </Button>
        </Toolbar>
      </div>

      {showOpenLcaPanel && isLocalhost && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 mb-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-blue-800 flex items-center gap-2">
              <i className="material-symbols-outlined text-[18px]">cable</i> openLCA Integrering (Lokal IPC)
            </h3>
            <IconButton onClick={() => setShowOpenLcaPanel(false)} className="text-gray-400 hover:text-gray-600" icon="close" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">IPC Endpoint URL</label>
              <Input value={olcaUrl} onChange={e => setOlcaUrl(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Metod för bedömning (Impact Method)</label>
              <Select value={olcaMethod ? olcaMethod['@id'] : ''} onChange={e => setOlcaMethod(olcaMethods.find(m => m['@id'] === e.target.value) || null)} className="w-full" disabled={olcaLoading}>
                {olcaMethods.map(m => <option key={m['@id']} value={m['@id']}>{m.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sök Mål (ProductSystem / Process)</label>
              <div className="flex gap-2">
                <Input value={olcaSearch} onChange={e => setOlcaSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') searchOlcaTargets(); }} className="w-full" placeholder="T.ex. Betong C25/30" />
                <Button onClick={searchOlcaTargets} disabled={olcaLoading} variant="ghost" className="bg-white">Sök</Button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Välj mål från sökning</label>
              <Select value={olcaSelectedTarget ? olcaSelectedTarget['@id'] : ''} onChange={e => setOlcaSelectedTarget(olcaResults.find(r => r['@id'] === e.target.value) || null)} className="w-full" disabled={olcaLoading}>
                <option value="">-- Välj mål --</option>
                {olcaResults.map(r => <option key={r['@id']} value={r['@id']}>{r.name} ({r['@type']})</option>)}
              </Select>
            </div>
          </div>

          <div className="mt-2 p-3 bg-white border border-blue-100 rounded text-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-600">Material att uppdatera:</span>
              <Select value={olcaTargetMaterialIndex !== null ? olcaTargetMaterialIndex : ''} onChange={e => setOlcaTargetMaterialIndex(e.target.value === '' ? null : Number(e.target.value))} className="min-w-[200px]">
                <option value="">-- Välj material i listan --</option>
                {materials.map((m, i) => (
                  <option key={i} value={i}>{m.name}</option>
                ))}
              </Select>
            </div>
            
            <Button 
              onClick={applyOlcaImpact} 
              disabled={olcaLoading || olcaTargetMaterialIndex === null || !olcaMethod || !olcaSelectedTarget}
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
              icon={olcaLoading ? "sync" : "calculate"}
            >
              Hämta & Spara Klimatdata
            </Button>
          </div>
        </div>
      )}

      {showCatManager && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-4 mb-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-semibold text-sm">Materialkategorier</h3>
            <div className="relative w-full sm:w-auto">
              <i className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] text-[18px]">search</i>
              <Input 
                className="pl-8 w-full sm:w-64 rounded-full"
                value={catSearch}
                onChange={e => setCatSearch(e.target.value)}
                placeholder="Sök eller filtrera kategorier..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input 
              className="w-64"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Ny kategori..."
            />
            <Button 
              onClick={() => { if(newCatName) { addCategory(newCatName); setNewCatName(''); if(showNotification) showNotification('Kategori tillagd.', 'success'); } }}
              variant="primary"
              className="bg-green-600 hover:bg-green-700"
            >
              Lägg till
            </Button>
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
                    <Input 
                      className="flex-1"
                      value={editingCatName.new}
                      onChange={e => setEditingCatName({...editingCatName, new: e.target.value})}
                    />
                    <IconButton 
                      onClick={() => { if(editingCatName.new) { renameCategory(c, editingCatName.new); setEditingCatName(null); if(showNotification) showNotification('Kategori uppdaterad.', 'success'); } }}
                      className="text-green-600 hover:bg-green-50"
                      icon="check"
                    />
                    <IconButton 
                      onClick={() => setEditingCatName(null)}
                      className="text-red-500 hover:bg-red-50"
                      icon="close"
                    />
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium truncate flex-1 min-w-0 mr-2">{c}</span>
                    <div className="flex gap-1 shrink-0">
                      <IconButton 
                        onClick={() => setEditingCatName({old: c, new: c})}
                        className="w-6 h-6 hover:bg-blue-50 hover:text-blue-600 transition-colors text-[var(--color-on-surface-variant)]"
                        title="Redigera"
                        icon="edit"
                      />
                      <IconButton 
                        onClick={() => { removeCategory(c); if(showNotification) showNotification('Kategori borttagen.', 'success'); }}
                        className="w-6 h-6 hover:bg-red-50 hover:text-red-600 transition-colors text-[var(--color-on-surface-variant)]"
                        title="Ta bort"
                        icon="delete"
                      />
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
            <Input 
              className="w-full sm:w-64"
              value={newMatForm.name}
              onChange={e => setNewMatForm({...newMatForm, name: e.target.value})}
              placeholder="Materialnamn"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Kategori</label>
            <Select 
              className="w-full sm:w-48"
              value={newMatForm.cat}
              onChange={e => setNewMatForm({...newMatForm, cat: e.target.value})}
            >
              <option value="">Välj...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="ny">+ Ny kategori</option>
            </Select>
          </div>
          {newMatForm.cat === 'ny' && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Ny kategori</label>
              <Input 
                className="w-full sm:w-48"
                value={newMatForm.catNy}
                onChange={e => setNewMatForm({...newMatForm, catNy: e.target.value})}
                placeholder="Kategorinamn"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Enhet</label>
            <Input 
              className="w-32"
              value={newMatForm.unit}
              onChange={e => setNewMatForm({...newMatForm, unit: e.target.value})}
              placeholder="t.ex st, pall"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Konto</label>
            <Input 
              className="w-32"
              value={newMatForm.konto}
              onChange={e => setNewMatForm({...newMatForm, konto: e.target.value})}
              placeholder="t.ex 4011"
            />
          </div>
          <Button 
            onClick={handleAddMaterial}
            disabled={!newMatForm.name || (!newMatForm.cat && newMatForm.cat !== 'ny') || (newMatForm.cat === 'ny' && !newMatForm.catNy)}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
          >
            Spara
          </Button>
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
                <Select className="w-auto h-7 py-0 px-2" value={bulkForm.cat} onChange={e => setBulkForm({...bulkForm, cat: e.target.value})}>
                  <option value="">Välj...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              )}

              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={bulkForm.updateKonto} onChange={(e) => setBulkForm({...bulkForm, updateKonto: e.target.checked})} />
                Byt Konto
              </label>
              {bulkForm.updateKonto && <Input className="w-20 h-7 py-0 px-2" value={bulkForm.konto} onChange={e => setBulkForm({...bulkForm, konto: e.target.value})} />}

              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={bulkForm.updatePrice} onChange={(e) => setBulkForm({...bulkForm, updatePrice: e.target.checked})} />
                Byt Pris
              </label>
              {bulkForm.updatePrice && <Input type="number" step="any" min="0" className="w-20 h-7 py-0 px-2" value={bulkForm.price} onChange={e => setBulkForm({...bulkForm, price: e.target.value})} />}

              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={bulkForm.updateSpill} onChange={(e) => setBulkForm({...bulkForm, updateSpill: e.target.checked})} />
                Byt Spill %
              </label>
              {bulkForm.updateSpill && <Input type="number" step="any" min="0" className="w-16 h-7 py-0 px-2" value={bulkForm.spill} onChange={e => setBulkForm({...bulkForm, spill: e.target.value})} />}

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
            <Button 
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
              variant="primary"
            >
              Tillämpa på {selectedIds.length} rader
            </Button>
            <Button 
              onClick={() => setSelectedIds([])}
              variant="ghost"
              className="text-xs uppercase ml-2 border-transparent"
            >
              Avbryt
            </Button>
            {deleteMultipleMaterials && (
              <Button 
                onClick={() => {
                  deleteMultipleMaterials(selectedIds);
                  setSelectedIds([]);
                  if (showNotification) showNotification('Flera material har raderats.', 'success');
                }}
                variant="danger"
                className="ml-auto"
                icon="delete"
              >
                Ta bort {selectedIds.length} valda
              </Button>
            )}
          </div>
        )}

        <Table className="w-full text-sm text-left border-collapse min-w-[800px] whitespace-nowrap">
          <Thead>
            <tr className="bg-[var(--surface3)] border-b-2 border-[var(--border2)]">
              <Th className="p-2 w-8 text-center cursor-pointer">
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
              </Th>
              <Th>Kategori</Th>
              <Th className="w-[35%] max-w-[250px]">Material</Th>
              <Th className="text-center">Enhet</Th>
              <Th className="text-center">Konto</Th>
              <Th numeric>Pris (kr)</Th>
              <Th numeric title="kg CO2e per enhet">CO2/enh.</Th>
              <Th title="LCA Indikatorer">LCA</Th>
              <Th numeric>Spill %</Th>
              <Th>Leverantör</Th>
              <Th>Notering</Th>
              <Th className="w-32"></Th>
            </tr>
          </Thead>
          <Tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-[var(--text3)]">
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
                        <td className="p-2 px-3 num">
                          <PriceEditable index={actualIndex} mat={m} />
                        </td>
                        <td className="p-2 px-3 num">
                          <CO2Editable index={actualIndex} mat={m} />
                        </td>
                        <td className="p-2 px-3 text-left">
                          {m.lcaIndicators && m.lcaIndicators.length > 0 ? (
                            <details className="relative group">
                              <summary className="cursor-pointer text-[0.65rem] font-medium text-blue-600 hover:underline list-none marker:hidden">
                                {m.lcaIndicators.length} ind.
                              </summary>
                              <div className="absolute z-10 bg-white border border-gray-200 shadow-lg rounded p-2 mt-1 w-48 max-h-48 overflow-y-auto left-0 hidden group-hover:block group-open:block">
                                <div className="text-[0.6rem] font-bold text-gray-400 mb-1 uppercase tracking-wide border-b border-gray-100 pb-1">Indikatorer</div>
                                {m.lcaIndicators.map((ind, i) => (
                                  <div key={i} className="flex justify-between text-[0.65rem] border-b border-gray-50 last:border-0 py-1">
                                    <span className="font-semibold text-gray-700 truncate pr-2" title={ind.name}>{ind.name}</span>
                                    <span className="text-gray-500 font-mono whitespace-nowrap">{ind.amount} {ind.unit}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : (
                            <span className="text-[0.65rem] text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-2 px-3 num">
                          <div className="flex items-center justify-end gap-0.5">
                            <SpillEditable index={actualIndex} mat={m} />
                            <span>%</span>
                          </div>
                        </td>
                        <td className="p-2 px-3 text-[.58rem] text-gray-500 num-mono text-left">{m.lev || '—'}</td>
                        <td className="p-2 px-3 text-[.57rem] text-gray-500">{m.note || ''}</td>
                        <td className="p-2 px-3 text-right">
                          <div className="flex justify-end gap-1 transition-opacity">
                            <IconButton 
                              onClick={() => setExpandedHistory(expandedHistory === actualIndex ? null : actualIndex)}
                              className={`w-6 h-6 border transition-colors ${expandedHistory === actualIndex ? 'bg-blue-100 text-blue-600 border-blue-200' : 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}
                              title="Visa prishistorik"
                              icon="timeline"
                            />
                            <IconButton 
                              onClick={() => handleEdit(m, actualIndex)}
                              className="w-6 h-6 border border-[var(--color-outline-variant)] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors text-[var(--color-on-surface-variant)]"
                              title="Redigera"
                              icon="edit"
                            />
                            <IconButton 
                              onClick={() => { addMaterial({ ...m, name: `${m.name} (Kopia)` }); if (showNotification) showNotification('Material duplicerat.', 'success'); }}
                              className="w-6 h-6 border border-[var(--color-outline-variant)] hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors text-[var(--color-on-surface-variant)]"
                              title="Duplicera"
                              icon="content_copy"
                            />
                            <IconButton 
                              onClick={() => { deleteMaterial(actualIndex); if (showNotification) showNotification('Material borttaget.', 'success'); }}
                              className="w-6 h-6 border border-[var(--color-outline-variant)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-[var(--color-on-surface-variant)]"
                              title="Ta bort"
                              icon="delete"
                            />
                          </div>
                        </td>
                      </tr>
                      {expandedHistory === actualIndex && (
                        <tr className="bg-[var(--surface2)]">
                          <td colSpan={11} className="p-4 border-b border-[var(--border)]">
                            <div className="flex items-center justify-between font-bold text-xs text-[var(--text2)] uppercase tracking-wider mb-2">
                              <span>Prishistorik för {m.name}</span>
                              <IconButton 
                                onClick={() => setExpandedHistory(null)}
                                className="text-[var(--text2)] hover:text-gray-900"
                                icon="close"
                              />
                            </div>
                            <div className="h-48 w-full bg-white border border-[var(--border)] rounded-lg p-2">
                              <Suspense fallback={<div className="h-64" />}>
                                <MaterialPriceChart data={m.priceHistory || []} />
                              </Suspense>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </Tbody>
          </Table>
      </div>
    </div>
  );
}
