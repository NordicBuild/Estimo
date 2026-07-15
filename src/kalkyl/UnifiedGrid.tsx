import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Material } from '../data';
import { buildGridRows, GridRow } from './kalkylGrid';
import { IconButton } from '../ui';
import { evalCell } from './kalkylFormula';

interface Props {
  parts: any[];
  materialsMap: Map<string, Material>;
  materials: Material[]; // array for dropdown
  showInactiveMoments: boolean;
  variables?: Record<string, number>;
  docLinks?: any[];
  
  // Callbacks
  toggleByggdel: (id: number) => void;
  togglePartActive: (id: number) => void;
  clonePart: (id: number) => void;
  removePart: (id: number) => void;
  openModal: (id?: number) => void;
  updatePartQty: (id: number, qty: number, raw?: string) => void;
  updatePartAntal: (id: number, antal: number, raw?: string) => void;
  
  updateMoment: (byggdelId: number, momentIndex: number, updates: any) => void;
  duplicateMoment: (byggdelId: number, momentIndex: number) => void;
  removeMoment: (byggdelId: number, momentIndex: number) => void;
  updateMaterialPrice: (materialName: string, price: number) => void;
  addMoment: (byggdelId: number) => void;
}

export function UnifiedGrid(props: Props) {
  const rows = useMemo(() => buildGridRows(props.parts, props.materialsMap, props.showInactiveMoments), [
    props.parts, props.materialsMap, props.showInactiveMoments
  ]);

  const [activeCell, setActiveCell] = useState<{ rowIdx: number, colKey: string } | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());

  const toggleDocs = (id: number) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [editValue, setEditValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (!activeCell) return;
      
      const cols = ['name', 'material', 'qty', 'antal', 'amount', 'unitPrice', 'timeUnit'];
      const cIdx = cols.indexOf(activeCell.colKey);

      switch (e.key) {
        case 'ArrowDown':
          if (activeCell.rowIdx < rows.length - 1) setActiveCell({ rowIdx: activeCell.rowIdx + 1, colKey: activeCell.colKey });
          e.preventDefault();
          break;
        case 'ArrowUp':
          if (activeCell.rowIdx > 0) setActiveCell({ rowIdx: activeCell.rowIdx - 1, colKey: activeCell.colKey });
          e.preventDefault();
          break;
        case 'ArrowLeft':
          if (cIdx > 0) setActiveCell({ rowIdx: activeCell.rowIdx, colKey: cols[cIdx - 1] });
          e.preventDefault();
          break;
        case 'ArrowRight':
          if (cIdx < cols.length - 1) setActiveCell({ rowIdx: activeCell.rowIdx, colKey: cols[cIdx + 1] });
          e.preventDefault();
          break;
        case 'Enter':
          startEditing(activeCell.rowIdx, activeCell.colKey);
          e.preventDefault();
          break;
        case 'Escape':
          setActiveCell(null);
          break;
        case 'd':
        case 'D':
          if (e.ctrlKey) {
            e.preventDefault();
            if (activeCell.rowIdx > 0) {
              const row = rows[activeCell.rowIdx];
              const prevRow = rows[activeCell.rowIdx - 1];
              const numericCols = ['qty', 'antal', 'amount', 'unitPrice', 'timeUnit'];
              if (row.kind === prevRow.kind && isEditable(row, activeCell.colKey) && numericCols.includes(activeCell.colKey)) {
                let valRaw: string | undefined;
                let valNum: number | undefined;
                
                if (prevRow.kind === 'section') {
                   if (activeCell.colKey === 'qty') { valRaw = prevRow.part.qtyRaw; valNum = prevRow.qty; }
                   if (activeCell.colKey === 'antal') { valRaw = prevRow.part.antalRaw; valNum = prevRow.antal; }
                } else if (prevRow.kind === 'line') {
                   if (activeCell.colKey === 'amount') { valRaw = prevRow.moment?.amountRaw; valNum = prevRow.amount; }
                   if (activeCell.colKey === 'unitPrice') { valRaw = prevRow.moment?.unitPriceRaw; valNum = prevRow.unitPrice; }
                   if (activeCell.colKey === 'timeUnit') { valNum = prevRow.timeUnit; valRaw = valNum?.toString(); }
                }

                if (valNum !== undefined) {
                  const resolver = buildResolver(activeCell.rowIdx);
                  const rawToUse = valRaw ?? valNum.toString();
                  const evalRes = evalCell(rawToUse, resolver);

                  if (row.kind === 'section') {
                    if (activeCell.colKey === 'qty') props.updatePartQty(row.byggdelId, evalRes.value, rawToUse);
                    if (activeCell.colKey === 'antal') props.updatePartAntal(row.byggdelId, evalRes.value, rawToUse);
                  } else if (row.kind === 'line') {
                    let rawUpdate: any = {};
                    if (activeCell.colKey === 'amount') rawUpdate = { amountRaw: rawToUse };
                    if (activeCell.colKey === 'unitPrice') rawUpdate = { unitPriceRaw: rawToUse };
                    const keyMap: any = { amount: 'amount', unitPrice: 'unitPrice', timeUnit: 'timeUnit' };
                    props.updateMoment(row.byggdelId, row.momentIndex!, { [keyMap[activeCell.colKey]]: evalRes.value, ...rawUpdate });
                  }
                  
                  // Move down automatically like Excel
                  if (activeCell.rowIdx < rows.length - 1) {
                    let nextRow = activeCell.rowIdx + 1;
                    while (nextRow < rows.length && !isEditable(rows[nextRow], activeCell.colKey)) {
                      nextRow++;
                    }
                    if (nextRow < rows.length) {
                      setActiveCell({ rowIdx: nextRow, colKey: activeCell.colKey });
                    }
                  }
                }
              }
            }
          }
          break;
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeCell, isEditing, rows]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      selectRef.current?.focus();
    }
  }, [isEditing]);

  const startEditing = (rIdx: number, colKey: string) => {
    const row = rows[rIdx];
    if (!isEditable(row, colKey)) return;
    setActiveCell({ rowIdx: rIdx, colKey });
    setIsEditing(true);
    let val: any = '';
    
    if (row.kind === 'section') {
      if (colKey === 'qty') val = row.part.qtyRaw ?? row.qty;
      if (colKey === 'antal') val = row.part.antalRaw ?? row.antal;
    } else if (row.kind === 'line') {
      if (colKey === 'name') val = row.name;
      if (colKey === 'material') val = row.material || '';
      if (colKey === 'amount') val = row.moment?.amountRaw ?? row.amount;
      if (colKey === 'unitPrice') val = row.moment?.unitPriceRaw ?? (row.unitPrice !== undefined ? row.unitPrice : '');
      if (colKey === 'timeUnit') val = row.timeUnit;
    }
    
    setEditValue(typeof val === 'number' ? val.toString().replace('.', ',') : (val || ''));
  };

  const isEditable = (row: GridRow, colKey: string) => {
    if (row.kind === 'section') {
      return colKey === 'qty' || colKey === 'antal';
    }
    if (row.kind === 'line') {
      return ['name', 'material', 'amount', 'unitPrice', 'timeUnit'].includes(colKey);
    }
    return false;
  };

  const buildResolver = (currentRowIndex: number) => (name: string): number | undefined => {
    if (props.variables && name in props.variables) {
      return props.variables[name];
    }
    if (/^R\d+$/i.test(name)) {
      const idx = parseInt(name.substring(1), 10) - 1;
      if (idx >= 0 && idx < rows.length && idx !== currentRowIndex) {
        const r = rows[idx];
        if (r.kind === 'section') return r.qty;
        if (r.kind === 'line') return r.amount;
      }
    }
    return undefined;
  };

  const commitEdit = () => {
    if (!activeCell) return;
    setIsEditing(false);
    
    const row = rows[activeCell.rowIdx];
    const { colKey } = activeCell;
    const resolver = buildResolver(activeCell.rowIdx);
    
    if (row.kind === 'section') {
      const { value } = evalCell(editValue, resolver);
      if (colKey === 'qty') props.updatePartQty(row.byggdelId, value, editValue);
      if (colKey === 'antal') props.updatePartAntal(row.byggdelId, value, editValue);
    } else if (row.kind === 'line') {
      const isNum = ['amount', 'unitPrice', 'timeUnit'].includes(colKey);
      let val: any = editValue;
      let rawUpdate: any = {};
      
      if (isNum) {
        const { value } = evalCell(editValue, resolver);
        val = value;
        if (colKey === 'amount') rawUpdate = { amountRaw: editValue };
        if (colKey === 'unitPrice') rawUpdate = { unitPriceRaw: editValue };
      }
      
      const keyMap: any = { name: 'label', material: 'material', amount: 'amount', unitPrice: 'unitPrice', timeUnit: 'timeUnit' };
      props.updateMoment(row.byggdelId, row.momentIndex!, { [keyMap[colKey]]: val, ...rawUpdate });
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
      if (activeCell && activeCell.rowIdx < rows.length - 1) {
        let nextRow = activeCell.rowIdx + 1;
        while (nextRow < rows.length && !isEditable(rows[nextRow], activeCell.colKey)) {
          nextRow++;
        }
        if (nextRow < rows.length) {
          setTimeout(() => setActiveCell({ rowIdx: nextRow, colKey: activeCell.colKey }), 0);
        }
      }
      e.preventDefault();
    }
    if (e.key === 'Tab') {
      commitEdit();
      const cols = ['name', 'material', 'qty', 'antal', 'amount', 'unitPrice', 'timeUnit'];
      if (activeCell) {
        let cIdx = cols.indexOf(activeCell.colKey);
        let nextCol = cIdx + (e.shiftKey ? -1 : 1);
        let nextRow = activeCell.rowIdx;
        while (nextCol >= 0 && nextCol < cols.length && !isEditable(rows[nextRow], cols[nextCol])) {
          nextCol += e.shiftKey ? -1 : 1;
        }
        if (nextCol >= 0 && nextCol < cols.length) {
          setTimeout(() => setActiveCell({ rowIdx: nextRow, colKey: cols[nextCol] }), 0);
        }
      }
      e.preventDefault();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  const renderCellWithFormula = (rIdx: number, colKey: string, val: number | undefined, raw: string | undefined, align: 'left' | 'right' = 'right') => {
    if (activeCell?.rowIdx === rIdx && activeCell?.colKey === colKey && isEditing) {
      return (
        <input 
          ref={inputRef} 
          type="text" 
          className={`w-full h-full bg-transparent outline-none px-1 ${align === 'right' ? 'text-right' : ''}`} 
          value={editValue} 
          onChange={e => setEditValue(e.target.value)} 
          onBlur={commitEdit} 
          onKeyDown={handleInputKeyDown} 
        />
      );
    }
    
    let hasFormula = raw && raw.trim().startsWith('=');
    let hasError = false;
    let errorMsg = '';
    if (hasFormula) {
      const resolver = buildResolver(rIdx);
      const res = evalCell(raw!, resolver);
      if (res.error) {
        hasError = true;
        errorMsg = res.error;
      }
    }
    
    return (
      <div className={`flex items-center gap-1 w-full relative group h-full ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {hasFormula && (
          <span className={`text-[9px] font-bold px-1 rounded cursor-help ${hasError ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-[var(--blue)]'}`} title={hasError ? errorMsg : 'Formel: ' + raw}>
            fx
          </span>
        )}
        <span className="truncate num">{val?.toLocaleString('sv-SE', { maximumFractionDigits: 3 })}</span>
      </div>
    );
  };

  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  const totals = useMemo(() => {
    let matCost = 0;
    let arbCost = 0;
    let totalCost = 0;
    let co2 = 0;
    for (const row of rows) {
      if (row.kind === 'section' && row.active) {
        matCost += (row.matCost || 0);
        arbCost += (row.arbCost || 0);
        totalCost += (row.totalCost || 0);
        co2 += (row.co2 || 0);
      }
    }
    return { matCost, arbCost, totalCost, co2 };
  }, [rows]);

  const getRowWarnings = (row: GridRow, rIdx: number) => {
    const warnings: string[] = [];
    const resolver = buildResolver(rIdx);
    
    if (row.kind === 'section') {
      if ((row.qty || 0) <= 0) warnings.push('Mängd är 0 eller negativ');
      if ((row.antal || 0) <= 0) warnings.push('Antal är 0 eller negativ');
      if (row.part.qtyRaw?.startsWith('=')) {
        if (evalCell(row.part.qtyRaw, resolver).error) warnings.push('Formelfel i Mängd');
      }
      if (row.part.antalRaw?.startsWith('=')) {
        if (evalCell(row.part.antalRaw, resolver).error) warnings.push('Formelfel i Antal');
      }
    } else if (row.kind === 'line') {
      if ((row.amount || 0) <= 0) warnings.push('Mängd är 0 eller negativ');
      
      const mat = props.materialsMap.get(row.material || '');
      const price = row.unitPrice !== undefined ? row.unitPrice : mat?.price;
      if (!price || price <= 0) warnings.push('Saknar materialpris');
      
      if (!mat?.co2PerUnit) warnings.push('Saknar CO2-faktor');
      
      if (row.moment?.amountRaw?.startsWith('=')) {
        if (evalCell(row.moment.amountRaw, resolver).error) warnings.push('Formelfel i Mängd');
      }
      if (row.moment?.unitPriceRaw?.startsWith('=')) {
        if (evalCell(row.moment.unitPriceRaw, resolver).error) warnings.push('Formelfel i À-pris');
      }
    }
    return warnings;
  };

  return (
    <div className="flex-1 overflow-auto bg-white">
      <table className="w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 bg-[#f8fafc] shadow-sm z-10 text-[10px] uppercase text-gray-500">
          <tr>
            <th className="p-2 border-b border-gray-200 w-10 text-center"></th>
            <th className="p-2 border-b border-gray-200 w-10 text-center">Aktiv</th>
            <th className="p-2 border-b border-gray-200 min-w-[200px]">Benämning / Typ</th>
            <th className="p-2 border-b border-gray-200 w-48">Material</th>
            <th className="p-2 border-b border-gray-200 w-20 text-right">Mängd</th>
            <th className="p-2 border-b border-gray-200 w-20 text-right">Antal</th>
            <th className="p-2 border-b border-gray-200 w-24 text-right">À-pris (kr)</th>
            <th className="p-2 border-b border-gray-200 w-20 text-right">Tid/enh</th>
            <th className="p-2 border-b border-gray-200 w-24 text-right">Material (kr)</th>
            <th className="p-2 border-b border-gray-200 w-24 text-right">Arbete (kr)</th>
            <th className="p-2 border-b border-gray-200 w-24 text-right">Summa (kr)</th>
            <th className="p-2 border-b border-gray-200 w-20 text-right">CO₂ (kg)</th>
            <th className="p-2 border-b border-gray-200 w-24 text-center">Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => {
            if (row.kind === 'section') {
              const inact = !row.active;
              const warnings = getRowWarnings(row, rIdx);
              const partLinks = props.docLinks?.filter(l => l.byggdel_id === String(row.byggdelId)) || [];
              const hasLinks = partLinks.length > 0;
              const isExpanded = expandedDocs.has(row.byggdelId);
              
              return (
                <React.Fragment key={`sec-${row.byggdelId}`}>
                <tr className={`border-b border-gray-200 bg-[#f1f5f9] hover:bg-[#e2e8f0] font-semibold text-gray-800 ${inact ? 'opacity-50' : ''}`}>
                  <td className="p-1 text-center border-r border-gray-200">
                    <button onClick={() => props.toggleByggdel(row.byggdelId)} className="w-6 h-6 rounded hover:bg-gray-300 flex items-center justify-center text-gray-500">
                      <i className={`fa-solid fa-chevron-${row.isCollapsed ? 'right' : 'down'} text-[10px]`}></i>
                    </button>
                  </td>
                  <td className="p-1 text-center border-r border-gray-200">
                    <input type="checkbox" checked={row.active} onChange={() => props.togglePartActive(row.byggdelId)} className="w-3.5 h-3.5" />
                  </td>
                  <td className="p-1 px-2 border-r border-gray-200 flex flex-col justify-center truncate">
                    <div className="flex items-center gap-1">
                      {warnings.length > 0 && (
                        <span className="material-symbols-outlined text-[14px] text-red-500 cursor-help" title={warnings.join('\n')}>warning</span>
                      )}
                      <span className={inact ? 'line-through' : ''}>{row.name}</span>
                      {row.part.isBought && (
                        <span className="ml-1 text-[10px] bg-green-100 text-green-800 px-1 rounded-sm border border-green-200" title={`Antagen offert: ${row.part.boughtPrice?.toLocaleString('sv-SE')} kr/${row.part.unit || 'enhet'}`}>KÖPT</span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-500 font-normal uppercase tracking-wider">{row.type}</span>
                    {hasLinks && (
                      <span 
                        className="ml-2 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded cursor-pointer border border-blue-200 hover:bg-blue-100 flex items-center gap-1 w-fit"
                        onClick={(e) => { e.stopPropagation(); toggleDocs(row.byggdelId); }}
                        title="Klicka för att se länkade dokument"
                      >
                        <i className="fa-solid fa-file-lines"></i> {partLinks.length} länkade
                      </span>
                    )}
                  </td>
                  <td className="p-1 border-r border-gray-200 bg-gray-50"></td>
                  
                  {/* Qty */}
                  <td 
                    className={`p-1 px-2 border-r border-gray-200 num text-right cursor-pointer ${(activeCell?.rowIdx === rIdx && activeCell?.colKey === 'qty') ? 'ring-2 ring-blue-500 bg-white p-0' : 'hover:bg-blue-50'}`}
                    onClick={() => startEditing(rIdx, 'qty')}
                  >
                    {(activeCell?.rowIdx === rIdx && activeCell?.colKey === 'qty' && isEditing) ? (
                      renderCellWithFormula(rIdx, 'qty', row.qty, row.part.qtyRaw)
                    ) : (
                      renderCellWithFormula(rIdx, 'qty', row.qty, row.part.qtyRaw)
                    )}
                  </td>
                  
                  {/* Antal */}
                  <td 
                    className={`p-1 px-2 border-r border-gray-200 num text-right cursor-pointer ${(activeCell?.rowIdx === rIdx && activeCell?.colKey === 'antal') ? 'ring-2 ring-blue-500 bg-white p-0' : 'hover:bg-blue-50'}`}
                    onClick={() => startEditing(rIdx, 'antal')}
                  >
                    {(activeCell?.rowIdx === rIdx && activeCell?.colKey === 'antal' && isEditing) ? (
                      renderCellWithFormula(rIdx, 'antal', row.antal, row.part.antalRaw)
                    ) : (
                      renderCellWithFormula(rIdx, 'antal', row.antal, row.part.antalRaw)
                    )}
                  </td>
                  
                  <td className="p-1 border-r border-gray-200 bg-gray-50"></td>
                  <td className="p-1 border-r border-gray-200 bg-gray-50"></td>
                  <td className="p-1 px-2 border-r border-gray-200 num text-right text-gray-600">{inact ? '-' : Math.round(row.matCost || 0).toLocaleString('sv-SE')}</td>
                  <td className="p-1 px-2 border-r border-gray-200 num text-right text-gray-600">{inact ? '-' : Math.round(row.arbCost || 0).toLocaleString('sv-SE')}</td>
                  <td className="p-1 px-2 border-r border-gray-200 num text-right font-bold text-blue-900">{inact ? '-' : formatKr(row.totalCost || 0)}</td>
                  <td className="p-1 px-2 border-r border-gray-200 num text-right font-semibold text-green-700">{inact ? '-' : Math.round(row.co2 || 0).toLocaleString('sv-SE')}</td>
                  
                  <td className="p-1 px-2 flex items-center justify-center gap-1 h-[32px]">
                    <IconButton className="w-6 h-6 text-gray-400 hover:text-blue-600" title="Duplicera" onClick={() => props.clonePart(row.byggdelId)} icon="content_copy" />
                    <IconButton className="w-6 h-6 text-gray-400 hover:text-blue-600" title="Detaljer" onClick={() => props.openModal(row.byggdelId)} icon="edit" />
                    <IconButton className="w-6 h-6 text-gray-400 hover:text-red-600" title="Radera" onClick={() => props.removePart(row.byggdelId)} icon="delete" />
                  </td>
                </tr>
                {hasLinks && isExpanded && (
                  <tr className="bg-white border-b border-gray-200">
                    <td colSpan={2} className="border-r border-gray-200 bg-gray-50"></td>
                    <td colSpan={11} className="p-3 bg-gray-50/50">
                      <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-link text-gray-400"></i> Kopplade Dokument
                      </div>
                      <div className="space-y-2">
                        {partLinks.map((link: any) => (
                          <div key={link.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                            <i className="fa-solid fa-file-pdf text-red-500"></i>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{link.document?.filename || 'Okänt dokument'}</div>
                              <div className="text-xs text-gray-500">Typ: {link.link_type} {link.notes ? `- ${link.notes}` : ''}</div>
                            </div>
                            <a href={`/?tab=dokument_ffu`} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-3 py-1 bg-blue-50 rounded">
                              Öppna i FFU
                            </a>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            }
            
            if (row.kind === 'line') {
              const inact = !row.active;
              const mat = row.material ? props.materialsMap.get(row.material) : undefined;
              const warnings = getRowWarnings(row, rIdx);
              
              const renderCell = (colKey: string, val: any, align: string = 'left', placeholder: string = '') => {
                const isActiveCell = activeCell?.rowIdx === rIdx && activeCell?.colKey === colKey;
                
                if (colKey === 'amount') {
                  return renderCellWithFormula(rIdx, colKey, val, row.moment?.amountRaw, align as 'left' | 'right');
                }
                
                if (colKey === 'unitPrice') {
                  if (row.unitPrice === undefined && !row.moment?.unitPriceRaw && !(isActiveCell && isEditing)) {
                     return <span className="text-gray-400 italic">{mat?.price?.toLocaleString('sv-SE', { maximumFractionDigits: 3 }) || ''}</span>;
                  }
                  return renderCellWithFormula(rIdx, colKey, val, row.moment?.unitPriceRaw, align as 'left' | 'right');
                }

                if (isActiveCell && isEditing) {
                  if (colKey === 'material') {
                    return (
                      <select 
                        ref={selectRef}
                        className="w-full bg-transparent outline-none h-full"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleInputKeyDown}
                      >
                        <option value="">(Inget)</option>
                        {props.materials.map(m => (
                          <option key={m.name} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    );
                  }
                  return (
                    <input 
                      ref={inputRef} 
                      type="text" 
                      className={`w-full h-full bg-transparent outline-none ${align === 'right' ? 'text-right' : ''}`} 
                      value={editValue} 
                      placeholder={placeholder}
                      onChange={e => setEditValue(e.target.value)} 
                      onBlur={commitEdit} 
                      onKeyDown={handleInputKeyDown} 
                    />
                  );
                }
                
                if (colKey === 'timeUnit') {
                   return val !== undefined ? val.toLocaleString('sv-SE', { maximumFractionDigits: 3 }) : '';
                }
                
                return val || '';
              };

              return (
                <tr key={`line-${row.byggdelId}-${row.momentIndex}`} className={`border-b border-gray-100 hover:bg-blue-50/30 group ${inact ? 'opacity-40 line-through' : ''} ${activeCell?.rowIdx === rIdx ? 'bg-blue-50/50' : ''}`}>
                  <td className="p-1 border-r border-gray-100 bg-gray-50"></td>
                  <td className="p-1 text-center border-r border-gray-100">
                    <input type="checkbox" checked={row.active} onChange={(e) => props.updateMoment(row.byggdelId, row.momentIndex!, { active: e.target.checked })} className="w-3 h-3" />
                  </td>
                  
                  {['name', 'material', 'amount', 'antal', 'unitPrice', 'timeUnit'].map(colKey => {
                    if (colKey === 'antal') return <td key={colKey} className="border-r border-gray-100 bg-gray-50"></td>;
                    
                    const isNum = ['amount', 'unitPrice', 'timeUnit'].includes(colKey);
                    const val = (row as any)[colKey];
                    const align = isNum ? 'right' : 'left';
                    const isActive = activeCell?.rowIdx === rIdx && activeCell?.colKey === colKey;
                    
                    let content = renderCell(colKey, val, align, colKey === 'unitPrice' ? (mat?.price?.toString() || '') : '');
                    if (colKey === 'name') {
                      content = (
                        <div className="flex items-center gap-1 w-full h-full">
                          {warnings.length > 0 && (
                            <span className="material-symbols-outlined text-[14px] text-red-500 cursor-help flex-shrink-0" title={warnings.join('\n')}>warning</span>
                          )}
                          <div className="flex-1 min-w-0">
                            {content}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <td 
                        key={colKey} 
                        className={`p-1 px-2 border-r border-gray-100 truncate cursor-pointer ${isNum ? 'num text-right' : ''} ${isActive ? 'ring-2 ring-blue-500 bg-white p-0' : 'hover:bg-blue-50'}`}
                        onClick={() => startEditing(rIdx, colKey)}
                      >
                        {content}
                      </td>
                    );
                  })}
                  
                  <td className="p-1 px-2 border-r border-gray-100 num text-right text-gray-600 bg-gray-50/30">{inact ? '-' : Math.round(row.matCost || 0).toLocaleString('sv-SE')}</td>
                  <td className="p-1 px-2 border-r border-gray-100 num text-right text-gray-600 bg-gray-50/30">{inact ? '-' : Math.round(row.arbCost || 0).toLocaleString('sv-SE')}</td>
                  <td className="p-1 px-2 border-r border-gray-100 num text-right text-gray-800 font-medium bg-gray-50/30">{inact ? '-' : Math.round(row.totalCost || 0).toLocaleString('sv-SE')}</td>
                  <td className="p-1 px-2 border-r border-gray-100 num text-right text-green-700 bg-gray-50/30">{inact ? '-' : Math.round(row.co2 || 0).toLocaleString('sv-SE')}</td>
                  
                  <td className="p-1 px-2 flex items-center justify-center gap-1 h-[32px]">
                    <IconButton className="w-6 h-6 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100" title="Duplicera rad" onClick={() => props.duplicateMoment(row.byggdelId, row.momentIndex!)} icon="copy" />
                    {row.material && row.unitPrice !== undefined && (
                      <IconButton className="w-6 h-6 text-gray-400 hover:text-green-600 opacity-0 group-hover:opacity-100" title="Spara à-pris till register" onClick={() => props.updateMaterialPrice(row.material!, row.unitPrice!)} icon="save" />
                    )}
                    <IconButton className="w-6 h-6 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100" title="Ta bort rad" onClick={() => props.removeMoment(row.byggdelId, row.momentIndex!)} icon="close" />
                  </td>
                </tr>
              );
            }
            
            if (row.kind === 'add-moment') {
               return (
                 <tr key={`add-${row.byggdelId}`} className="border-b-2 border-gray-300">
                    <td colSpan={13} className="p-1 bg-white">
                       <button onClick={() => props.addMoment(row.byggdelId)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 ml-10 py-1 px-2 rounded hover:bg-blue-50 transition-colors">
                          <i className="fa-solid fa-plus text-[10px]"></i> Lägg till moment
                       </button>
                    </td>
                 </tr>
               );
            }
            
            return null;
          })}
        </tbody>
        <tfoot className="sticky bottom-0 bg-[#f8fafc] shadow-[0_-2px_4px_rgba(0,0,0,0.05)] z-10 font-bold border-t-2 border-gray-400">
          <tr>
            <td colSpan={8} className="p-2 text-right uppercase text-xs tracking-wide text-gray-600">Totalsumma (Netto)</td>
            <td className="p-2 border-r border-gray-300 num text-right text-gray-800">{Math.round(totals.matCost).toLocaleString('sv-SE')}</td>
            <td className="p-2 border-r border-gray-300 num text-right text-gray-800">{Math.round(totals.arbCost).toLocaleString('sv-SE')}</td>
            <td className="p-2 border-r border-gray-300 num text-right text-blue-900 text-base">{formatKr(totals.totalCost)}</td>
            <td className="p-2 border-r border-gray-300 num text-right text-green-700">{Math.round(totals.co2).toLocaleString('sv-SE')}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
