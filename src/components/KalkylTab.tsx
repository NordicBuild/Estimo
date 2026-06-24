import { Fragment, useState, useEffect } from 'react';
import { Byggdel, Material, INITIAL_TIDSFAKTORER } from '../data';
import { CalculationResult } from '../useCalculation';

interface Props {
  byggdelar: Byggdel[];
  calcResult: CalculationResult;
  materials: Material[];
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
      className="w-16 bg-transparent text-right font-mono border border-transparent hover:border-gray-300 focus:border-[var(--blue)] focus:bg-white rounded px-1 outline-none transition-colors"
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

export function KalkylTab({ byggdelar, calcResult, materials, toggleByggdel, toggleAllByggdelar, reorderByggdelar, removePart, clonePart, togglePartActive, toggleTypeActive, cloneType, openModal, updateMoment, addMoment, removeMoment, updatePartQty, updatePartAntal, removeMultipleParts, updateMultipleParts }: Props) {
  const { parts, anbud, tg1, totVol, totTim } = calcResult;
  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  const [filterType, setFilterType] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGroupPrompt, setShowGroupPrompt] = useState(false);
  const [newGroupStr, setNewGroupStr] = useState('');
  
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({ vMatP: '', vArbP: '', timeFactor: '' });
  
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
      {/* KPI Ribbon (Bidcon-style top bar) */}
      <div className="bg-white border-b border-gray-300 flex items-center px-4 py-2 gap-6 text-xs text-gray-700 shadow-sm shrink-0">
        <div className="flex flex-col">
          <span className="text-gray-500 font-semibold uppercase text-[10px]">Anbudssumma</span>
          <span className="font-bold text-[var(--blue)] text-sm">{formatKr(anbud)}</span>
        </div>
        <div className="w-px h-6 bg-gray-300"></div>
        <div className="flex flex-col">
          <span className="text-gray-500 font-semibold uppercase text-[10px]">TG1</span>
          <span className="font-bold text-[var(--green)] text-sm">{tg1.toFixed(1)}%</span>
        </div>
        <div className="w-px h-6 bg-gray-300"></div>
        <div className="flex flex-col">
          <span className="text-gray-500 font-semibold uppercase text-[10px]">Betong vol</span>
          <span className="font-bold text-[var(--teal)] text-sm">{totVol.toFixed(2)} m³</span>
        </div>
        <div className="w-px h-6 bg-gray-300"></div>
        <div className="flex flex-col">
          <span className="text-gray-500 font-semibold uppercase text-[10px]">Timmar</span>
          <span className="font-bold text-[var(--amber)] text-sm">{Math.round(totTim)} h</span>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
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
        </div>
      </div>

