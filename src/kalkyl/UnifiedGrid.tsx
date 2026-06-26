import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Material } from '../data';
import { buildGridRows, GridRow } from './kalkylGrid';
import { IconButton } from '../ui';

interface Props {
  parts: any[];
  materialsMap: Map<string, Material>;
  materials: Material[]; // array for dropdown
  showInactiveMoments: boolean;
  
  // Callbacks
  toggleByggdel: (id: number) => void;
  togglePartActive: (id: number) => void;
  clonePart: (id: number) => void;
  removePart: (id: number) => void;
  openModal: (id?: number) => void;
  updatePartQty: (id: number, qty: number) => void;
  updatePartAntal: (id: number, antal: number) => void;
  
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
        // Ctrl+D logic could be added here
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
    if (colKey === 'name') val = row.name;
    if (colKey === 'material') val = row.material || '';
    if (colKey === 'qty') val = row.qty;
    if (colKey === 'antal') val = row.antal;
    if (colKey === 'amount') val = row.amount;
    if (colKey === 'unitPrice') val = row.unitPrice !== undefined ? row.unitPrice : '';
    if (colKey === 'timeUnit') val = row.timeUnit;
    
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

  const commitEdit = () => {
    if (!activeCell) return;
    setIsEditing(false);
    
    const row = rows[activeCell.rowIdx];
    const { colKey } = activeCell;
    
    if (row.kind === 'section') {
      let num = parseFloat(editValue.replace(',', '.'));
      if (isNaN(num)) num = 0;
      if (colKey === 'qty') props.updatePartQty(row.byggdelId, num);
      if (colKey === 'antal') props.updatePartAntal(row.byggdelId, num);
    } else if (row.kind === 'line') {
      const isNum = ['amount', 'unitPrice', 'timeUnit'].includes(colKey);
      let val: any = editValue;
      if (isNum) {
        let parsed = parseFloat(editValue.replace(',', '.'));
        val = isNaN(parsed) ? (colKey === 'unitPrice' ? undefined : 0) : parsed;
      }
      
      const keyMap: any = { name: 'label', material: 'material', amount: 'amount', unitPrice: 'unitPrice', timeUnit: 'timeUnit' };
      props.updateMoment(row.byggdelId, row.momentIndex!, { [keyMap[colKey]]: val });
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') {
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

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
              return (
                <tr key={`sec-${row.byggdelId}`} className={`border-b border-gray-200 bg-[#f1f5f9] hover:bg-[#e2e8f0] font-semibold text-gray-800 ${inact ? 'opacity-50' : ''}`}>
                  <td className="p-1 text-center border-r border-gray-200">
                    <button onClick={() => props.toggleByggdel(row.byggdelId)} className="w-6 h-6 rounded hover:bg-gray-300 flex items-center justify-center text-gray-500">
                      <i className={`fa-solid fa-chevron-${row.isCollapsed ? 'right' : 'down'} text-[10px]`}></i>
                    </button>
                  </td>
                  <td className="p-1 text-center border-r border-gray-200">
                    <input type="checkbox" checked={row.active} onChange={() => props.togglePartActive(row.byggdelId)} className="w-3.5 h-3.5" />
                  </td>
                  <td className="p-1 px-2 border-r border-gray-200 flex flex-col justify-center truncate">
                    <span className={inact ? 'line-through' : ''}>{row.name}</span>
                    <span className="text-[9px] text-gray-500 font-normal uppercase tracking-wider">{row.type}</span>
                  </td>
                  <td className="p-1 border-r border-gray-200 bg-gray-50"></td>
                  
                  {/* Qty */}
                  <td 
                    className={`p-1 px-2 border-r border-gray-200 num text-right cursor-pointer ${(activeCell?.rowIdx === rIdx && activeCell?.colKey === 'qty') ? 'ring-2 ring-blue-500 bg-white p-0' : 'hover:bg-blue-50'}`}
                    onClick={() => startEditing(rIdx, 'qty')}
                  >
                    {(activeCell?.rowIdx === rIdx && activeCell?.colKey === 'qty' && isEditing) ? (
                      <input ref={inputRef} type="text" className="w-full h-full text-right bg-transparent outline-none" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleInputKeyDown} />
                    ) : (row.qty?.toLocaleString('sv-SE', { maximumFractionDigits: 3 }))}
                  </td>
                  
                  {/* Antal */}
                  <td 
                    className={`p-1 px-2 border-r border-gray-200 num text-right cursor-pointer ${(activeCell?.rowIdx === rIdx && activeCell?.colKey === 'antal') ? 'ring-2 ring-blue-500 bg-white p-0' : 'hover:bg-blue-50'}`}
                    onClick={() => startEditing(rIdx, 'antal')}
                  >
                    {(activeCell?.rowIdx === rIdx && activeCell?.colKey === 'antal' && isEditing) ? (
                      <input ref={inputRef} type="text" className="w-full h-full text-right bg-transparent outline-none" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleInputKeyDown} />
                    ) : (row.antal?.toLocaleString('sv-SE', { maximumFractionDigits: 3 }))}
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
              );
            }
            
            if (row.kind === 'line') {
              const inact = !row.active;
              const mat = row.material ? props.materialsMap.get(row.material) : undefined;
              
              const renderCell = (colKey: string, val: any, align: string = 'left', placeholder: string = '') => {
                const isActiveCell = activeCell?.rowIdx === rIdx && activeCell?.colKey === colKey;
                
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
                
                if (colKey === 'unitPrice' && row.unitPrice === undefined) {
                   return <span className="text-gray-400 italic">{mat?.price?.toLocaleString('sv-SE', { maximumFractionDigits: 3 }) || ''}</span>;
                }
                
                if (colKey === 'amount' || colKey === 'unitPrice' || colKey === 'timeUnit') {
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
                    
                    return (
                      <td 
                        key={colKey} 
                        className={`p-1 px-2 border-r border-gray-100 truncate cursor-pointer ${isNum ? 'num text-right' : ''} ${isActive ? 'ring-2 ring-blue-500 bg-white p-0' : 'hover:bg-blue-50'}`}
                        onClick={() => startEditing(rIdx, colKey)}
                      >
                        {renderCell(colKey, val, align, colKey === 'unitPrice' ? (mat?.price?.toString() || '') : '')}
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
      </table>
    </div>
  );
}
