import React, { useState, useMemo } from 'react';
import { Byggdel } from '../data';
import { BIMElement } from '../stores/useBIMStore';
import { calculateDefaultMoments } from '../calculationHelpers';
import { X, CheckCircle, Calculator } from 'lucide-react';

interface BIMAddToBOQModalProps {
  isOpen: boolean;
  selectedElements: BIMElement[];
  onConfirm: (byggdelar: Omit<Byggdel, 'id'>[]) => void;
  onCancel: () => void;
}

const IFC_TO_BYGGDELTYP: Record<string, string> = {
  'IfcWall': '31.2_Vägg',
  'IfcWallStandardCase': '31.2_Vägg',
  'IfcSlab': '34.1_Bjalklag',
  'IfcBeam': '32.2_Balk',
  'IfcColumn': '32.1_Pelare',
  'IfcStair': '35.1_Trappa',
  'IfcFooting': '30.1_Fundament',
  'IfcDoor': '43.1_Dörr',
  'IfcWindow': '41.1_Fönster',
  'IfcRoof': '36.1_Yttertak',
};

const AVAILABLE_TYPES = [
  '20_Generell_Byggdel',
  '31.2_Vägg',
  '34.1_Bjalklag',
  '32.2_Balk',
  '32.1_Pelare',
  '35.1_Trappa',
  '30.1_Fundament',
  '43.1_Dörr',
  '41.1_Fönster',
  '36.1_Yttertak'
];

function getQuantity(el: BIMElement): { qty: number, unit: string } {
  const props = el.properties || {};
  
  if (props.Area) return { qty: Number(props.Area), unit: 'm²' };
  if (props.NetArea) return { qty: Number(props.NetArea), unit: 'm²' };
  if (props.NetSideArea) return { qty: Number(props.NetSideArea), unit: 'm²' };
  
  if (props.Volume) return { qty: Number(props.Volume), unit: 'm³' };
  if (props.NetVolume) return { qty: Number(props.NetVolume), unit: 'm³' };

  if (props.Length) return { qty: Number(props.Length), unit: 'm' };
  
  return { qty: 1, unit: 'st' }; 
}

export function BIMAddToBOQModal({ isOpen, selectedElements, onConfirm, onCancel }: BIMAddToBOQModalProps) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize overrides for elements if they are selected
  // Calculate summary
  const { summary, totalCount } = useMemo(() => {
    const sum: Record<string, { qty: number, unit: string, count: number }> = {};
    let total = 0;

    selectedElements.forEach(el => {
      const elId = el.id || el.guid;
      const type = overrides[elId] || IFC_TO_BYGGDELTYP[el.category || ''] || '20_Generell_Byggdel';
      const { qty, unit } = getQuantity(el);

      if (!sum[type]) {
        sum[type] = { qty: 0, unit, count: 0 };
      }
      
      sum[type].qty += qty;
      sum[type].count += 1;
      total++;
    });

    return { summary: Object.entries(sum), totalCount: total };
  }, [selectedElements, overrides]);

  if (!isOpen) return null;

  const handleTypeChange = (elementId: string, newType: string) => {
    setOverrides(prev => ({ ...prev, [elementId]: newType }));
  };

  const handleConfirm = () => {
    setIsProcessing(true);
    
    // Simulate slight delay for large selections
    setTimeout(() => {
      const groups: Record<string, { qty: number, unit: string, elements: BIMElement[], dims: any }> = {};

      selectedElements.forEach(el => {
        const elId = el.id || el.guid;
        const type = overrides[elId] || IFC_TO_BYGGDELTYP[el.category || ''] || '20_Generell_Byggdel';
        const { qty, unit } = getQuantity(el);

        if (!groups[type]) {
          groups[type] = { qty: 0, unit, elements: [], dims: { area: 10, length: 0, volume: 0, qty: 0 } };
        }
        
        groups[type].qty += qty;
        groups[type].elements.push(el);
        
        // Simple heuristic for dimensions
        if (unit === 'm²') groups[type].dims.area += qty;
        else if (unit === 'm') groups[type].dims.length += qty;
        else if (unit === 'm³') groups[type].dims.volume += qty;
        else groups[type].dims.qty += qty;
      });

      const newByggdelar: Omit<Byggdel, 'id'>[] = Object.entries(groups).map(([type, data]) => {
        // Ensure quantity is not zero
        const finalQty = data.qty > 0 ? Number(data.qty.toFixed(2)) : 1;
        // Fix up area if it is 0 and it was not set by area
        const dims = { ...data.dims, area: data.dims.area > 0 ? data.dims.area : 10 };
        
        return {
          name: `BIM: ${type.replace(/^[0-9.]+_/, '')}`,
          type: type,
          qty: finalQty,
          active: true,
          comment: `Skapad från BIM-modell (${data.elements.length} objekt)`,
          moments: calculateDefaultMoments(type, dims)
        };
      });

      onConfirm(newByggdelar);
      setIsProcessing(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-w-[90vw] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Add Elements to BOQ
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" disabled={isProcessing}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Element Name</th>
                  <th className="px-4 py-3 font-medium">IFC Class</th>
                  <th className="px-4 py-3 font-medium">Suggested Type</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedElements.map(el => {
                  const elId = el.id || el.guid;
                  const currentType = overrides[elId] || IFC_TO_BYGGDELTYP[el.category || ''] || '20_Generell_Byggdel';
                  const { qty, unit } = getQuantity(el);

                  return (
                    <tr key={elId} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800 truncate max-w-[200px]" title={el.name}>{el.name}</td>
                      <td className="px-4 py-2 text-gray-500">{el.category || 'Unknown'}</td>
                      <td className="px-4 py-2">
                        <select 
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5"
                          value={currentType}
                          onChange={(e) => handleTypeChange(elId, e.target.value)}
                        >
                          {AVAILABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          {!AVAILABLE_TYPES.includes(currentType) && <option value={currentType}>{currentType}</option>}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">{Number(qty.toFixed(2))}</td>
                      <td className="px-4 py-2 text-gray-500">{unit}</td>
                    </tr>
                  );
                })}
                {selectedElements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">No elements selected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Summary</h3>
            <p className="text-sm text-blue-700 mb-3">
              Creating <span className="font-bold">{summary.length}</span> byggdelar from {totalCount} selected elements:
            </p>
            <ul className="space-y-1 text-sm text-blue-800">
              {summary.map(([type, data]) => (
                <li key={type} className="flex justify-between items-center bg-white bg-opacity-60 px-3 py-1.5 rounded-md border border-blue-100">
                  <span className="font-medium">{type}</span>
                  <span>{data.qty > 0 ? Number(data.qty.toFixed(2)) : 1} {data.unit} <span className="text-blue-400">({data.count} items)</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
            disabled={isProcessing || selectedElements.length === 0}
          >
            {isProcessing ? (
              <>Creating {summary.length} byggdelar...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Add to Kalkyl</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
