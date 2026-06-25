import React, { useState, useEffect } from 'react';
import { ProjectInfo, CompanyInfo, SavedProject, ProjectVersion } from '../data';

interface Props {
  projectInfo: ProjectInfo;
  setProjectInfo: React.Dispatch<React.SetStateAction<ProjectInfo>>;
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
  currentProject?: SavedProject;
  saveVersion: (name: string) => void;
  loadVersion: (version: ProjectVersion) => void;
  deleteVersion: (vId: string) => void;
  addActivityLog?: (action: string, details?: string) => void;
}

const COUNTRIES = ['Sverige', 'Norge', 'Danmark', 'Finland', 'Schweiz'];

async function fetchLanFromCity(city: string, country: string): Promise<string | null> {
  if (!city || !country) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&addressdetails=1&limit=1`;
    const response = await fetch(url, { headers: { 'Accept-Language': 'sv' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0) {
      const address = data[0].address;
      // Depending on the country, the county/state might be in 'county', 'state', or 'region'
      return address.county || address.state || address.region || null;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch location data:', err);
    return null;
  }
}

const StatusPill = ({ status }: { status?: string }) => {
  const displayStatus = status || 'Pågående';
  let bgClass = "bg-gray-100 text-gray-700";
  if (displayStatus === 'Pågående') bgClass = "bg-blue-100 text-blue-700";
  else if (displayStatus === 'Väntande' || displayStatus === 'Väntar') bgClass = "bg-amber-100 text-amber-700";
  else if (displayStatus === 'Avslutat' || displayStatus === 'Klar') bgClass = "bg-green-100 text-green-700";
  else if (displayStatus === 'Avbrutet') bgClass = "bg-red-100 text-red-700";
  return (
    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ml-3 align-middle ${bgClass}`}>
      {displayStatus}
    </span>
  );
};

