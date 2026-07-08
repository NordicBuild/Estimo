import React, { useState, useEffect, useCallback } from 'react';
import { Byggdel } from '../data';
import { listUtfall, saveUtfall, DbUtfall } from '../eac/utfallApi';

interface Props {
  byggdelar: Byggdel[];
  projectId: string;
  companyId: string;
}

export function UtfallInmatning({ byggdelar, projectId, companyId }: Props) {
  const [utfall, setUtfall] = useState<Record<string, DbUtfall>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !projectId) return;
    
    setLoading(true);
    listUtfall(companyId, projectId).then(data => {
      const map: Record<string, DbUtfall> = {};
      data.forEach(d => {
        map[d.line_key] = d;
      });
      setUtfall(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId, projectId]);

  const handleUpdate = (line_key: string, field: 'ac' | 'fardiggrad' | 'manuell_eac', value: number | null) => {
    setUtfall(prev => {
      const ex = prev[line_key] || { company_id: companyId, project_id: projectId, line_key, ac: null, fardiggrad: null, manuell_eac: null };
      const updated = { ...ex, [field]: value };
      
      // Debounced save
      debounceSave(updated);
      
      return { ...prev, [line_key]: updated };
    });
  };

  const [saveTimers, setSaveTimers] = useState<Record<string, NodeJS.Timeout>>({});

  const debounceSave = useCallback((u: DbUtfall) => {
    setSaveTimers(prev => {
      if (prev[u.line_key]) clearTimeout(prev[u.line_key]);
      
      const timer = setTimeout(() => {
        saveUtfall(u).catch(() => {});
      }, 500);
      
      return { ...prev, [u.line_key]: timer };
    });
  }, []);

  if (loading) {
    return <div className="text-gray-500 p-4">Laddar utfall...</div>;
  }

  if (!byggdelar || byggdelar.length === 0) {
    return <div className="text-gray-500 p-4 text-sm">Inga kalkylposter finns i projektet ännu.</div>;
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden mt-6">
      <div className="bg-[var(--surface2)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
        <h2 className="text-lg font-bold text-[var(--text2)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--blue)] text-[20px]">analytics</span> Ekonomiskt utfall / EAC (per post)
        </h2>
      </div>
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-[var(--border)]">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">Byggdel</th>
              <th className="px-4 py-3 font-semibold text-gray-600">AC (Utfall kr)</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Färdiggrad (%)</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Manuell EAC (kr)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {byggdelar.map(b => {
              const u = utfall[b.id.toString()] || { ac: '', fardiggrad: '', manuell_eac: '' };
              const fgDisplay = u.fardiggrad !== null && u.fardiggrad !== undefined && u.fardiggrad !== '' ? (Number(u.fardiggrad) * 100) : '';
              return (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 font-medium text-gray-900">{b.name}</td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={u.ac !== null ? u.ac : ''}
                      onChange={e => handleUpdate(b.id.toString(), 'ac', e.target.value === '' ? null : Number(e.target.value))}
                      className="w-24 border rounded px-2 py-1 text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      step="1"
                      min="0"
                      max="100"
                      value={fgDisplay}
                      onChange={e => handleUpdate(b.id.toString(), 'fardiggrad', e.target.value === '' ? null : Number(e.target.value) / 100)}
                      className="w-20 border rounded px-2 py-1 text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={u.manuell_eac !== null ? u.manuell_eac : ''}
                      onChange={e => handleUpdate(b.id.toString(), 'manuell_eac', e.target.value === '' ? null : Number(e.target.value))}
                      className="w-24 border rounded px-2 py-1 text-right"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
