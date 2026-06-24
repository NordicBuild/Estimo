import React, { useState } from "react";
import { UserSettings, INITIAL_USER_SETTINGS } from "../data";

interface Props {
  userSettings?: UserSettings;
  setUserSettings?: React.Dispatch<React.SetStateAction<UserSettings>>;
}

export function AdminInstallningarTab({ userSettings = INITIAL_USER_SETTINGS, setUserSettings }: Props) {
  const [moms, setMoms] = useState(25);
  
  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">
        <i className="fa-solid fa-gear mr-2 text-[var(--blue)]"></i>Globala
        Inställningar
      </h2>
      <div className="bg-white border md:p-8 p-6 border-[var(--border)] rounded-lg shadow-sm mb-6">
        <div className="space-y-6 max-w-2xl">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-2">
              Standard värden (Moms)
            </h3>
            <input
              type="number"
              value={moms}
              onChange={(e) => setMoms(Number(e.target.value))}
              className="border rounded px-3 py-2 w-32 outline-none focus:border-[var(--blue)] transition-colors"
            />{" "}
            <span className="text-sm text-gray-500 ml-2">%</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-2">
              Utvecklarläge
            </h3>
            <button
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
              onClick={() => {
                if (
                  confirm(
                    "Är du säker? Detta raderar all lokalt sparad data.",
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
