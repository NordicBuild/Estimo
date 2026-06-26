import { Fragment, useState, useEffect, useMemo } from 'react';
import { Byggdel, Material, INITIAL_TIDSFAKTORER, ProjectInfo, CompanyInfo } from '../data';
import { CalculationResult } from '../useCalculation';
import { computeByggdelCo2 } from '../climate/co2';
import { Button, IconButton, NumberInput, Input, Select, Modal, Badge, Toolbar, InspectorPortal } from '../ui';
import { UnifiedGrid } from '../kalkyl/UnifiedGrid';
import { exportExcel, exportPdf } from '../exportUtils';

interface Props {
  byggdelar: Byggdel[];
  calcResult: CalculationResult;
  materials: Material[];
  projectInfo?: ProjectInfo;
  companyInfo?: CompanyInfo;
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

export function KalkylTab({ byggdelar, calcResult, materials, projectInfo, companyInfo, settings, updateSettings, byggdelTemplates, addTemplate, deleteTemplate, addPartFromTemplate, toggleByggdel, toggleAllByggdelar, reorderByggdelar, removePart, clonePart, togglePartActive, toggleTypeActive, cloneType, openModal, updateMoment, duplicateMoment, updateMaterialPrice, addMoment, removeMoment, updatePartQty, updatePartAntal, removeMultipleParts, updateMultipleParts }: Props) {
  const { parts, anbud, tg1, totVol, totTim, projNetto } = calcResult;
  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  const [filterType, setFilterType] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGroupPrompt, setShowGroupPrompt] = useState(false);
  const [newGroupStr, setNewGroupStr] = useState('');
  const [showInactiveMoments, setShowInactiveMoments] = useState(false);

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
      <InspectorPortal>
        <div className="p-4 flex flex-col gap-4 h-full bg-white">
          <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-2 border-b border-gray-200 pb-2">Anbudsremsan</h2>
          
          <div className="flex flex-col gap-3 font-mono text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 uppercase text-xs">Självkostnad</span>
              <span className="font-semibold text-gray-800">{formatKr(projNetto)}</span>
            </div>
            
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 uppercase text-xs">Omkostnader (%)</span>
              <div className="flex items-center gap-1 border-b border-gray-300 pb-0.5">
                <input 
                  type="number" 
                  className="w-12 text-right bg-transparent outline-none focus:bg-gray-50"
                  value={settings?.fOrg ? Math.round(settings.fOrg * 100) : 0}
                  onChange={(e) => updateSettings?.('fOrg', Number(e.target.value) / 100)}
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 uppercase text-xs">Vinst Mat (%)</span>
              <div className="flex items-center gap-1 border-b border-gray-300 pb-0.5">
                <input 
                  type="number" 
                  className="w-12 text-right bg-transparent outline-none focus:bg-gray-50"
                  value={settings?.vMatP ? Math.round(settings.vMatP * 100) : 0}
                  onChange={(e) => updateSettings?.('vMatP', Number(e.target.value) / 100)}
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 uppercase text-xs">Vinst Arb (%)</span>
              <div className="flex items-center gap-1 border-b border-gray-300 pb-0.5">
                <input 
                  type="number" 
                  className="w-12 text-right bg-transparent outline-none focus:bg-gray-50"
                  value={settings?.vArbP ? Math.round(settings.vArbP * 100) : 0}
                  onChange={(e) => updateSettings?.('vArbP', Number(e.target.value) / 100)}
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-gray-200 pt-3 mt-1">
              <span className="text-gray-500 uppercase text-xs">Täckningsgrad</span>
              <span className="font-semibold text-[var(--green)]">{tg1.toFixed(1)}%</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b-2 border-primary mb-2">
              <span className="font-bold uppercase text-xs text-primary">Anbudssumma</span>
              <span className="font-bold text-primary text-xl tracking-tight">{formatKr(anbud)}</span>
            </div>

            <div className="flex justify-between items-center py-1 mt-4">
              <span className="text-gray-500 uppercase text-xs">Totalt arbete</span>
              <span className="font-semibold text-gray-800">{Math.round(totTim)} h</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 uppercase text-xs">Total CO2e</span>
              <span className="font-semibold text-gray-800">{Math.round(calcResult.co2.total)} kg</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 uppercase text-xs flex items-center gap-2">
                BTA (m²)
              </span>
              <div className="flex items-center gap-1 border-b border-gray-300 pb-0.5">
                <input 
                  type="number" 
                  className="w-16 text-right bg-transparent outline-none focus:bg-gray-50"
                  value={settings?.bta || ''}
                  onChange={(e) => updateSettings?.('bta', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
              <span className="text-gray-500 uppercase text-xs">CO2e / m² BTA</span>
              <span className="font-semibold text-gray-800">{(settings?.bta && settings.bta > 0) ? (calcResult.co2.total / settings.bta).toFixed(1) : '-'} kg</span>
            </div>
            
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-200">
              <button className="btn btn-secondary border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-xs px-2 py-1.5 font-medium flex justify-center items-center" onClick={handleExportExcel}>
                <i className="fa-solid fa-file-excel text-green-600 mr-2"></i> Exportera Kalkyl (Excel)
              </button>
              <button className="btn btn-primary bg-[var(--blue)] text-white shadow-sm hover:bg-[var(--blue-dk)] text-xs px-2 py-1.5 font-medium flex justify-center items-center" onClick={handleExportPdf}>
                <i className="fa-solid fa-file-pdf mr-2"></i> Exportera Anbud (PDF)
              </button>
            </div>
          </div>
        </div>
      </InspectorPortal>

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
    </div>
  );
}

