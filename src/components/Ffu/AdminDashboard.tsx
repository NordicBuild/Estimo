import React, { useState, useEffect, useRef } from 'react';
import { useAdminDashboard } from '../../ffu/hooks/useAdminDashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Button } from '../../ui';

interface Props {
  projectId: string;
}

export function AdminDashboard({ projectId }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'access' | 'compliance' | 'collab'>('overview');
  const [liveFeed, setLiveFeed] = useState(false);
  
  const {
    isLoading,
    totalDocuments,
    totalSize,
    docsPerMonth,
    topCommented,
    accessLogs,
    complianceData,
    collabData,
    fetchAccessLogs
  } = useAdminDashboard(projectId);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'access') {
      fetchAccessLogs({});
    }
  }, [activeTab]);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    // @ts-ignore
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin:       10,
      filename:     `Admin_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };
    html2pdf().from(reportRef.current).set(opt).save();
  };

  const exportToCSV = () => {
    const header = ['Dokument', 'Användare', 'Åtgärd', 'Datum', 'IP'];
    const rows = accessLogs.map(log => [
      log.document?.filename || '-',
      `${log.user?.first_name || ''} ${log.user?.last_name || ''}`,
      log.action,
      new Date(log.created_at).toLocaleString(),
      log.ip_address || '-'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [header, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AccessLog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className="p-8 text-center text-on-surface-variant">Laddar admin dashboard...</div>;

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-surface-container-lowest">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Administratörspanel (FFU)</h1>
          <p className="text-sm text-on-surface-variant mt-1">Övervaka aktivitet, behörigheter och compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={exportToPDF}>
            <span className="material-symbols-outlined mr-2">picture_as_pdf</span>
            Exportera Rapport
          </Button>
        </div>
      </div>

      <div className="flex border-b border-outline-variant px-6 bg-surface-container-lowest">
        {[
          { id: 'overview', label: 'Översikt', icon: 'dashboard' },
          { id: 'access', label: 'Åtkomstlogg', icon: 'list_alt' },
          { id: 'compliance', label: 'Compliance', icon: 'verified_user' },
          { id: 'collab', label: 'Samarbete', icon: 'groups' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
              activeTab === tab.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6" ref={reportRef}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary">description</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">Totalt antal dokument</div>
                  <div className="text-3xl font-black text-on-surface">{totalDocuments}</div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary">storage</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">Total lagringsstorlek</div>
                  <div className="text-3xl font-black text-on-surface">{totalSize.toFixed(1)} MB</div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-tertiary">schedule</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">Genomsnittlig filålder</div>
                  <div className="text-3xl font-black text-on-surface">14 dgr</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                <h3 className="text-lg font-bold text-on-surface mb-6">Uppladdningar per månad</h3>
                <div className="h-64">
                  {docsPerMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={docsPerMonth}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                        <XAxis dataKey="month" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                        <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                        <Bar dataKey="count" fill="var(--color-primary, #005f73)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-on-surface-variant">Ingen data tillgänglig</div>
                  )}
                </div>
              </div>
              
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                <h3 className="text-lg font-bold text-on-surface mb-4">Mest kommenterade (Topp 10)</h3>
                <div className="space-y-3">
                  {topCommented.length > 0 ? topCommented.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/50">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-on-surface-variant w-4">{idx + 1}.</span>
                        <span className="font-medium text-on-surface truncate max-w-[200px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-1 rounded-full text-xs font-bold">
                        <span className="material-symbols-outlined text-[14px]">comment</span>
                        {item.count}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-on-surface-variant py-8">Inga kommentarer ännu</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACCESS LOG TAB */}
        {activeTab === 'access' && (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-outline-variant flex flex-wrap items-center justify-between gap-4 bg-surface">
              <div className="flex gap-2">
                <input type="text" placeholder="Sök användare eller dokument..." className="px-3 py-1.5 text-sm border border-outline-variant rounded bg-surface text-on-surface" />
                <select className="px-3 py-1.5 text-sm border border-outline-variant rounded bg-surface text-on-surface">
                  <option>Alla åtgärder</option>
                  <option>Läsning (view)</option>
                  <option>Nedladdning (download)</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={liveFeed} onChange={e => setLiveFeed(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                  Live-uppdatering
                </label>
                <Button variant="ghost" onClick={exportToCSV}>
                  <span className="material-symbols-outlined mr-2">download</span>
                  CSV Export
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-container sticky top-0 z-10 text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Dokument</th>
                    <th className="px-6 py-3 font-semibold">Användare</th>
                    <th className="px-6 py-3 font-semibold">Åtgärd</th>
                    <th className="px-6 py-3 font-semibold">Tidpunkt</th>
                    <th className="px-6 py-3 font-semibold">IP-adress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {accessLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-6 py-3 font-medium text-on-surface">{log.document?.filename || '-'}</td>
                      <td className="px-6 py-3">{`${log.user?.first_name || ''} ${log.user?.last_name || ''}`}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          log.action === 'view' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'download' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-on-surface-variant">{new Date(log.created_at).toLocaleString('sv-SE')}</td>
                      <td className="px-6 py-3 text-on-surface-variant">{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                  {accessLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                        Inga åtkomstloggar hittades.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMPLIANCE TAB */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-on-surface mb-2">Compliance & Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Checkpoint 1 */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-on-surface">Ritningar godkända</h3>
                    <p className="text-sm text-on-surface-variant">Alla ritningar måste vara markerade som godkända</p>
                  </div>
                  <span className={`material-symbols-outlined text-[32px] ${
                    complianceData.ritningarApproved.count === complianceData.ritningarApproved.total 
                      ? 'text-status-success' : 'text-error'
                  }`}>
                    {complianceData.ritningarApproved.count === complianceData.ritningarApproved.total ? 'check_circle' : 'warning'}
                  </span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2 mb-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${(complianceData.ritningarApproved.count / Math.max(complianceData.ritningarApproved.total, 1)) * 100}%` }}
                  ></div>
                </div>
                <div className="text-sm font-bold text-on-surface">
                  {complianceData.ritningarApproved.count} / {complianceData.ritningarApproved.total} ritningar godkända
                </div>
              </div>

              {/* Checkpoint 2 */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-on-surface">Inspektionsrapporter länkade</h3>
                    <p className="text-sm text-on-surface-variant">Alla rapporter måste kopplas till en byggdel</p>
                  </div>
                  <span className={`material-symbols-outlined text-[32px] ${
                    complianceData.inspectionsLinked.count === complianceData.inspectionsLinked.total 
                      ? 'text-status-success' : 'text-error'
                  }`}>
                    {complianceData.inspectionsLinked.count === complianceData.inspectionsLinked.total ? 'check_circle' : 'warning'}
                  </span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2 mb-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${(complianceData.inspectionsLinked.count / Math.max(complianceData.inspectionsLinked.total, 1)) * 100}%` }}
                  ></div>
                </div>
                <div className="text-sm font-bold text-on-surface">
                  {complianceData.inspectionsLinked.count} / {complianceData.inspectionsLinked.total} rapporter länkade
                </div>
              </div>

              {/* Checkpoint 3 */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-on-surface">Föråldrade dokument</h3>
                    <p className="text-sm text-on-surface-variant">Inga dokument över 30 dagar utan uppdatering</p>
                  </div>
                  <span className={`material-symbols-outlined text-[32px] ${
                    complianceData.oldDocuments === 0 ? 'text-status-success' : 'text-error'
                  }`}>
                    {complianceData.oldDocuments === 0 ? 'check_circle' : 'warning'}
                  </span>
                </div>
                <div className="text-3xl font-black text-on-surface mb-1">{complianceData.oldDocuments}</div>
                <div className="text-sm text-on-surface-variant">dokument kräver översyn</div>
              </div>

              {/* Checkpoint 4 */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-on-surface">Profiluppdateringar</h3>
                    <p className="text-sm text-on-surface-variant">Alla anställda har uppdaterat sin profil</p>
                  </div>
                  <span className={`material-symbols-outlined text-[32px] ${
                    complianceData.updatedProfiles.count === complianceData.updatedProfiles.total 
                      ? 'text-status-success' : 'text-status-warning'
                  }`}>
                    {complianceData.updatedProfiles.count === complianceData.updatedProfiles.total ? 'check_circle' : 'info'}
                  </span>
                </div>
                <div className="text-sm font-bold text-on-surface mt-4">
                  {complianceData.updatedProfiles.count} / {complianceData.updatedProfiles.total} profiler klara
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COLLABORATION TAB */}
        {activeTab === 'collab' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-on-surface mb-2">Samarbete & Teamhälsa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                <h3 className="text-lg font-bold text-on-surface mb-4">Svarstid för godkännanden</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px] text-primary">timer</span>
                  </div>
                  <div>
                    <div className="text-4xl font-black text-on-surface">{collabData.avgApprovalTime.toFixed(1)} <span className="text-xl text-on-surface-variant font-medium">timmar</span></div>
                    <div className="text-sm text-on-surface-variant">Genomsnittlig tid från förfrågan till svar</div>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                 <h3 className="text-lg font-bold text-on-surface mb-4">Toppmedarbetare (Flest kommentarer)</h3>
                 {collabData.topCommenters?.length > 0 ? (
                   <div className="space-y-3">
                     {collabData.topCommenters.map((user: any, idx: number) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/50">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                             {user.name.charAt(0)}
                           </div>
                           <span className="font-medium text-on-surface">{user.name}</span>
                         </div>
                         <div className="text-sm font-bold text-on-surface-variant">
                           {user.count} <span className="text-xs font-normal">inlägg</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-sm text-on-surface-variant py-4 text-center">
                      Ingen data ännu.
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
