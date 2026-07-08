import React from 'react';
import { CalculationResult } from '../useCalculation';

interface Settings {
  fTim: number;
  fOrg: number;
  fForbr: number;
  fMaskin: number;
  fTrakt: number;
  vMatP: number;
  vArbP: number;
  tRate: number; // Internal hourly rate used
  mRate: number; // Machine rate
  trRate: number; // Trak rate
  timeFactor?: number; // Overall time percentage factor (def=1.0)
}

interface Props {
  settings: Settings;
  setSettings: (s: Settings) => void;
  calcResult: CalculationResult;
}

export function SlutsidaTab({ settings, setSettings, calcResult }: Props) {
  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  const updateSetting = (key: keyof Settings, value: number) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 my-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PARAMS LIST */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon tracking-wider text-white bg-[var(--blue-dk)]"><i className="fa-solid fa-sliders"></i></div>
            <span className="card-title">Kalkylparametrar & Påslag</span>
          </div>
          <div className="p-6 grid gap-6">
            
            <section>
               <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--blue)] border-b border-[var(--blue-lt)] pb-1 mb-3">Arbetskostnad & Timpris</h3>
               <div className="grid gap-3">
                 <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text2)]">Arbetartimpenning (snittpris kr/h)</div>
                      <div className="text-[0.65rem] text-[var(--text3)]">Lön + sociala avgifter inkl GL (grundlön)</div>
                    </div>
                    <input type="number" 
                      className="w-24 text-right border border-[var(--border)] focus:border-[var(--blue)] rounded px-2 py-1.5 font-mono"
                      value={settings.tRate}
                      onChange={e => updateSetting('tRate', parseFloat(e.target.value) || 0)}
                    />
                 </div>
               </div>
            </section>

            <section>
               <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--blue)] border-b border-[var(--blue-lt)] pb-1 mb-3">Gemensamma Omkostnader (%)</h3>
               <div className="grid gap-3">
                 <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text2)]">Företagsomkostnad (FO) %</div>
                      <div className="text-[0.65rem] text-[var(--text3)]">Tjänstemän, kontor, central administration</div>
                    </div>
                    <div className="relative">
                      <input type="number" step="1"
                        className="w-24 text-right border border-[var(--border)] focus:border-[var(--blue)] rounded pl-2 pr-6 py-1.5 font-mono"
                        value={Math.round(settings.fOrg * 100)}
                        onChange={e => updateSetting('fOrg', (parseFloat(e.target.value) || 0) / 100)}
                      />
                      <span className="absolute right-2 text-[var(--text3)] top-1/2 -translate-y-1/2 font-mono">%</span>
                    </div>
                 </div>
                 <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text2)]">Förbrukningsmtrl / Småmaskiner %</div>
                      <div className="text-[0.65rem] text-[var(--text3)]">Påslag på direkt material</div>
                    </div>
                    <div className="relative">
                      <input type="number" step="1"
                        className="w-24 text-right border border-[var(--border)] focus:border-[var(--blue)] rounded pl-2 pr-6 py-1.5 font-mono"
                        value={Math.round(settings.fForbr * 100)}
                        onChange={e => updateSetting('fForbr', (parseFloat(e.target.value) || 0) / 100)}
                      />
                      <span className="absolute right-2 text-[var(--text3)] top-1/2 -translate-y-1/2 font-mono">%</span>
                    </div>
                 </div>
               </div>
            </section>

            <section>
               <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--blue)] border-b border-[var(--blue-lt)] pb-1 mb-3">Produktionshjälpmedel (kr/h)</h3>
               <div className="grid gap-3">
                 <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text2)]">Maskin & Utrustning (kr/h)</div>
                      <div className="text-[0.65rem] text-[var(--text3)]">Kran, pump, bodar, lyft per arbetad timme</div>
                    </div>
                    <input type="number" 
                      className="w-24 text-right border border-[var(--border)] focus:border-[var(--blue)] rounded px-2 py-1.5 font-mono"
                      value={settings.mRate}
                      onChange={e => updateSetting('mRate', parseFloat(e.target.value) || 0)}
                    />
                 </div>
                 <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text2)]">Etablering / Traktamente (kr/h)</div>
                      <div className="text-[0.65rem] text-[var(--text3)]">Resor, boende schablon per timme</div>
                    </div>
                    <input type="number" 
                      className="w-24 text-right border border-[var(--border)] focus:border-[var(--blue)] rounded px-2 py-1.5 font-mono"
                      value={settings.trRate}
                      onChange={e => updateSetting('trRate', parseFloat(e.target.value) || 0)}
                    />
                 </div>
                 
                 <div className="flex items-center justify-between p-3 bg-white border border-[var(--border)] rounded-md border-l-4 border-l-purple-500">
                    <div>
                      <div className="text-sm font-semibold text-[var(--purple)]">Genomsnittlig Objektfaktor (%)</div>
                      <div className="text-[0.65rem] text-[var(--text3)]">Beräknat snittverk baserat på byggdelar (100% = normalt)</div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-20 text-right bg-gray-50 text-gray-700 border border-[var(--border)] rounded px-2 py-1.5 font-mono cursor-not-allowed">
                        {(calcResult.avgObjFactor * 100).toLocaleString('sv-SE', { maximumFractionDigits: 0 })}
                      </div>
                      <span className="ml-2 font-mono text-[var(--text2)]">%</span>
                    </div>
                 </div>
               </div>
            </section>

            <section>
               <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--blue)] border-b border-[var(--blue-lt)] pb-1 mb-3">Vinst & Risk (%)</h3>
               <div className="grid gap-3">
                 <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text2)]">Vinstpåslag Material %</div>
                    </div>
                    <div className="relative">
                      <input type="number" step="1"
                        className="w-24 text-right border border-[var(--border)] focus:border-[var(--blue)] rounded pl-2 pr-6 py-1.5 font-mono"
                        value={Math.round(settings.vMatP * 100)}
                        onChange={e => updateSetting('vMatP', (parseFloat(e.target.value) || 0) / 100)}
                      />
                      <span className="absolute right-2 text-[var(--text3)] top-1/2 -translate-y-1/2 font-mono">%</span>
                    </div>
                 </div>
                 <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text2)]">Vinstpåslag Arbete / Omkostnad %</div>
                    </div>
                    <div className="relative">
                      <input type="number" step="1"
                        className="w-24 text-right border border-[var(--border)] focus:border-[var(--blue)] rounded pl-2 pr-6 py-1.5 font-mono"
                        value={Math.round(settings.vArbP * 100)}
                        onChange={e => updateSetting('vArbP', (parseFloat(e.target.value) || 0) / 100)}
                      />
                      <span className="absolute right-2 text-[var(--text3)] top-1/2 -translate-y-1/2 font-mono">%</span>
                    </div>
                 </div>
               </div>
            </section>

          </div>
        </div>

        {/* SAMMANFATTNING LIVE */}
        <div className="flex flex-col gap-6">
          <div className="card border-none bg-gradient-to-b from-[var(--surface2)] to-[var(--surface3)] relative overflow-hidden">
             {/* Decorative */}
             <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--blue)] opacity-5 rounded-full blur-2xl"></div>
             
             <div className="p-6">
                <h2 className="text-lg font-extrabold tracking-tight mb-6 flex items-center gap-2">
                   <i className="fa-solid fa-calculator text-[var(--blue)]"></i> Effekt i Kalkyl
                </h2>
                
                <div className="grid gap-4 text-sm font-medium">
                  <div className="flex justify-between pb-2 border-b border-[var(--border2)]">
                    <span className="text-[var(--text2)]">Direkt Material</span>
                    <span className="font-mono">{formatKr(calcResult.totMat)}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[var(--border2)]">
                    <span className="text-[var(--text2)]">Direkt Arbete ({calcResult.totTim.toLocaleString('sv-SE', { maximumFractionDigits: 0 })}h)</span>
                    <span className="font-mono">{formatKr(calcResult.totArb)}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[var(--border2)]">
                    <span className="text-[var(--text2)] pl-4 border-l-2 border-[var(--blue-lt)]">Företagsomkostnad (FO)</span>
                    <span className="font-mono">{formatKr(calcResult.omkOrg)}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[var(--border2)]">
                     <span className="text-[var(--text2)] pl-4 border-l-2 border-[var(--blue-lt)]">Förbrukningsmtrl (FU)</span>
                     <span className="font-mono">{formatKr(calcResult.omkForbr)}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[var(--border2)]">
                     <span className="text-[var(--text2)] pl-4 border-l-2 border-[var(--blue-lt)]">Maskiner & Utrustning</span>
                     <span className="font-mono">{formatKr(calcResult.omkMaskin)}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[var(--border2)] text-lg border-t-2 border-gray-400 mt-2 font-bold">
                     <span>Produktionsnetto</span>
                     <span className="font-mono">{formatKr(calcResult.projNetto)}</span>
                  </div>
                  
                  <div className="flex justify-between pb-2 border-b border-[var(--border2)] font-bold text-[var(--purple)] mt-4">
                     <span>Vinst & Risk</span>
                     <span className="font-mono">{formatKr(calcResult.vTot)}</span>
                  </div>
                  
                  <div className="flex justify-between p-4 bg-white rounded-lg border border-[var(--blue-lt)] mt-4 shadow-sm text-xl font-extrabold text-[var(--blue-dk)]">
                     <span>Anbudssumma</span>
                     <span className="font-mono">{formatKr(calcResult.anbud)}</span>
                  </div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
