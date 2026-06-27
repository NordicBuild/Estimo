import React, { useState } from 'react';
import { ResponsiveDialog } from '../../components/Modals/ResponsiveDialog';
import { DbOffert } from '../api';

export interface ReferensPost {
  key: string;
  benamning: string;
  mangd: number;
  enhet: string;
  kalkylAPris: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (offert: Partial<DbOffert>) => Promise<void>;
  referensLista: ReferensPost[];
}

export function NyOffertModal({ isOpen, onClose, onSave, referensLista }: Props) {
  const [leverantor, setLeverantor] = useState('');
  const [typ, setTyp] = useState<'ue' | 'leverantor'>('leverantor');
  const [valuta, setValuta] = useState('SEK');
  const [giltigTill, setGiltigTill] = useState('');
  const [fastTillagg, setFastTillagg] = useState(0);
  const [poster, setPoster] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handlePrisChange = (key: string, value: string) => {
    setPoster((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedPoster: Record<string, number> = {};
      for (const [key, val] of Object.entries(poster)) {
        if (val.trim() !== '') {
          const num = parseFloat(val.replace(',', '.'));
          if (!isNaN(num)) {
            parsedPoster[key] = num;
          }
        }
      }

      await onSave({
        leverantor,
        typ,
        valuta,
        giltig_till: giltigTill || null,
        fast_tillagg: fastTillagg,
        poster: parsedPoster,
        status: 'inkommen',
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onClose={onClose} title="Ny offert">
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
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
          <div>
            <label className="block text-sm font-medium mb-1">Valuta</label>
            <input
              type="text"
              value={valuta}
              onChange={(e) => setValuta(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Giltig till</label>
            <input
              type="date"
              value={giltigTill}
              onChange={(e) => setGiltigTill(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fast tillägg (Summa)</label>
            <input
              type="number"
              step="0.01"
              value={fastTillagg}
              onChange={(e) => setFastTillagg(parseFloat(e.target.value) || 0)}
              className="input w-full"
            />
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-bold mb-2">Prissätt referensposter</h4>
          <p className="text-xs text-gray-500 mb-2">Lämna fältet tomt om posten inte är prissatt.</p>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Benämning</th>
                  <th className="p-2 num">Mängd</th>
                  <th className="p-2">Enhet</th>
                  <th className="p-2 num">Kalkyl à-pris</th>
                  <th className="p-2">Offert à-pris</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {referensLista.map((post) => (
                  <tr key={post.key} className="hover:bg-gray-50">
                    <td className="p-2">{post.benamning}</td>
                    <td className="p-2 num">{post.mangd}</td>
                    <td className="p-2 text-xs text-gray-500">{post.enhet}</td>
                    <td className="p-2 num">{post.kalkylAPris.toFixed(2)}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={poster[post.key] || ''}
                        onChange={(e) => handlePrisChange(post.key, e.target.value)}
                        className="input w-full py-1 text-right"
                        placeholder="à-pris"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Avbryt
          </button>
          <button type="submit" disabled={saving || !leverantor} className="btn btn-primary">
            {saving ? 'Sparar...' : 'Spara offert'}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