      {/* Main Split Pane */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* Left Pane: WBS Tree */}
        <div className="w-1/2 lg:w-1/3 bg-white border-r border-gray-300 flex flex-col overflow-hidden">
          <div className="bg-[#e5e7eb] px-3 py-1.5 border-b border-gray-300 flex justify-between items-center tracking-wide text-[10px] font-bold text-gray-700 font-sans uppercase">
             <div className="flex items-center gap-2">
               <input 
                 type="checkbox" 
                 className="w-3 h-3 cursor-pointer" 
                 title="Markera alla"
                 checked={checkedIds.length > 0 && checkedIds.length === filteredParts.length}
                 ref={input => { if (input) input.indeterminate = checkedIds.length > 0 && checkedIds.length < filteredParts.length; }}
                 onChange={e => handleSelectAll(e.target.checked)}
               />
               <span>Kalkylstruktur (WBS)</span>
             </div>
             {checkedIds.length > 0 && (
               <div className="flex items-center gap-3">
                 <span className="text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded text-[9px]">{checkedIds.length} valda</span>
                 <button onClick={() => handleBulkToggleActive(true)} title="Aktivera valda" className="hover:text-blue-600"><i className="fa-solid fa-eye"></i></button>
                 <button onClick={() => handleBulkToggleActive(false)} title="Dölj valda" className="hover:text-amber-600"><i className="fa-solid fa-eye-slash"></i></button>
                 <button onClick={() => setShowGroupPrompt(true)} title="Ändra grupp för valda" className="hover:text-purple-600"><i className="fa-solid fa-folder-tree"></i></button>
                 <button onClick={() => setShowBulkEditModal(true)} title="Massredigera valda" className="hover:text-green-600"><i className="fa-solid fa-pen-to-square"></i></button>
                 <button onClick={() => setShowDeleteConfirm(true)} title="Ta bort valda" className="hover:text-red-600"><i className="fa-solid fa-trash"></i></button>
               </div>
             )}
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden text-xs">
            {Object.entries(grouped).map(([groupKey, groupParts]) => {
              let userGroup = '';
              let restKey = groupKey;
              if (groupKey.includes('__GROUP__')) {
                [userGroup, restKey] = groupKey.split('__GROUP__');
              }
              const baseType = restKey.split('__REV__')[0];
              const revision = restKey.split('__REV__')[1];
              const rawLabel = INITIAL_TIDSFAKTORER.find(t => t.type === baseType)?.label || baseType;
              let typeLabel = revision ? `${rawLabel} - ${revision}` : rawLabel;
              if (userGroup) {
                typeLabel = `${userGroup} / ${typeLabel}`;
              }
              
              const groupTotal = groupParts.reduce((s, p) => p.active ? s + p.costNetto : s, 0);
              const groupCheckedCount = groupParts.filter(p => checkedIds.includes(p.id)).length;
              const isGroupAllChecked = groupCheckedCount === groupParts.length && groupParts.length > 0;
              const isGroupIndeterminate = groupCheckedCount > 0 && groupCheckedCount < groupParts.length;

              return (
                <div key={groupKey} className="group">
                  <div className="flex items-center justify-between px-2 py-1.5 bg-[#f8fafc] border-b border-gray-200 font-semibold text-[#334155] cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                      <input 
                        type="checkbox" 
                        className="w-3 h-3 cursor-pointer mr-1"
                        checked={isGroupAllChecked}
                        ref={input => { if (input) input.indeterminate = isGroupIndeterminate; }}
                        onChange={e => handleSelectAllGroup(groupParts, e.target.checked)}
                        onClick={e => e.stopPropagation()}
                      />
                      <i className="fa-regular fa-folder-open text-[#94a3b8]"></i>
                      <span className="truncate">{typeLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                       <button className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded" title="Duplicera hela mappen" onClick={(e) => { e.stopPropagation(); cloneType(groupKey); }}>
                         <i className="fa-solid fa-copy text-[11px]"></i>
                       </button>
                       <span className="text-[#64748b] font-mono text-[11px] whitespace-nowrap">{formatKr(groupTotal)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    {groupParts.map(p => {
                      const isSelected = selectedPartId === p.id;
                      const isChecked = checkedIds.includes(p.id);
                      const inact = !p.active;
                      return (
                        <div 
                          key={p.id}
                          onClick={() => setSelectedPartId(p.id)}
                          draggable={!filterType}
                          onDragStart={(e) => {
                            if (filterType) return;
                            e.dataTransfer.setData('byggdelId', p.id.toString());
                          }}
                          onDragOver={(e) => {
                            if (filterType) return;
                            e.preventDefault(); 
                            e.currentTarget.classList.add('border-t-2', 'border-[#3b82f6]');
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove('border-t-2', 'border-[#3b82f6]');
                          }}
                          onDrop={(e) => {
                            if (filterType) return;
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-t-2', 'border-[#3b82f6]');
                            const dragId = parseInt(e.dataTransfer.getData('byggdelId'));
                            if (!isNaN(dragId) && dragId !== p.id) {
                              const dragIndex = byggdelar.findIndex(b => b.id === dragId);
                              const dropIndex = byggdelar.findIndex(b => b.id === p.id);
                              if (dragIndex >= 0 && dropIndex >= 0) {
                                reorderByggdelar(dragIndex, dropIndex);
                              }
                            }
                          }}
                          className={`group/item flex items-center justify-between px-2 pl-6 py-1.5 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-[#bfdbfe] text-[#1e3a8a]' : 'hover:bg-[#f1f5f9] text-[#475569]'} ${inact ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <input 
                              type="checkbox" 
                              className="w-3 h-3 cursor-pointer mr-1"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) setCheckedIds(prev => [...prev, p.id]);
                                else setCheckedIds(prev => prev.filter(id => id !== p.id));
                              }}
                              onClick={e => e.stopPropagation()}
                            />
                            {!filterType && <i className="fa-solid fa-grip-vertical text-gray-300 mr-1 hover:text-gray-500 cursor-grab" onClick={e => e.stopPropagation()} title="Dra och släpp för att ändra ordning"></i>}
                            <i className="fa-regular fa-file-lines text-[#94a3b8]"></i>
                            <span className={`truncate ${inact ? 'line-through' : ''}`} title={p.name}>{p.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 whitespace-nowrap ml-2">
                             <div className="text-right w-12 flex items-center border border-gray-200 rounded px-1" onClick={e => e.stopPropagation()} title="Antal instanser (st)">
                                <LocalNumberInput 
                                  initialValue={p.antal || 1}
                                  onChange={(val) => updatePartAntal(p.id, val)}
                                />
                                <span className="text-[9px] text-gray-400 ml-0.5">st</span>
                             </div>
                             <span className="text-gray-300 text-[10px]">×</span>
                             <div className="text-right w-16" onClick={e => e.stopPropagation()} title="Mängd">
                                <LocalNumberInput 
                                  initialValue={p.qty}
                                  onChange={(val) => updatePartQty(p.id, val)}
                                />
                             </div>
                             <span className="w-6 text-[10px] text-gray-500 text-left">{p.unit}</span>
                             <span className={`w-20 text-right font-mono ${isSelected ? 'text-[#1e3a8a] font-bold' : 'text-[#64748b]'}`}>{inact ? '-' : formatKr(p.costNetto)}</span>
                             
                             <div className="flex gap-1 ml-3 opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-opacity bg-transparent pl-1 rounded border border-transparent">
                                <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded hover:bg-[#e2e8f0] transition-colors" title="Duplicera byggdel" onClick={(e) => { e.stopPropagation(); clonePart(p.id); }}>
                                  <i className="fa-solid fa-copy text-xs"></i>
                                </button>
                                <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded hover:bg-[#e2e8f0] transition-colors" title="Redigera i fönster" onClick={(e) => { e.stopPropagation(); openModal(p.id); }}>
                                  <i className="fa-solid fa-pen text-xs"></i>
                                </button>
                                <button className={`w-6 h-6 flex items-center justify-center text-gray-400 rounded hover:bg-[#e2e8f0] transition-colors ${inact ? 'hover:text-green-600' : 'hover:text-amber-500'}`} title={inact ? "Visa byggdel" : "Avvisa/Dölj byggdel"} onClick={(e) => { e.stopPropagation(); togglePartActive(p.id); }}>
                                  {inact ? <i className="fa-solid fa-eye-slash text-xs"></i> : <i className="fa-solid fa-eye text-xs"></i>}
                                </button>
                                <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 rounded hover:bg-[#e2e8f0] transition-colors" title="Radera byggdel" onClick={(e) => { e.stopPropagation(); removePart(p.id); }}>
                                  <i className="fa-solid fa-trash text-xs"></i>
                                </button>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Resource Grid (Moments / Resources) */}
        <div className="w-1/2 lg:w-2/3 flex flex-col bg-white overflow-hidden">
           <div className="bg-[#e5e7eb] px-3 py-1.5 border-b border-gray-300 flex justify-between tracking-wide text-[10px] font-bold text-gray-700 font-sans uppercase shrink-0">
             <span>Resurser & Arbetsmoment {selectedPart ? `- ${selectedPart.name}` : ''}</span>
             {selectedPart && (
               <button className="text-blue-600 hover:underline" onClick={() => addMoment(selectedPart.id)}>+ Lägg till resurs</button>
             )}
           </div>
           
           <div className="flex-1 overflow-auto bg-gray-50 p-4">
             {selectedPart ? (
                <div className="bg-white border border-[#cbd5e1] shadow-sm">
                   <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                     <thead className="sticky top-0 z-10">
                       <tr className="bg-[#f8fafc] border-b border-[#cbd5e1] text-[#475569] font-medium">
                         <th className="p-1.5 px-2 border-r border-[#cbd5e1] w-8 text-center"></th>
                         <th className="p-1.5 px-2 border-r border-[#cbd5e1]">Aktivitet / Resurs</th>
                         <th className="p-1.5 px-2 border-r border-[#cbd5e1]">Material / Kalkylpost</th>
                         <th className="p-1.5 px-2 border-r border-[#cbd5e1] text-right">Åtgång / enh</th>
                         <th className="p-1.5 px-2 border-r border-[#cbd5e1] text-right">Tid (h) / enh</th>
                         <th className="p-1.5 px-2"></th>
                       </tr>
                     </thead>
                     <tbody>
                       {(selectedPart.moments || []).map((m, mIdx) => (
                         <tr key={mIdx} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9] group">
                           <td className="p-1.5 px-2 border-r border-[#e2e8f0] text-center text-gray-400 text-[10px] bg-gray-50">{mIdx + 1}</td>
                           <td className="p-1 px-2 border-r border-[#e2e8f0]">
                             <input 
                               type="text" 
                               className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded px-1 py-0.5 outline-none"
                               value={m.label || ''}
                               onChange={e => updateMoment(selectedPart.id, mIdx, { label: e.target.value })}
                               placeholder="Beskrivning"
                             />
                           </td>
                           <td className="p-1 px-2 border-r border-[#e2e8f0]">
                             <select 
                               className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded px-1 py-0.5 outline-none"
                               value={m.material || ''}
                               onChange={e => updateMoment(selectedPart.id, mIdx, { material: e.target.value })}
                             >
                               <option value="">(Inget material)</option>
                               {materials.map((mat, i) => (
                                 <option key={`mat-${i}`} value={mat.name}>{mat.name} ({mat.unit})</option>
                               ))}
                             </select>
                           </td>
                           <td className="p-1 px-2 border-r border-[#e2e8f0] text-right font-mono bg-[#f8fafc]">
                             <LocalNumberInput 
                               initialValue={m.amount ?? 0}
                               onChange={(val) => updateMoment(selectedPart.id, mIdx, { amount: val })}
                             />
                           </td>
                           <td className="p-1 px-2 border-r border-[#e2e8f0] text-right font-mono bg-[#f8fafc]">
                             <LocalNumberInput 
                               initialValue={m.timeUnit ?? 0}
                               onChange={(val) => updateMoment(selectedPart.id, mIdx, { timeUnit: val })}
                             />
                           </td>
                           <td className="p-1 px-2 w-8 text-center text-red-400 hover:text-red-600 bg-[#f8fafc]">
                             <button onClick={() => removeMoment(selectedPart.id, mIdx)} title="Ta bort rad">
                               <i className="fa-solid fa-xmark text-xs"></i>
                             </button>
                           </td>
                         </tr>
                       ))}
                       {selectedPart.moments.length === 0 && (
                         <tr>
                           <td colSpan={6} className="p-4 text-center text-gray-500 italic">Inga rader skapade i denna byggdel.</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                </div>
             ) : (
                <div className="flex h-full items-center justify-center text-gray-400 flex-col gap-2">
                   <i className="fa-solid fa-arrow-pointer text-4xl opacity-20"></i>
                   <p>Markera en byggdel i trädet till vänster för att redigera kalkylposter.</p>
                </div>
             )}
           </div>

        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded p-4 max-w-md w-full shadow-xl">
             <h3 className="text-lg font-bold text-gray-800 mb-2">Bekräfta borttagning</h3>
             <p className="text-sm text-gray-600 mb-4">
               Är du säker på att du vill ta bort {checkedIds.length} markerade byggdelar? Detta kan inte ångras.
             </p>
             <div className="flex justify-end gap-2">
               <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Avbryt</button>
               <button onClick={executeBulkDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Ta bort</button>
             </div>
          </div>
        </div>
      )}

      {showGroupPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded p-4 max-w-sm w-full shadow-xl">
             <h3 className="text-lg font-bold text-gray-800 mb-2">Ändra Grupp</h3>
             <p className="text-xs text-gray-600 mb-4">Ange ny grupp (mapp) för de markerade byggdelarna. Lämna tomt för att ta bort gruppering.</p>
             <input 
               type="text" 
               className="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-sm"
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
               <button onClick={() => setShowGroupPrompt(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Avbryt</button>
               <button onClick={executeBulkChangeGroup} className="px-4 py-2 text-sm bg-[var(--blue)] text-white rounded hover:bg-blue-700">Spara Grupp</button>
             </div>
          </div>
        </div>
      )}

      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded p-4 max-w-sm w-full shadow-xl">
             <h3 className="text-lg font-bold text-gray-800 mb-2">Massredigera Byggdelar</h3>
             <p className="text-xs text-gray-600 mb-4">Lämna tomt för att behålla nuvarande värden.</p>
             
             <div className="space-y-3 mb-4 text-sm">
                <div>
                   <label className="block text-xs font-semibold text-gray-600 mb-1">Materialpåslag (%)</label>
                   <input 
                     type="number" 
                     className="w-full border border-gray-300 rounded px-2 py-1.5"
                     placeholder="T.ex. 10"
                     value={bulkEditForm.vMatP}
                     onChange={e => setBulkEditForm({ ...bulkEditForm, vMatP: e.target.value })}
                   />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-gray-600 mb-1">Arbetspåslag (%)</label>
                   <input 
                     type="number" 
                     className="w-full border border-gray-300 rounded px-2 py-1.5"
                     placeholder="T.ex. 15"
                     value={bulkEditForm.vArbP}
                     onChange={e => setBulkEditForm({ ...bulkEditForm, vArbP: e.target.value })}
                   />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-gray-600 mb-1">Tidsfaktor</label>
                   <input 
                     type="number" 
                     step="0.1"
                     className="w-full border border-gray-300 rounded px-2 py-1.5"
                     placeholder="T.ex. 1.0"
                     value={bulkEditForm.timeFactor}
                     onChange={e => setBulkEditForm({ ...bulkEditForm, timeFactor: e.target.value })}
                   />
                </div>
             </div>

             <div className="flex justify-end gap-2">
               <button onClick={() => setShowBulkEditModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Avbryt</button>
               <button onClick={executeBulkEdit} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">Tillämpa</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

