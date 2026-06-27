import { Fragment, useState, useEffect, useMemo } from 'react';
import { Byggdel, Material, INITIAL_TIDSFAKTORER, ProjectInfo, CompanyInfo } from '../data';
import { CalculationResult } from '../useCalculation';
import { computeByggdelCo2 } from '../climate/co2';
import { Button, IconButton, NumberInput, Input, Select, Modal, Badge, Toolbar } from '../ui';
import { UnifiedGrid } from '../kalkyl/UnifiedGrid';
import { summeraRisk, RiskRad } from '../kalkyl/kalkylRisk';
import { exportExcel, exportPdf } from '../exportUtils';
import { listRecept, DbRecept } from '../recept/api';
import { expandRecept, receptStyckkostnad, receptCo2PerEnhet } from '../recept/recept';
import { calculateDefaultMoments } from '../calculationHelpers';

interface Props {
  byggdelar: Byggdel[];
  calcResult: CalculationResult;
  materials: Material[];
  projectInfo?: ProjectInfo;
  companyInfo?: CompanyInfo;
  companyId?: string;
  addParts?: (parts: Omit<Byggdel, 'id'>[]) => void;
  settings?: any;
  updateSettings?: (key: string, val: number) => void;
  byggdelTemplates?: any[];
  addTemplate?: (name: string, byggdel: Byggdel) => void;
  deleteTemplate?: (id: number) => void;
  addPartFromTemplate?: (templateData: any) => void;
  toggleByggdel: (id: number) => void;
  toggleAllByggdelar: (collapse: boolean) => void;
  reorderByggdelar: (dragIndex: number, dropIndex: number) => void;
  removePart: (id: number) => void;
  clonePart: (id: number) => void;
  togglePartActive: (id: number) => void;
  toggleTypeActive: (type: string, active: boolean) => void;
  cloneType: (type: string) => void;
  openModal: (id?: number) => void;
  updateMoment: (byggdelId: number, momentIndex: number, updates: any) => void;
  duplicateMoment: (byggdelId: number, momentIndex: number) => void;
  updateMaterialPrice: (materialName: string, price: number) => void;
  addMoment: (byggdelId: number) => void;
  removeMoment: (byggdelId: number, momentIndex: number) => void;
  updatePartQty: (id: number, qty: number) => void;
  updatePartAntal: (id: number, antal: number) => void;
  removeMultipleParts?: (ids: number[]) => void;
  updateMultipleParts?: (ids: number[], updates: Partial<Byggdel>) => void;
}

