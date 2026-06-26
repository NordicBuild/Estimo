import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Material } from '../data';
import { IconButton } from '../ui';

interface MomentGridProps {
  part: any;
  materials: Material[];
  updateMoment: (byggdelId: number, momentIndex: number, updates: any) => void;
  duplicateMoment: (byggdelId: number, momentIndex: number) => void;
  updateMaterialPrice: (materialName: string, price: number) => void;
  addMoment: (byggdelId: number) => void;
  removeMoment: (byggdelId: number, momentIndex: number) => void;
}

const COLUMNS = [
  { key: 'label', title: 'Aktivitet / Resurs', type: 'text', width: 'auto' },
  { key: 'material', title: 'Material / Kalkylpost', type: 'select', width: '20%' },
  { key: 'amount', title: 'Åtgång / enh', type: 'number', width: '10%' },
  { key: 'unitPrice', title: 'À-pris (kr)', type: 'number', width: '10%' },
  { key: 'timeUnit', title: 'Tid (h) / enh', type: 'number', width: '10%' },
];

export function MomentGrid({ part, materials, updateMoment, duplicateMoment, updateMaterialPrice, addMoment, removeMoment }: MomentGridProps) {
  const byggdelId = part.id;
  const moments = part.moments || [];
  const bQty = (part.qty || 1) * (part.antal || 1);

  const [activeCell, setActiveCell] = useState<{ row: number, col: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');
  
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  const materialsMap = React.useMemo(() => {
    const map = new Map<string, Material>();
    for (const m of materials) map.set(m.name, m);
    return map;
  }, [materials]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editMode && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editMode]);

  // Focus grid when not in edit mode so we can capture keyboard events
  useEffect(() => {
    if (!editMode && activeCell && gridRef.current) {
      gridRef.current.focus();
    }
  }, [editMode, activeCell]);

  const commitEdit = () => {
    if (activeCell && editMode) {
      const col = COLUMNS[activeCell.col];
      let val: any = editValue;
      if (col.type === 'number') {
        const parsed = parseFloat(editValue.replace(',', '.'));
        val = isNaN(parsed) ? (col.key === 'unitPrice' ? undefined : 0) : parsed;
      }
      updateMoment(byggdelId, activeCell.row, { [col.key]: val });
      setEditMode(false);
    }
  };

  const handleGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editMode) return; // Handled by input

    if (!activeCell) {
      if (moments.length > 0 && e.key === 'ArrowDown') {
        setActiveCell({ row: 0, col: 0 });
        e.preventDefault();
      }
      return;
    }

    const { row, col } = activeCell;

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) setActiveCell({ row: row - 1, col });
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (row < moments.length - 1) setActiveCell({ row: row + 1, col });
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (col > 0) setActiveCell({ row, col: col - 1 });
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (col < COLUMNS.length - 1) setActiveCell({ row, col: col + 1 });
        e.preventDefault();
        break;
      case 'Enter':
        setEditValue(moments[row][COLUMNS[col].key]?.toString() || '');
        setEditMode(true);
        e.preventDefault();
        break;
      case 'Tab':
        if (col < COLUMNS.length - 1) {
          setActiveCell({ row, col: col + 1 });
        } else if (row < moments.length - 1) {
          setActiveCell({ row: row + 1, col: 0 });
        }
        e.preventDefault();
        break;
      case 'd':
      case 'D':
        if (e.ctrlKey && row > 0) {
          const colKey = COLUMNS[col].key;
          const prevValue = moments[row - 1][colKey];
          updateMoment(byggdelId, row, { [colKey]: prevValue });
          e.preventDefault();
        }
        break;
      case 'c':
      case 'C':
        if (e.ctrlKey) {
          const val = moments[row][COLUMNS[col].key]?.toString() || '';
          navigator.clipboard.writeText(val);
        }
        break;
      case 'v':
      case 'V':
        if (e.ctrlKey) {
          navigator.clipboard.readText().then(text => {
            const colDef = COLUMNS[col];
            let val: any = text;
            if (colDef.type === 'number') {
              const parsed = parseFloat(text.replace(',', '.'));
              val = isNaN(parsed) ? (colDef.key === 'unitPrice' ? undefined : 0) : parsed;
            }
            updateMoment(byggdelId, row, { [colDef.key]: val });
          });
        }
        break;
      case 'Delete':
      case 'Backspace':
        updateMoment(byggdelId, row, { [COLUMNS[col].key]: COLUMNS[col].type === 'number' ? (COLUMNS[col].key === 'unitPrice' ? undefined : 0) : '' });
        e.preventDefault();
        break;
      default:
        // Type to edit
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setEditValue(e.key);
          setEditMode(true);
          e.preventDefault();
        }
        break;
    }
  };

  const handleInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
      if (activeCell && activeCell.row < moments.length - 1) {
        setActiveCell({ row: activeCell.row + 1, col: activeCell.col });
      }
      e.preventDefault();
    } else if (e.key === 'Tab') {
      commitEdit();
      if (activeCell) {
        if (activeCell.col < COLUMNS.length - 1) {
          setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
        } else if (activeCell.row < moments.length - 1) {
          setActiveCell({ row: activeCell.row + 1, col: 0 });
        }
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setEditMode(false);
      if (gridRef.current) gridRef.current.focus();
    }
  };

  // Validation logic
  const getValidationErrors = (m: any) => {
    const errors: string[] = [];
    if (!m.amount || m.amount === 0) errors.push('Mängd är noll.');
    if (m.material) {
      const mat = materialsMap.get(m.material);
      if (!mat) {
        errors.push('Material hittas inte i databasen.');
      } else {
        if (!mat.price || mat.price === 0) errors.push('Saknat pris för valt material.');
        if (!mat.co2 || mat.co2 === 0) errors.push('Saknad CO2-faktor för valt material.');
      }
    }
    return errors;
  };

  let sumCost = 0;
  let sumCo2 = 0;

  return (
    <div 
      className="bg-white border border-[#cbd5e1] shadow-sm flex flex-col flex-1 outline-none min-h-0 relative"
      tabIndex={0}
      ref={gridRef}
      onKeyDown={handleGridKeyDown}
    >
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap relative">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#f8fafc] border-b border-[#cbd5e1] text-[#475569] font-medium shadow-sm">
              <th className="p-1.5 px-2 border-r border-[#cbd5e1] w-8 text-center sticky left-0 bg-[#f8fafc] z-30"></th>
              {COLUMNS.map((col, idx) => (
                <th key={col.key} className={`p-1.5 px-2 border-r border-[#cbd5e1] ${col.type === 'number' ? 'num text-right' : ''}`} style={{ width: col.width }}>
                  {col.title}
                </th>
              ))}
              <th className="p-1.5 px-2 border-r border-[#cbd5e1] num text-right w-20">Totalt (kr)</th>
              <th className="p-1.5 px-2 border-r border-[#cbd5e1] num text-right w-20">CO2e (kg)</th>
              <th className="p-1.5 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {moments.map((m: any, rowIdx: number) => {
              const errors = getValidationErrors(m);
              const hasError = errors.length > 0;
              
              const mat = materialsMap.get(m.material);
              const spill = mat ? (1 + (mat.spill || 0) / 100) : 1;
              const rowCo2 = mat && mat.co2 ? (m.amount || 0) * bQty * mat.co2 * spill : 0;
              const rowCost = m.cost || 0; // Pre-calculated from useCalculation

              sumCost += rowCost;
              sumCo2 += rowCo2;

              return (
                <tr key={rowIdx} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9] group">
                  <td className="p-1.5 px-2 border-r border-[#e2e8f0] text-center bg-gray-50 sticky left-0 z-10 flex items-center justify-center h-full">
                    <span className="text-gray-400 text-[10px]">{rowIdx + 1}</span>
                    {hasError && (
                      <i className="fa-solid fa-triangle-exclamation text-amber-500 ml-1 text-[10px]" title={errors.join('\n')}></i>
                    )}
                  </td>
                  {COLUMNS.map((col, colIdx) => {
                    const isActive = activeCell?.row === rowIdx && activeCell?.col === colIdx;
                    const isEditing = isActive && editMode;
                    const val = m[col.key];

                    return (
                      <td 
                        key={col.key} 
                        className={`p-1 px-2 border-r border-[#e2e8f0] cursor-pointer ${col.type === 'number' ? 'num text-right bg-[#f8fafc]' : ''} ${isActive ? (isEditing ? 'bg-white ring-2 ring-blue-500 ring-inset outline-none' : 'bg-blue-100 outline-none ring-1 ring-blue-400 ring-inset') : ''}`}
                        onClick={() => {
                          if (isActive && !editMode) {
                            setEditValue(val?.toString() || '');
                            setEditMode(true);
                          } else {
                            setActiveCell({ row: rowIdx, col: colIdx });
                            setEditMode(false);
                          }
                        }}
                        onDoubleClick={() => {
                          setActiveCell({ row: rowIdx, col: colIdx });
                          setEditValue(val?.toString() || '');
                          setEditMode(true);
                        }}
                      >
                        {isEditing ? (
                          col.type === 'select' ? (
                            <select
                              ref={inputRef as React.RefObject<HTMLSelectElement>}
                              className="w-full bg-transparent outline-none h-full min-w-[100px]"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={handleInputKeyDown}
                            >
                              <option value="">(Inget material)</option>
                              {materials.map(mat => (
                                <option key={mat.name} value={mat.name}>{mat.name} ({mat.unit})</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type={col.type === 'number' ? 'text' : 'text'}
                              className={`w-full bg-transparent outline-none h-full ${col.type === 'number' ? 'text-right' : ''}`}
                              value={editValue}
                              placeholder={col.key === 'unitPrice' && mat ? mat.price.toString() : ''}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={handleInputKeyDown}
                            />
                          )
                        ) : (
                          <span className={`w-full inline-block truncate select-none ${col.key === 'unitPrice' && val === undefined ? 'text-gray-400 italic' : ''}`}>
                            {col.type === 'number' 
                              ? (typeof val === 'number' 
                                ? val.toLocaleString('sv-SE', { maximumFractionDigits: 3 }) 
                                : (col.key === 'unitPrice' && mat ? mat.price.toLocaleString('sv-SE', { maximumFractionDigits: 3 }) : '')) 
                              : (val || '')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-1 px-2 border-r border-[#e2e8f0] num text-right font-medium text-gray-700 bg-gray-50">{Math.round(rowCost).toLocaleString('sv-SE')}</td>
                  <td className="p-1 px-2 border-r border-[#e2e8f0] num text-right text-green-700 font-medium bg-gray-50">{Math.round(rowCo2).toLocaleString('sv-SE')}</td>
                  <td className="p-1 px-2 text-center bg-[#f8fafc] flex gap-1 justify-center items-center h-full">
                    <IconButton 
                      className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={(e) => { e.stopPropagation(); duplicateMoment(byggdelId, rowIdx); }} 
                      title="Duplicera rad" 
                      icon="copy" 
                    />
                    {m.material && m.unitPrice !== undefined && (
                      <IconButton 
                        className="text-gray-400 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={(e) => { e.stopPropagation(); updateMaterialPrice(m.material, m.unitPrice); }} 
                        title="Spara à-pris till register" 
                        icon="save" 
                      />
                    )}
                    <IconButton 
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={(e) => { e.stopPropagation(); removeMoment(byggdelId, rowIdx); }} 
                      title="Ta bort rad" 
                      icon="close" 
                    />
                  </td>
                </tr>
              );
            })}
            {moments.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 4} className="p-4 text-center text-gray-500 italic">
                  Inga rader skapade i denna byggdel. Tryck på "Lägg till resurs" för att börja.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-20">
            <tr className="bg-[#f1f5f9] border-t-2 border-[#94a3b8] text-[#334155] font-bold shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
              <td colSpan={COLUMNS.length + 1} className="p-1.5 px-2 text-right">Delsumma (Totalt):</td>
              <td className="p-1.5 px-2 num text-right text-blue-800">{Math.round(sumCost).toLocaleString('sv-SE')} kr</td>
              <td className="p-1.5 px-2 num text-right text-green-800">{Math.round(sumCo2).toLocaleString('sv-SE')} kg</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
