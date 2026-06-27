import React, { useState, useRef } from 'react';
import * as xlsx from 'xlsx';
import { ResponsiveDialog } from '../../components/Modals/ResponsiveDialog';
import { DbOffert } from '../api';
import { ReferensPost } from './NyOffertModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (offert: Partial<DbOffert>) => Promise<void>;
  referensLista: ReferensPost[];
}

export function ImportOffertModal({ isOpen, onClose, onSave, referensLista }: Props) {
  const [leverantor, setLeverantor] = useState('');
  const [typ, setTyp] = useState<'ue' | 'leverantor'>('leverantor');
  
  const [fileData, setFileData] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colKod, setColKod] = useState<string>('');
  const [colPris, setColPris] = useState<string>('');
  
  const [mapping, setMapping] = useState<Record<string, { pris: number; excelMatch: string }>>({});
  const [unmapped, setUnmapped] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (typeof bstr !== 'string') return;
      
      const wb = xlsx.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = xlsx.utils.sheet_to_json(ws);
      
      if (data.length > 0) {
        setFileData(data);
        const keys = Object.keys(data[0] as object);
        setHeaders(keys);
        setColKod(keys[0] || '');
        setColPris(keys.length > 1 ? keys[1] : keys[0] || '');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMap = () => {
    if (!fileData) return;

    const newMapping: Record<string, { pris: number; excelMatch: string }> = {};
    const unmappedRows: any[] = [];

    const excelRows = fileData.map(row => ({
      kod: String(row[colKod] || '').trim(),
      pris: parseFloat(String(row[colPris] || '').replace(',', '.')) || 0,
      original: row
    })).filter(r => r.kod || r.pris > 0);

    // Track which excel rows are used
    const usedExcelRows = new Set<number>();

    // 1. Exact match on key (id)
    referensLista.forEach((ref) => {
      const exactIndex = excelRows.findIndex((er, i) => !usedExcelRows.has(i) && er.kod.toLowerCase() === ref.key.toLowerCase());
      if (exactIndex !== -1) {
        newMapping[ref.key] = { pris: excelRows[exactIndex].pris, excelMatch: excelRows[exactIndex].kod };
        usedExcelRows.add(exactIndex);
      }
    });

    // 2. Fuzzy match on benamning
    referensLista.forEach((ref) => {
      if (newMapping[ref.key]) return; // already matched

      const fuzzyIndex = excelRows.findIndex((er, i) => {
        if (usedExcelRows.has(i)) return false;
        // Simple fuzzy: excel kod is included in benamning or vice versa
        const el = er.kod.toLowerCase();
        const bl = ref.benamning.toLowerCase();
        return el && bl && (el.includes(bl) || bl.includes(el));
      });

      if (fuzzyIndex !== -1) {
        newMapping[ref.key] = { pris: excelRows[fuzzyIndex].pris, excelMatch: excelRows[fuzzyIndex].kod };
        usedExcelRows.add(fuzzyIndex);
      }
    });

    excelRows.forEach((er, i) => {
      if (!usedExcelRows.has(i)) {
        unmappedRows.push(er);
      }
    });

    setMapping(newMapping);
    setUnmapped(unmappedRows);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const poster: Record<string, number> = {};
      for (const [key, mapData] of Object.entries(mapping)) {
        if (mapData.pris > 0) {
          poster[key] = mapData.pris;
        }
      }

      await onSave({
        leverantor,
        typ,
        valuta: 'SEK',
        status: 'inkommen',
        poster,
        fast_tillagg: 0,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onClose={onClose} title="Importera offert">
      <div className="p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Leverantör *</label>
            <input
              required
              type="text"
              value={leverantor}
              onChange={(e) => setLeverantor(e.target.value)}
              className="input w-full"
              placeholder="Företagsnamn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Typ</label>
            <select value={typ} onChange={(e) => setTyp(e.target.value as 'ue' | 'leverantor')} className="input w-full">
              <option value="leverantor">Leverantör</option>
              <option value="ue">Underentreprenör (UE)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Excel-fil (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="input w-full"
          />
        </div>

        {fileData && (
          <div className="bg-gray-50 p-4 rounded-md border mt-2">
            <h4 className="font-bold mb-2">Välj kolumner</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1">Kolumn för Kod/Benämning</label>
                <select value={colKod} onChange={e => setColKod(e.target.value)} className="input w-full py-1">
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kolumn för à-pris</label>
                <select value={colPris} onChange={e => setColPris(e.target.value)} className="input w-full py-1">
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleMap} className="btn btn-secondary w-full">Kör matchning</button>
          </div>
        )}

        {Object.keys(mapping).length > 0 && (
          <div className="mt-4">
            <h4 className="font-bold mb-2 text-green-700">Matchade poster ({Object.keys(mapping).length})</h4>
            <div className="border rounded-md overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2">Referens</th>
                    <th className="p-2">Hittad kod (Excel)</th>
                    <th className="p-2 num">À-pris</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(mapping).map(([key, mapData]) => {
                    const ref = referensLista.find(r => r.key === key);
                    return (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="p-2 text-xs truncate max-w-[150px]" title={ref?.benamning}>{ref?.benamning}</td>
                        <td className="p-2 text-xs truncate max-w-[150px]">{mapData.excelMatch}</td>
                        <td className="p-2 num font-semibold">{mapData.pris}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {unmapped.length > 0 && (
          <div className="mt-4">
            <h4 className="font-bold mb-2 text-red-600">Omappade rader från Excel ({unmapped.length})</h4>
            <div className="border border-red-200 rounded-md overflow-hidden max-h-40 overflow-y-auto bg-red-50">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-red-200">
                  {unmapped.map((u, i) => (
                    <tr key={i}>
                      <td className="p-2 text-xs">{u.kod}</td>
                      <td className="p-2 num">{u.pris}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Avbryt
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={saving || !leverantor || Object.keys(mapping).length === 0} 
            className="btn btn-primary"
          >
            {saving ? 'Sparar...' : 'Spara import'}
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
