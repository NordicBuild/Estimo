import React, { useState, useEffect } from "react";
import { UserSettings, INITIAL_USER_SETTINGS } from "../data";
import { supabase } from "../supabase";

interface Props {
  userSettings?: UserSettings;
  setUserSettings?: React.Dispatch<React.SetStateAction<UserSettings>>;
}

export function AdminInstallningarTab({ userSettings = INITIAL_USER_SETTINGS, setUserSettings }: Props) {
  const [defaultVat, setDefaultVat] = useState(0.25);
  const [defaultCurrency, setDefaultCurrency] = useState("SEK");
  const [defaultMargin, setDefaultMargin] = useState(0.15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    loadPlatformSettings();
  }, []);

  const loadPlatformSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setDefaultVat(Number(data.default_vat));
        setDefaultCurrency(data.default_currency);
        setDefaultMargin(Number(data.default_margin));
      }
    } catch (e: any) {
      console.error("Fel vid hämtning av platform_settings", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlatformSettings = async () => {
    setSaving(true);
    setNotification(null);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          id: 1,
          default_vat: defaultVat,
          default_currency: defaultCurrency,
          default_margin: defaultMargin
        });
        
      if (error) throw error;
      setNotification({ message: "Plattformsinställningar sparade", type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (e: any) {
      console.error("Fel vid sparning av platform_settings", e);
      setNotification({ message: "Kunde inte spara inställningar", type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laddar inställningar...</div>;
  }
  
  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {notification && (
        <div className={`mb-4 p-3 rounded text-sm ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {notification.message}
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4 flex items-center">
        <i className="fa-solid fa-globe mr-2 text-[var(--blue)]"></i>
        Plattformsinställningar (Globala)
      </h2>
      <div className="bg-white border md:p-8 p-6 border-[var(--border)] rounded-lg shadow-sm mb-6">
        <div className="space-y-6 max-w-2xl">
          <p className="text-sm text-gray-500 mb-4">
            Dessa inställningar gäller övergripande för plattformen och används som förval.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">
                Standardmoms (Moms)
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(defaultVat * 100)}
                  onChange={(e) => setDefaultVat(Number(e.target.value) / 100)}
                  className="border rounded px-3 py-2 w-32 outline-none focus:border-[var(--blue)] transition-colors"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Används som förval för nya fakturor och nya projekt (DEL E).
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">
                Standardvaluta
              </h3>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              >
                <option value="SEK">SEK (Svensk Krona)</option>
                <option value="NOK">NOK (Norsk Krona)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Amerikansk Dollar)</option>
              </select>
              <p className="text-xs text-gray-400 mt-2">
                Den valuta som är förvald om inget annat anges.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">
                Standard Marginal
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(defaultMargin * 100)}
                  onChange={(e) => setDefaultMargin(Number(e.target.value) / 100)}
                  className="border rounded px-3 py-2 w-32 outline-none focus:border-[var(--blue)] transition-colors"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Grundförval för marginal över hela plattformen.
              </p>
            </div>
          </div>
          
          <div className="pt-4 mt-2">
            <button
              onClick={handleSavePlatformSettings}
              disabled={saving}
              className="bg-[var(--blue)] hover:bg-blue-600 text-white px-6 py-2 rounded shadow-sm text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Sparar...' : 'Spara plattformsinställningar'}
            </button>
          </div>
          
          <hr className="my-6 border-gray-100" />
          
          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-2">
              Utvecklarläge
            </h3>
            <button
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
              onClick={() => {
                if (
                  confirm(
                    "Är du säker? Detta raderar all lokalt sparad data."
                  )
                ) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
            >
              Töm lokal cache (LocalStorage)
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Detta återställer inställningar för enheten, men behåller data
              sparat i molnet.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">
        <i className="fa-solid fa-user-gear mr-2 text-[var(--blue)]"></i>Personliga Inställningar
      </h2>
      <div className="bg-white border md:p-8 p-6 border-[var(--border)] rounded-lg shadow-sm">
        <div className="space-y-6 max-w-2xl">
          <p className="text-sm text-gray-500">
            Dessa inställningar appliceras automatiskt på alla nya projekt som du skapar.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">
                Språkval
              </h3>
              <select
                value={userSettings.language}
                onChange={(e) => setUserSettings?.(prev => ({ ...prev, language: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              >
                <option value="sv">Svenska</option>
                <option value="en">Engelska (English)</option>
                <option value="no">Norska (Norsk)</option>
              </select>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">
                Föredragen Valuta
              </h3>
              <select
                value={userSettings.currency}
                onChange={(e) => setUserSettings?.(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              >
                <option value="SEK">SEK (Svensk Krona)</option>
                <option value="NOK">NOK (Norsk Krona)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Amerikansk Dollar)</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">
                Standard-marginalpåslag
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(userSettings.defaultMargin * 100)}
                  onChange={(e) => setUserSettings?.(prev => ({ ...prev, defaultMargin: Number(e.target.value) / 100 }))}
                  className="border rounded px-3 py-2 w-32 outline-none focus:border-[var(--blue)] transition-colors"
                />
                <span className="text-sm text-gray-500">%</span>
                <span className="text-xs text-gray-400 ml-2">Används som förvalt material- och arbetspåslag för nya projekt</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