export function ProjektInfoTab({ projectInfo, setProjectInfo, companyInfo, setCompanyInfo, currentProject, saveVersion, loadVersion, deleteVersion, addActivityLog }: Props) {
  const [loadingProj, setLoadingProj] = useState(false);
  const [loadingComp, setLoadingComp] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  // Auto-fetch for project when city blurs
  const handleProjCityBlur = async () => {
    if (!projectInfo.ort || !projectInfo.land) return;
    setLoadingProj(true);
    const lan = await fetchLanFromCity(projectInfo.ort, projectInfo.land);
    if (lan) {
      setProjectInfo(prev => ({ ...prev, lan }));
    }
    setLoadingProj(false);
  };

  // Auto-fetch for company when city blurs
  const handleCompCityBlur = async () => {
    if (!companyInfo.ort || !companyInfo.land) return;
    setLoadingComp(true);
    const lan = await fetchLanFromCity(companyInfo.ort, companyInfo.land);
    if (lan) {
      setCompanyInfo(prev => ({ ...prev, lan }));
    }
    setLoadingComp(false);
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 md:px-8 animate-in fade-in duration-300">
      
      <div className="flex-1 space-y-8">
        <section className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="bg-[var(--surface2)] px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text2)] flex items-center gap-2">
            <i className="fa-solid fa-building text-[var(--blue)]"></i> Företagsinformation
          </h2>
          <p className="text-xs text-[var(--text3)] mt-1">Används för att beräkna traktamente (om projektet är i annat län/land).</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Företagsnamn</label>
            <input 
              type="text" 
              value={companyInfo.name}
              onChange={e => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="T.ex. Bygg AB"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Organisationsnummer</label>
            <input 
              type="text" 
              value={companyInfo.orgNr}
              onChange={e => setCompanyInfo({ ...companyInfo, orgNr: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="556000-0000"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Kontaktperson</label>
            <input 
              type="text" 
              value={companyInfo.contactPerson}
              onChange={e => setCompanyInfo({ ...companyInfo, contactPerson: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="Förnamn Efternamn"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Telefon</label>
            <input 
              type="text" 
              value={companyInfo.phone}
              onChange={e => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="070-123 45 67"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">E-post</label>
            <input 
              type="email" 
              value={companyInfo.email}
              onChange={e => setCompanyInfo({ ...companyInfo, email: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="info@företaget.se"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Land</label>
            <select 
              value={companyInfo.land}
              onChange={e => setCompanyInfo({ ...companyInfo, land: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
            >
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Ort</label>
            <div className="relative">
              <input 
                type="text" 
                value={companyInfo.ort}
                onChange={e => setCompanyInfo({ ...companyInfo, ort: e.target.value })}
                onBlur={handleCompCityBlur}
                className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300 pr-8"
                placeholder="T.ex. Stockholm"
              />
              {loadingComp && <i className="fa-solid fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Län (fylls i automatiskt)</label>
            <input 
              type="text" 
              value={companyInfo.lan}
              onChange={e => setCompanyInfo({ ...companyInfo, lan: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="T.ex. Stockholms län"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="bg-[var(--surface2)] px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text2)] flex items-center gap-2">
            <i className="fa-solid fa-folder-open text-[var(--blue)]"></i> Projektinformation
            <StatusPill status={projectInfo.status || 'Pågående'} />
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Projekt nr</label>
            <input 
              type="text" 
              value={projectInfo.nr}
              onChange={e => setProjectInfo({ ...projectInfo, nr: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="T.ex. PROJ-2024-001"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Bruttoarea (BTA) m²</label>
            <input 
              type="number" 
              value={projectInfo.bta || ''}
              onChange={e => setProjectInfo({ ...projectInfo, bta: parseFloat(e.target.value) || undefined })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="T.ex. 1500"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Projektnamn</label>
            <input 
              type="text" 
              value={projectInfo.name}
              onChange={e => setProjectInfo({ ...projectInfo, name: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="T.ex. Nybyggnation Kvarteret Valnöten"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Projektstatus</label>
            <select
              value={projectInfo.status || 'Pågående'}
              onChange={e => {
                const newStatus = e.target.value;
                if (newStatus !== (projectInfo.status || 'Pågående') && addActivityLog) {
                  addActivityLog('Ändrade status', `Status ändrades från "${projectInfo.status || 'Pågående'}" till "${newStatus}"`);
                }
                setProjectInfo({ ...projectInfo, status: newStatus });
              }}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300 font-semibold"
            >
              <option value="Pågående">Pågående</option>
              <option value="Väntande">Väntande</option>
              <option value="Avslutat">Avslutat</option>
              <option value="Klar">Klar</option>
              <option value="Avbrutet">Avbrutet</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Entreprenadform</label>
            <select
              value={projectInfo.contractType || ''}
              onChange={e => setProjectInfo({ ...projectInfo, contractType: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300 font-semibold"
            >
              <option value="">Välj form...</option>
              <option value="AB04">AB 04</option>
              <option value="ABT06">ABT 06</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Startdatum</label>
            <input 
              type="date" 
              value={projectInfo.startDate || ''}
              onChange={e => setProjectInfo({ ...projectInfo, startDate: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Slutdatum</label>
            <input 
              type="date" 
              value={projectInfo.endDate || ''}
              onChange={e => setProjectInfo({ ...projectInfo, endDate: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Beställare Namn</label>
            <input 
              type="text" 
              value={projectInfo.client}
              onChange={e => setProjectInfo({ ...projectInfo, client: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="Företag AB"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Org.nummer (Beställare)</label>
            <input 
              type="text" 
              value={projectInfo.clientOrgNr}
              onChange={e => setProjectInfo({ ...projectInfo, clientOrgNr: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="556000-0000"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Kontaktperson</label>
            <input 
              type="text" 
              value={projectInfo.clientContact}
              onChange={e => setProjectInfo({ ...projectInfo, clientContact: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="Förnamn Efternamn"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Telefon</label>
            <input 
              type="text" 
              value={projectInfo.clientPhone}
              onChange={e => setProjectInfo({ ...projectInfo, clientPhone: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="070-123 45 67"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">E-post</label>
            <input 
              type="email" 
              value={projectInfo.clientEmail}
              onChange={e => setProjectInfo({ ...projectInfo, clientEmail: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="info@företaget.se"
            />
          </div>
          <div className="lg:col-span-3">
            <hr className="border-[var(--border)] my-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Land</label>
            <select 
              value={projectInfo.land}
              onChange={e => setProjectInfo({ ...projectInfo, land: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
            >
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Ort</label>
            <div className="relative">
              <input 
                type="text" 
                value={projectInfo.ort}
                onChange={e => setProjectInfo({ ...projectInfo, ort: e.target.value })}
                onBlur={handleProjCityBlur}
                className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300 pr-8"
                placeholder="T.ex. Malmö"
              />
              {loadingProj && <i className="fa-solid fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Län (fylls i automatiskt)</label>
            <input 
              type="text" 
              value={projectInfo.lan}
              onChange={e => setProjectInfo({ ...projectInfo, lan: e.target.value })}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
              placeholder="T.ex. Skåne län"
            />
          </div>
        </div>
      </section>

      {/* Notes Section */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="bg-[var(--surface2)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[var(--text2)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--blue)] text-[20px]">sticky_note_2</span> Anteckningar
          </h2>
        </div>
        <div className="p-6">
          <textarea
            value={projectInfo.notes || ''}
            onChange={e => setProjectInfo({ ...projectInfo, notes: e.target.value })}
            className="w-full h-40 border border-[var(--border)] rounded-md px-4 py-3 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300 resize-y"
            placeholder="Skriv dina anteckningar för projektet här..."
          ></textarea>
        </div>
      </section>

      {/* Version Control Section */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="bg-[var(--surface2)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[var(--text2)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--blue)] text-[20px]">history</span> Versionshantering
          </h2>
        </div>
        <div className="p-6">
          <div className="flex gap-4 items-end mb-6">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Spara nuvarande kalkyl som ny version</label>
              <input 
                type="text" 
                value={newVersionName}
                onChange={e => setNewVersionName(e.target.value)}
                className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white hover:border-gray-300"
                placeholder="T.ex. Innan revidering A"
              />
            </div>
            <button
              onClick={() => {
                if (newVersionName.trim()) {
                  saveVersion(newVersionName.trim());
                  setNewVersionName('');
                }
              }}
              disabled={!newVersionName.trim()}
              className="bg-[var(--blue)] hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 h-10"
            >
              <span className="material-symbols-outlined text-[18px]">save</span> Spara
            </button>
          </div>

          {currentProject?.versions && currentProject.versions.length > 0 ? (
            <div className="border border-[var(--border)] rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-[var(--border)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">Versionsnamn</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Datum</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Mängdposter</th>
                    <th className="px-4 py-3 text-right">Åtgärder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {currentProject.versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(v => (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(v.timestamp).toLocaleString('sv-SE', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{v.byggdelar.length} poster</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => loadVersion(v)}
                          className="text-[var(--blue)] hover:text-blue-700 font-medium px-2 py-1 rounded transition-colors hover:bg-blue-50"
                        >
                          Läs in
                        </button>
                        <button
                          onClick={() => deleteVersion(v.id)}
                          className="text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded transition-colors hover:bg-red-50"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">Inga sparade versioner än.</p>
            </div>
          )}
        </div>
      </section>

      </div>
    </div>
  );
}