const LocalNumberInput = ({ initialValue, onChange }: { initialValue: number, onChange: (val: number) => void }) => {
  const [val, setVal] = useState(initialValue.toLocaleString('sv-SE', { maximumFractionDigits: 3 }));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setVal(initialValue.toLocaleString('sv-SE', { maximumFractionDigits: 3 }));
    }
  }, [initialValue, isFocused]);

  return (
    <input 
      type="text" 
      className="w-16 bg-transparent num border border-transparent hover:border-gray-300 focus:border-[var(--blue)] focus:bg-white rounded px-1 outline-none transition-colors"
      value={val}
      onFocus={() => {
        setIsFocused(true);
        setVal(initialValue.toString().replace('.', ','));
      }}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        setIsFocused(false);
        let clean = val.replace(/\s/g, '').replace(',', '.');
        const parsed = parseFloat(clean);
        if (!isNaN(parsed) && parsed >= 0) {
          onChange(parsed);
          setVal(parsed.toLocaleString('sv-SE', { maximumFractionDigits: 3 }));
        } else {
          setVal(initialValue.toLocaleString('sv-SE', { maximumFractionDigits: 3 }));
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

import { useProjectData } from '../state/ProjectDataContext';
import { useKalkylHistory } from '../state/KalkylHistoryContext';

export function KalkylTab(props: Props) {
  const projectData = useProjectData();
  const kalkylHistory = useKalkylHistory();
  
  // Use context values instead of props, falling back to props if context is missing (though it shouldn't be).
  const byggdelar = projectData.byggdelar || props.byggdelar;
  const materials = projectData.materials || props.materials;
  const projectInfo = projectData.projectInfo || props.projectInfo;
  const companyInfo = projectData.companyInfo || props.companyInfo;
  const companyId = projectData.dataSpaceId || props.companyId;
  const settings = projectData.settings || props.settings;
  const updateSettings = props.updateSettings; // Always use props for now because ProjectData provides setSettings (different signature)
  const byggdelTemplates = projectData.byggdelTemplates || props.byggdelTemplates;
  const addTemplate = projectData.addTemplate || props.addTemplate;
  const deleteTemplate = projectData.deleteTemplate || props.deleteTemplate;

  const calcResult = kalkylHistory.calcResult || props.calcResult;
  const addParts = kalkylHistory.addParts || props.addParts;
  const addPartFromTemplate = kalkylHistory.addPartFromTemplate || props.addPartFromTemplate;
  const toggleByggdel = kalkylHistory.toggleByggdel || props.toggleByggdel;
  const toggleAllByggdelar = kalkylHistory.toggleAllByggdelar || props.toggleAllByggdelar;
  const reorderByggdelar = kalkylHistory.reorderByggdelar || props.reorderByggdelar;
  const removePart = kalkylHistory.removePart || props.removePart;
  const removeMultipleParts = kalkylHistory.removeMultipleParts || props.removeMultipleParts;
  const updateMultipleParts = kalkylHistory.updateMultipleParts || props.updateMultipleParts;
  const clonePart = kalkylHistory.clonePart || props.clonePart;
  const togglePartActive = kalkylHistory.togglePartActive || props.togglePartActive;
  const toggleTypeActive = kalkylHistory.toggleTypeActive || props.toggleTypeActive;
  const cloneType = kalkylHistory.cloneType || props.cloneType;
  const openModal = kalkylHistory.openModal || props.openModal;
  const updateMoment = kalkylHistory.updateMoment || props.updateMoment;
  const duplicateMoment = kalkylHistory.duplicateMoment || props.duplicateMoment;
  const updateMaterialPrice = kalkylHistory.updateMaterialPrice || props.updateMaterialPrice;
  const addMoment = kalkylHistory.addMoment || props.addMoment;
  const removeMoment = kalkylHistory.removeMoment || props.removeMoment;
  const updatePartQty = kalkylHistory.updatePartQty || props.updatePartQty;
  const updatePartAntal = kalkylHistory.updatePartAntal || props.updatePartAntal;

  const { parts, anbud, tg1, totVol, totTim, projNetto } = calcResult;
  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  const riskResult = useMemo(() => {
    const rader: RiskRad[] = parts.map(p => ({
      key: p.id.toString(),
      bas: p.costNetto,
      sakerhet: p.riskLevel || 'medel'
    }));
    return summeraRisk(rader);
  }, [parts]);

  const [filterType, setFilterType] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGroupPrompt, setShowGroupPrompt] = useState(false);
  const [newGroupStr, setNewGroupStr] = useState('');
  const [showInactiveMoments, setShowInactiveMoments] = useState(false);

  const [receptList, setReceptList] = useState<DbRecept[]>([]);
  const [showReceptModal, setShowReceptModal] = useState(false);
  const [selectedRecept, setSelectedRecept] = useState<DbRecept | null>(null);
  const [receptMangd, setReceptMangd] = useState<number>(1);

  useEffect(() => {
    if (companyId) {
      listRecept(companyId).then(setReceptList).catch(console.error);
    }
  }, [companyId]);

  const handleInfogaRecept = () => {
    if (!selectedRecept || !addParts) return;
    try {
      const receptData = { ...selectedRecept.data, mangd: receptMangd };
      const draft = expandRecept(receptData);
      
      const newPart: Omit<Byggdel, 'id'> = {
        type: draft.type as any,
        name: selectedRecept.namn,
        antal: 1,
        qty: draft.qty,
        comment: '',
        active: true,
        moments: []
      };

      const moments = calculateDefaultMoments(newPart.type, {});
      for (const m of moments) {
        if (draft.materialOverrides[m.label]) {
           (m as any).unitPrice = draft.materialOverrides[m.label].unitPrice;
           (m as any).co2PerUnit = draft.materialOverrides[m.label].co2PerEnhet;
        }
      }
      newPart.moments = moments;
      addParts([{...newPart, id: Date.now()} as Byggdel]);
      setShowReceptModal(false);
      setSelectedRecept(null);
      setReceptMangd(1);
    } catch (e: any) {
      alert("Fel vid infogning: " + e.message);
    }
  };

  const handleExportExcel = () => {
    if (projectInfo && companyInfo) {
      exportExcel(byggdelar, calcResult, projectInfo, companyInfo, materials);
    }
  };

  const handleExportPdf = () => {
    const el = document.getElementById('pdf-anbud-content');
    if (el && projectInfo) {
      exportPdf('pdf-anbud-content', `Anbud_${projectInfo.name || 'Projekt'}.pdf`);
    } else {
      alert("Öppna fliken 'Anbud' först en gång för att generera PDF (för att den ska laddas in).");
    }
  };
  
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({ vMatP: '', vArbP: '', timeFactor: '' });
  
  const materialsMap = useMemo(() => {
    const map = new Map<string, Material>();
    for (const m of materials) {
      map.set(m.name, m);
    }
    return map;
  }, [materials]);

  const uniqueTypes = Array.from(new Set(parts.map(p => p.type)));
  const filteredParts = filterType ? parts.filter(p => p.type === filterType) : parts;

  const handleSelectAllGroup = (groupParts: typeof parts, isSelected: boolean) => {
    if (isSelected) {
      const idsToAdd = groupParts.map(p => p.id).filter(id => !checkedIds.includes(id));
      setCheckedIds(prev => [...prev, ...idsToAdd]);
    } else {
      const idsToRemove = groupParts.map(p => p.id);
      setCheckedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setCheckedIds(filteredParts.map(p => p.id));
    } else {
      setCheckedIds([]);
    }
  };

  const executeBulkDelete = () => {
    if (removeMultipleParts) removeMultipleParts(checkedIds);
    setCheckedIds([]);
    setShowDeleteConfirm(false);
  };

  const handleBulkToggleActive = (active: boolean) => {
    if (updateMultipleParts) updateMultipleParts(checkedIds, { active });
  };

  const executeBulkChangeGroup = () => {
    if (updateMultipleParts) updateMultipleParts(checkedIds, { group: newGroupStr || undefined });
    setShowGroupPrompt(false);
    setCheckedIds([]);
  };

  const executeBulkEdit = () => {
    if (updateMultipleParts) {
      const updates: any = {};
      if (bulkEditForm.vMatP !== '') updates.vMatP = Number(bulkEditForm.vMatP) / 100;
      if (bulkEditForm.vArbP !== '') updates.vArbP = Number(bulkEditForm.vArbP) / 100;
      if (bulkEditForm.timeFactor !== '') updates.timeFactor = Number(bulkEditForm.timeFactor);
      
      updateMultipleParts(checkedIds, updates);
    }
    setShowBulkEditModal(false);
    setCheckedIds([]);
  };

  const grouped = filteredParts.reduce((acc, p) => {
    const groupSuffix = p.type + ((p as any).revision ? '__REV__' + (p as any).revision : '');
    const groupKey = p.group ? `${p.group}__GROUP__${groupSuffix}` : groupSuffix;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(p);
    return acc;
  }, {} as Record<string, typeof parts>);

  const selectedPart = parts.find(p => p.id === selectedPartId);

  return (
    <div className="flex flex-col h-full bg-[#f3f4f6]">
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="bg-white border-b border-gray-300 px-4 py-2 flex items-center justify-between shrink-0">
            <span className="font-semibold text-sm text-gray-700">WBS Kalkyl</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-700 font-semibold cursor-pointer select-none border-r border-gray-300 pr-3 mr-1">
                 <input 
                    type="checkbox" 
                    checked={showInactiveMoments} 
                    onChange={e => setShowInactiveMoments(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 cursor-pointer"
                 />
                 Visa avaktiverade moment
              </label>
              
              {byggdelTemplates && byggdelTemplates.length > 0 && (
                <select 
                  className="border border-blue-300 bg-blue-50 text-blue-700 rounded px-2 py-1 text-xs outline-none font-medium cursor-pointer"
                  value=""
                  onChange={e => {
                    const id = Number(e.target.value);
                    const tpl = byggdelTemplates.find(t => t.id === id);
                    if (tpl && addPartFromTemplate) {
                      addPartFromTemplate(tpl.data);
                    }
                  }}
                >
                  <option value="" disabled>+ Infoga från mall...</option>
                  {byggdelTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
              {receptList.length > 0 && (
                <button
                  onClick={() => setShowReceptModal(true)}
                  className="border border-green-300 bg-green-50 text-green-700 rounded px-2 py-1 text-xs outline-none font-medium cursor-pointer hover:bg-green-100"
                >
                  + Infoga från recept...
                </button>
              )}
              <select 
                className="border border-gray-300 rounded px-2 py-1 text-xs outline-none bg-gray-50"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="">Alla typer (WBS)</option>
                {uniqueTypes.map((type, tIdx) => {
                  const typeLabel = INITIAL_TIDSFAKTORER.find((t: any) => t.type === type)?.label || type;
                  return <option key={`type-${tIdx}`} value={type}>{typeLabel}</option>;
                })}
              </select>
              <Button variant="ghost" onClick={() => toggleAllByggdelar(true)} className="text-xs px-2" icon="unfold_less">Fäll ihop</Button>
              <Button variant="ghost" onClick={() => toggleAllByggdelar(false)} className="text-xs px-2" icon="unfold_more">Fäll ut</Button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden min-h-0 bg-white">
            <UnifiedGrid
              parts={filteredParts}
              materialsMap={materialsMap}
              materials={materials}
              showInactiveMoments={showInactiveMoments}
              variables={projectInfo.variables}
              toggleByggdel={toggleByggdel}
              togglePartActive={togglePartActive}
              clonePart={clonePart}
              removePart={removePart}
              openModal={openModal}
              updatePartQty={updatePartQty}
              updatePartAntal={updatePartAntal}
              updateMoment={updateMoment}
              duplicateMoment={duplicateMoment}
              removeMoment={removeMoment}
              updateMaterialPrice={updateMaterialPrice}
              addMoment={addMoment}
            />
          </div>
        </div>


      </div>

      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Bekräfta borttagning">
        <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">
          Är du säker på att du vill ta bort {checkedIds.length} markerade byggdelar? Detta kan inte ångras.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Avbryt</Button>
          <Button variant="danger" onClick={executeBulkDelete}>Ta bort</Button>
        </div>
      </Modal>

      <Modal isOpen={showGroupPrompt} onClose={() => setShowGroupPrompt(false)} title="Ändra Grupp">
        <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">Ange ny grupp (mapp) för de markerade byggdelarna. Lämna tomt för att ta bort gruppering.</p>
        <Input 
          className="w-full mb-4"
          placeholder="T.ex. Hus A, Källare..."
          value={newGroupStr}
          onChange={e => setNewGroupStr(e.target.value)}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') executeBulkChangeGroup();
            if (e.key === 'Escape') setShowGroupPrompt(false);
          }}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowGroupPrompt(false)}>Avbryt</Button>
          <Button variant="primary" onClick={executeBulkChangeGroup}>Spara Grupp</Button>
        </div>
      </Modal>

      <Modal isOpen={showBulkEditModal} onClose={() => setShowBulkEditModal(false)} title="Massredigera Byggdelar">
        <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">Lämna tomt för att behålla nuvarande värden.</p>
        
        <div className="space-y-3 mb-4 text-sm">
          <div>
              <label className="block text-xs font-semibold text-[var(--color-on-surface)] mb-1">Materialpåslag (%)</label>
              <Input 
                type="number" 
                className="w-full"
                placeholder="T.ex. 10"
                value={bulkEditForm.vMatP}
                onChange={e => setBulkEditForm({ ...bulkEditForm, vMatP: e.target.value })}
              />
          </div>
          <div>
              <label className="block text-xs font-semibold text-[var(--color-on-surface)] mb-1">Arbetspåslag (%)</label>
              <Input 
                type="number" 
                className="w-full"
                placeholder="T.ex. 15"
                value={bulkEditForm.vArbP}
                onChange={e => setBulkEditForm({ ...bulkEditForm, vArbP: e.target.value })}
              />
          </div>
          <div>
              <label className="block text-xs font-semibold text-[var(--color-on-surface)] mb-1">Tidsfaktor</label>
              <Input 
                type="number" 
                step="0.1"
                className="w-full"
                placeholder="T.ex. 1.0"
                value={bulkEditForm.timeFactor}
                onChange={e => setBulkEditForm({ ...bulkEditForm, timeFactor: e.target.value })}
              />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowBulkEditModal(false)}>Avbryt</Button>
          <Button variant="primary" onClick={executeBulkEdit}>Tillämpa</Button>
        </div>
      </Modal>

      <Modal isOpen={showReceptModal} onClose={() => setShowReceptModal(false)} title="Infoga från recept">
        <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">Välj recept att infoga och ange mängd.</p>
        
        <div className="space-y-4 mb-4 text-sm">
          <div>
            <label className="block text-xs font-semibold mb-1">Recept</label>
            <Select 
              value={selectedRecept?.id || ''} 
              onChange={e => {
                const rec = receptList.find(r => r.id === e.target.value);
                setSelectedRecept(rec || null);
              }}
              className="w-full"
            >
              <option value="">Välj recept...</option>
              {receptList.map(r => (
                <option key={r.id} value={r.id}>{r.kod ? `${r.kod} - ` : ''}{r.namn}</option>
              ))}
            </Select>
          </div>
          {selectedRecept && (
            <div>
              <label className="block text-xs font-semibold mb-1">Mängd ({selectedRecept.enhet || 'st'})</label>
              <Input 
                type="number"
                step="0.01"
                min="0"
                value={receptMangd}
                onChange={e => setReceptMangd(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
          {selectedRecept && (
            <div className="bg-gray-50 p-3 rounded border">
              <h4 className="font-semibold text-xs mb-2 text-gray-700">Förhandsgranskning (Totalt)</h4>
              <div className="flex justify-between items-center text-xs">
                <span>Total kostnad (netto):</span>
                <span className="font-mono">{Math.round(receptStyckkostnad(selectedRecept.data).total * receptMangd).toLocaleString('sv-SE')} kr</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span>Total CO₂e:</span>
                <span className="font-mono">{(receptCo2PerEnhet(selectedRecept.data) * receptMangd).toFixed(1)} kg</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowReceptModal(false)}>Avbryt</Button>
          <Button variant="primary" onClick={handleInfogaRecept} disabled={!selectedRecept || receptMangd <= 0}>Infoga</Button>
        </div>
      </Modal>
    </div>
  );
}

