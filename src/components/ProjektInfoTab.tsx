import React, { useState, useEffect } from 'react';
import { ProjectInfo, CompanyInfo, SavedProject, ProjectVersion, Byggdel } from '../data';
import { Badge, Input, Select, NumberInput, Button, IconButton } from '../ui';
import { formatKr } from './Header';

import { UtfallInmatning } from './UtfallInmatning';

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
  byggdelar?: Byggdel[];
  projectId?: string;
  companyId?: string;
  onProjectCompleted?: () => void;
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
    // warning removed
    return null;
  }
}

function getBadgeVariant(status?: string): 'blue' | 'green' | 'amber' | 'purple' | 'gray' | 'red' {
  const displayStatus = status || 'Pågående';
  if (displayStatus === 'Pågående') return 'blue';
  if (displayStatus === 'Väntande' || displayStatus === 'Väntar') return 'amber';
  if (displayStatus === 'Avslutat' || displayStatus === 'Klar') return 'green';
  if (displayStatus === 'Avbrutet') return 'red';
  return 'gray';
}

export function ProjektInfoTab({ projectInfo, setProjectInfo, companyInfo, setCompanyInfo, currentProject, saveVersion, loadVersion, deleteVersion, addActivityLog, byggdelar = [], projectId, companyId, onProjectCompleted }: Props) {
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
            <span className="material-symbols-outlined text-[var(--blue)]">business</span> Företagsinformation
          </h2>
          <p className="text-xs text-[var(--text3)] mt-1">Används för att beräkna traktamente (om projektet är i annat län/land).</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Företagsnamn</label>
            <Input 
              value={companyInfo.name}
              onChange={e => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              placeholder="T.ex. Bygg AB"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Organisationsnummer</label>
            <Input 
              value={companyInfo.orgNr}
              onChange={e => setCompanyInfo({ ...companyInfo, orgNr: e.target.value })}
              placeholder="556000-0000"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Kontaktperson</label>
            <Input 
              value={companyInfo.contactPerson}
              onChange={e => setCompanyInfo({ ...companyInfo, contactPerson: e.target.value })}
              placeholder="Förnamn Efternamn"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Telefon</label>
            <Input 
              value={companyInfo.phone}
              onChange={e => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
              placeholder="070-123 45 67"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">E-post</label>
            <Input 
              type="email"
              value={companyInfo.email}
              onChange={e => setCompanyInfo({ ...companyInfo, email: e.target.value })}
              placeholder="info@företaget.se"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Land</label>
            <Select 
              value={companyInfo.land}
              onChange={e => setCompanyInfo({ ...companyInfo, land: e.target.value })}
            >
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Ort</label>
            <div className="relative">
              <Input 
                value={companyInfo.ort}
                onChange={e => setCompanyInfo({ ...companyInfo, ort: e.target.value })}
                onBlur={handleCompCityBlur}
                className="pr-8"
                placeholder="T.ex. Stockholm"
              />
              {loadingComp && <span className="material-symbols-outlined animate-spin text-[16px] absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">progress_activity</span>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Län (fylls i automatiskt)</label>
            <Input 
              value={companyInfo.lan}
              onChange={e => setCompanyInfo({ ...companyInfo, lan: e.target.value })}
              placeholder="T.ex. Stockholms län"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="bg-[var(--surface2)] px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text2)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--blue)]">folder_open</span> Projektinformation
            <Badge variant={getBadgeVariant(projectInfo.status)} className="ml-3">
              {projectInfo.status || 'Pågående'}
            </Badge>
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Projekt nr</label>
            <Input 
              value={projectInfo.nr}
              onChange={e => setProjectInfo({ ...projectInfo, nr: e.target.value })}
              placeholder="T.ex. PROJ-2024-001"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Bruttoarea (BTA) m²</label>
            <NumberInput 
              value={projectInfo.bta || ''}
              onChange={e => setProjectInfo({ ...projectInfo, bta: parseFloat(e.target.value) || undefined })}
              className="w-full"
              unit="m²"
              placeholder="T.ex. 1500"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Projektnamn</label>
            <Input 
              value={projectInfo.name}
              onChange={e => setProjectInfo({ ...projectInfo, name: e.target.value })}
              placeholder="T.ex. Nybyggnation Kvarteret Valnöten"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Projektstatus</label>
            <div className="flex gap-2">
              <Select
                value={projectInfo.status || 'Pågående'}
                onChange={e => {
                  const oldStatus = projectInfo.status || 'Pågående';
                  const newStatus = e.target.value;
                  if (newStatus !== oldStatus && addActivityLog) {
                    addActivityLog('Ändrade status', `Status ändrades från "${oldStatus}" till "${newStatus}"`);
                  }
                  setProjectInfo({ ...projectInfo, status: newStatus });
                  
                  if ((newStatus === 'Klar' || newStatus === 'Avslutat') && 
                      oldStatus !== 'Klar' && oldStatus !== 'Avslutat') {
                    onProjectCompleted?.();
                  }
                }}
              >
                <option value="Pågående">Pågående</option>
                <option value="Väntande">Väntande</option>
                <option value="Avslutat">Avslutat</option>
                <option value="Klar">Klar</option>
                <option value="Avbrutet">Avbrutet</option>
              </Select>
              
              {(projectInfo.status === 'Klar' || projectInfo.status === 'Avslutat') && (
                <Button 
                  variant="ghost"
                  onClick={() => onProjectCompleted?.()}
                  title="Utvärdera tidsåtgång (EAC)"
                >
                  Utvärdera EAC
                </Button>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Entreprenadform</label>
            <Select
              value={projectInfo.contractType || ''}
              onChange={e => setProjectInfo({ ...projectInfo, contractType: e.target.value })}
            >
              <option value="">Välj form...</option>
              <option value="AB04">AB 04</option>
              <option value="ABT06">ABT 06</option>
            </Select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Projektfas</label>
            <Select
              value={projectInfo.phase || ''}
              onChange={e => {
                const oldPhase = projectInfo.phase || '';
                const newPhase = e.target.value;
                if (newPhase !== oldPhase && addActivityLog) {
                  addActivityLog('Ändrade fas', `Projektfas ändrades från "${oldPhase || 'Ingen'}" till "${newPhase}"`);
                }
                setProjectInfo({ ...projectInfo, phase: newPhase });
              }}
            >
              <option value="">Välj fas...</option>
              <option value="Anbud">Anbud</option>
              <option value="Projektering">Projektering</option>
              <option value="Produktion">Produktion</option>
              <option value="Slutskede">Slutskede</option>
              <option value="Garanti">Garanti</option>
            </Select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Projekttyp</label>
            <Select
              value={projectInfo.projectType || ''}
              onChange={e => setProjectInfo({ ...projectInfo, projectType: e.target.value })}
            >
              <option value="">Välj typ...</option>
              <option value="Nybyggnad">Nybyggnad</option>
              <option value="Tillbyggnad">Tillbyggnad</option>
              <option value="Ombyggnad">Ombyggnad</option>
              <option value="Rivning">Rivning</option>
              <option value="Anläggning">Anläggning</option>
            </Select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Planerat startdatum</label>
            <Input 
              type="date" 
              value={projectInfo.startDate || ''}
              onChange={e => setProjectInfo({ ...projectInfo, startDate: e.target.value })}
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Planerat slutdatum</label>
            <Input 
              type="date" 
              value={projectInfo.endDate || ''}
              onChange={e => setProjectInfo({ ...projectInfo, endDate: e.target.value })}
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Faktiskt startdatum</label>
            <Input 
              type="date" 
              value={projectInfo.actualStartDate || ''}
              onChange={e => setProjectInfo({ ...projectInfo, actualStartDate: e.target.value })}
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Faktiskt slutdatum</label>
            <Input 
              type="date" 
              value={projectInfo.actualEndDate || ''}
              onChange={e => setProjectInfo({ ...projectInfo, actualEndDate: e.target.value })}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Beställare Namn</label>
            <Input 
              value={projectInfo.client}
              onChange={e => setProjectInfo({ ...projectInfo, client: e.target.value })}
              placeholder="Företag AB"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Org.nummer (Beställare)</label>
            <Input 
              value={projectInfo.clientOrgNr}
              onChange={e => setProjectInfo({ ...projectInfo, clientOrgNr: e.target.value })}
              placeholder="556000-0000"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Kontaktperson</label>
            <Input 
              value={projectInfo.clientContact}
              onChange={e => setProjectInfo({ ...projectInfo, clientContact: e.target.value })}
              placeholder="Förnamn Efternamn"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Telefon</label>
            <Input 
              value={projectInfo.clientPhone}
              onChange={e => setProjectInfo({ ...projectInfo, clientPhone: e.target.value })}
              placeholder="070-123 45 67"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">E-post</label>
            <Input 
              type="email" 
              value={projectInfo.clientEmail}
              onChange={e => setProjectInfo({ ...projectInfo, clientEmail: e.target.value })}
              placeholder="info@företaget.se"
            />
          </div>
          <div className="lg:col-span-3">
            <hr className="border-[var(--border)] my-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Land</label>
            <Select 
              value={projectInfo.land}
              onChange={e => setProjectInfo({ ...projectInfo, land: e.target.value })}
            >
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Ort</label>
            <div className="relative">
              <Input 
                value={projectInfo.ort}
                onChange={e => setProjectInfo({ ...projectInfo, ort: e.target.value })}
                onBlur={handleProjCityBlur}
                className="pr-8"
                placeholder="T.ex. Malmö"
              />
              {loadingProj && <span className="material-symbols-outlined animate-spin text-[16px] absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">progress_activity</span>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Län (fylls i automatiskt)</label>
            <Input 
              value={projectInfo.lan}
              onChange={e => setProjectInfo({ ...projectInfo, lan: e.target.value })}
              placeholder="T.ex. Skåne län"
            />
          </div>
        </div>
      </section>

      {/* Ekonomi Section */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="bg-[var(--surface2)] px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text2)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--blue)]">payments</span> Ekonomi
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Kontraktssumma</label>
            <NumberInput 
              unit="kr"
              value={projectInfo.contractValue ?? ''}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setProjectInfo({ ...projectInfo, contractValue: isNaN(val) ? undefined : val });
              }}
              className="w-full text-right"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Reserv (oförutsett)</label>
            <NumberInput 
              unit="%"
              value={projectInfo.contingencyPct ?? ''}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setProjectInfo({ ...projectInfo, contingencyPct: isNaN(val) ? undefined : val });
              }}
              className="w-full text-right"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Momssats</label>
            <Select
              value={String(projectInfo.vatRate ?? 0.25)}
              onChange={e => setProjectInfo({ ...projectInfo, vatRate: parseFloat(e.target.value) })}
            >
              <option value="0.25">25 %</option>
              <option value="0.12">12 %</option>
              <option value="0.06">6 %</option>
              <option value="0">0 %</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <p className="text-xs text-[var(--text3)]">Momssatsen styr beloppen i Anbud och exporten.</p>
          </div>
        </div>
      </section>

      {/* Milstolpar Section */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="bg-[var(--surface2)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[var(--text2)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--blue)]">checklist</span> Milstolpar & betalningsplan
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wider mr-2">Fördela betalning:</span>
            <Button 
              variant="ghost" 
              className="px-2 py-1 h-8 text-xs"
              disabled={!projectInfo.milestones || projectInfo.milestones.length === 0}
              onClick={() => {
                if (!projectInfo.milestones || projectInfo.milestones.length === 0) return;
                const len = projectInfo.milestones.length;
                const base = Math.floor(100 / len);
                const remainder = 100 - (base * len);
                const list = projectInfo.milestones.map((m, i) => ({
                  ...m,
                  paymentPct: i === len - 1 ? base + remainder : base
                }));
                setProjectInfo({ ...projectInfo, milestones: list });
              }}
            >
              Jämnt
            </Button>
            <Button 
              variant="ghost" 
              className="px-2 py-1 h-8 text-xs text-[var(--text3)] hover:text-red-600"
              disabled={!projectInfo.milestones || projectInfo.milestones.length === 0}
              onClick={() => {
                if (!projectInfo.milestones) return;
                const list = projectInfo.milestones.map(m => ({
                  ...m,
                  paymentPct: undefined
                }));
                setProjectInfo({ ...projectInfo, milestones: list });
              }}
            >
              Töm
            </Button>
          </div>
        </div>
        <div className="p-6">
          {(!projectInfo.milestones || projectInfo.milestones.length === 0) ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-4">
              <p className="text-gray-500 text-sm">Inga milstolpar än.</p>
            </div>
          ) : (
            <div className="overflow-x-auto mb-4 border border-[var(--border)] rounded-lg">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-[var(--border)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[var(--text2)]">Milstolpe</th>
                    <th className="px-4 py-3 font-semibold text-[var(--text2)] w-40">Planerat datum</th>
                    <th className="px-4 py-3 font-semibold text-[var(--text2)] w-40">Faktiskt datum</th>
                    <th className="px-4 py-3 font-semibold text-[var(--text2)] w-32">Betalning %</th>
                    <th className="px-4 py-3 font-semibold text-[var(--text2)] w-32">Belopp</th>
                    <th className="px-4 py-3 font-semibold text-[var(--text2)] w-48">Status</th>
                    <th className="px-4 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(projectInfo.milestones || []).map((ms, i) => (
                    <tr key={ms.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2">
                        <Input
                          value={ms.name}
                          onChange={e => {
                            const list = [...(projectInfo.milestones ?? [])];
                            list[i] = { ...list[i], name: e.target.value };
                            setProjectInfo({ ...projectInfo, milestones: list });
                          }}
                          placeholder="Beskrivning"
                          className="w-full min-w-[150px]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={ms.plannedDate || ''}
                          onChange={e => {
                            const list = [...(projectInfo.milestones ?? [])];
                            list[i] = { ...list[i], plannedDate: e.target.value };
                            setProjectInfo({ ...projectInfo, milestones: list });
                          }}
                          className="w-full border border-[var(--color-outline-variant)] rounded px-2 py-1.5 text-sm focus:border-[var(--color-primary)] outline-none bg-white transition-colors"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={ms.actualDate || ''}
                          onChange={e => {
                            const list = [...(projectInfo.milestones ?? [])];
                            list[i] = { ...list[i], actualDate: e.target.value };
                            setProjectInfo({ ...projectInfo, milestones: list });
                          }}
                          className="w-full border border-[var(--color-outline-variant)] rounded px-2 py-1.5 text-sm focus:border-[var(--color-primary)] outline-none bg-white transition-colors"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <NumberInput
                          unit="%"
                          value={ms.paymentPct ?? ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            const list = [...(projectInfo.milestones ?? [])];
                            list[i] = { ...list[i], paymentPct: isNaN(val) ? undefined : val };
                            setProjectInfo({ ...projectInfo, milestones: list });
                          }}
                          className="w-full text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm text-[var(--text2)]">
                        {projectInfo.contractValue ? formatKr(projectInfo.contractValue * (ms.paymentPct ?? 0) / 100) : "–"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={ms.status || 'planerad'}
                            onChange={e => {
                              const list = [...(projectInfo.milestones ?? [])];
                              list[i] = { ...list[i], status: e.target.value as any };
                              setProjectInfo({ ...projectInfo, milestones: list });
                            }}
                            className="w-full"
                          >
                            <option value="planerad">Planerad</option>
                            <option value="uppnadd">Uppnådd</option>
                            <option value="fakturerad">Fakturerad</option>
                            <option value="betald">Betald</option>
                          </Select>
                          <Badge variant={ms.status === 'betald' ? 'green' : ms.status === 'fakturerad' ? 'amber' : ms.status === 'uppnadd' ? 'blue' : 'gray'}>
                            {ms.status || 'planerad'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <IconButton
                          icon="delete"
                          onClick={() => {
                            const list = [...(projectInfo.milestones ?? [])];
                            list.splice(i, 1);
                            setProjectInfo({ ...projectInfo, milestones: list });
                          }}
                          className="text-gray-400 hover:text-red-500"
                          title="Ta bort milstolpe"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-start mt-2">
            <Button 
              icon="add" 
              variant="ghost"
              onClick={() => {
                const list = [...(projectInfo.milestones ?? [])];
                list.push({ id: crypto.randomUUID(), name: '', status: 'planerad' });
                setProjectInfo({ ...projectInfo, milestones: list });
              }}
            >
              Lägg till milstolpe
            </Button>

            {(() => {
              const pctSum = (projectInfo.milestones ?? []).reduce((s, m) => s + (m.paymentPct ?? 0), 0);
              const amtSum = projectInfo.contractValue ? projectInfo.contractValue * pctSum / 100 : undefined;
              const rest = 100 - pctSum;
              return (
                <div className="text-right num">
                  <div className={`flex items-center justify-end gap-2 text-sm font-semibold ${pctSum > 100 ? 'text-[var(--red)]' : 'text-[var(--text2)]'}`}>
                    {pctSum > 100 && <span className="material-symbols-outlined text-[var(--red)] text-sm" title="Betalningsplanen överstiger 100 %">warning</span>}
                    {pctSum === 100 && <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>}
                    <span>Summa betalning: {pctSum} % ({amtSum ? formatKr(amtSum) : '–'})</span>
                  </div>
                  <div className="text-[var(--text3)] text-xs mt-1">
                    Kvar att fördela: {rest} %
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Variables Section */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="bg-[var(--surface2)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[var(--text2)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--blue)] text-[20px]">functions</span> Variabler för kalkylering
          </h2>
        </div>
        <div className="p-6">
          <p className="text-xs text-gray-500 mb-4">
            Här kan du definiera variabler som du kan använda i kalkylen. Till exempel, om du definierar <code>BTA = 1200</code>, kan du i kalkylen skriva <code>=BTA*0.18</code> i en cell för Mängd, Antal eller Pris.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(projectInfo.variables || {}).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 border border-[var(--border)] rounded-md p-2 bg-gray-50 group">
                <Input
                  value={key}
                  onChange={e => {
                    const newKey = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                    const newVars = { ...projectInfo.variables };
                    if (newKey && newKey !== key) {
                      newVars[newKey] = newVars[key];
                      delete newVars[key];
                      setProjectInfo({ ...projectInfo, variables: newVars });
                    }
                  }}
                  className="w-1/2 bg-transparent font-semibold border-b border-transparent focus:border-gray-300 shadow-none border-t-0 border-l-0 border-r-0 rounded-none px-0"
                  placeholder="Namn"
                />
                <span className="text-gray-400">=</span>
                <NumberInput
                  value={val}
                  onChange={e => {
                    const num = parseFloat(e.target.value);
                    const newVars = { ...projectInfo.variables, [key]: isNaN(num) ? 0 : num };
                    setProjectInfo({ ...projectInfo, variables: newVars });
                  }}
                  className="w-1/2 bg-transparent border-b border-transparent focus:border-gray-300 text-right num shadow-none border-t-0 border-l-0 border-r-0 rounded-none"
                  placeholder="Värde"
                />
                <IconButton
                  icon="close"
                  onClick={() => {
                    const newVars = { ...projectInfo.variables };
                    delete newVars[key];
                    setProjectInfo({ ...projectInfo, variables: newVars });
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-white"
                  title="Ta bort variabel"
                />
              </div>
            ))}
            
            <div className="flex items-center gap-2 border border-dashed border-gray-300 rounded-md p-2 hover:border-[var(--blue)] transition-colors">
              <Input
                placeholder="Ny variabel (t.ex. area)"
                className="w-full bg-transparent shadow-none border-none outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    const newKey = e.currentTarget.value.replace(/[^a-zA-Z0-9_]/g, '');
                    if (newKey && !(projectInfo.variables && newKey in projectInfo.variables)) {
                      setProjectInfo({ 
                        ...projectInfo, 
                        variables: { ...(projectInfo.variables || {}), [newKey]: 0 } 
                      });
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>
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
              <Input 
                value={newVersionName}
                onChange={e => setNewVersionName(e.target.value)}
                placeholder="T.ex. Innan revidering A"
              />
            </div>
            <Button
              icon="save"
              onClick={() => {
                if (newVersionName.trim()) {
                  saveVersion(newVersionName.trim());
                  setNewVersionName('');
                }
              }}
              disabled={!newVersionName.trim()}
            >
              Spara
            </Button>
          </div>

          {currentProject?.versions && currentProject.versions.length > 0 ? (
            <div className="border border-[var(--border)] rounded-lg overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap lg:whitespace-normal">
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
                        <Button
                          variant="ghost"
                          onClick={() => loadVersion(v)}
                          className="px-2 py-1 text-xs"
                        >
                          Läs in
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => deleteVersion(v.id)}
                          className="px-2 py-1 text-xs"
                        >
                          Ta bort
                        </Button>
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

      {projectId && companyId && (
        <UtfallInmatning 
          byggdelar={byggdelar} 
          projectId={projectId} 
          companyId={companyId} 
        />
      )}

      </div>
    </div>
  );
}
