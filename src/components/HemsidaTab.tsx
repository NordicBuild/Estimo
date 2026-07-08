import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';
import { SavedProject, ProjectFolder, CompanyInfo } from '../data';

const StatusPill = ({ status }: { status?: string }) => {
  const displayStatus = status || 'Pågående';
  
  let bgClass = "bg-gray-100 text-gray-700";
  if (displayStatus === 'Pågående') bgClass = "bg-blue-100 text-blue-700";
  else if (displayStatus === 'Väntande' || displayStatus === 'Väntar') bgClass = "bg-amber-100 text-amber-700";
  else if (displayStatus === 'Avslutat' || displayStatus === 'Klar') bgClass = "bg-green-100 text-green-700";
  else if (displayStatus === 'Avbrutet') bgClass = "bg-red-100 text-red-700";

  return (
    <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm ${bgClass}`}>
      {displayStatus}
    </span>
  );
};

interface HemsidaTabProps {
  user: User | null;
  projects: SavedProject[];
  folders: ProjectFolder[];
  activeProjectId: string;
  companyName: string;
  createFolder: () => void;
  createProject: (folderId: string | null) => void;
  renameFolder: (id: string, e: React.MouseEvent) => void;
  deleteFolder: (id: string, e: React.MouseEvent) => void;
  renameProject: (id: string, e: React.MouseEvent) => void;
  duplicateProject: (id: string, e: React.MouseEvent) => void;
  deleteProject: (id: string, e: React.MouseEvent) => void;
  switchProject: (id: string) => void;
  reorderProjects: (projectId: string, targetId: string | null, targetFolderId: string | null) => void;
  reorderFolders: (folderId: string, targetFolderId: string) => void;
}

export function HemsidaTab({ 
  user, projects, folders, activeProjectId, companyName,
  createFolder, createProject, renameFolder, deleteFolder,
  renameProject, duplicateProject, deleteProject, switchProject,
  reorderProjects, reorderFolders
}: HemsidaTabProps) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('Alla');

  useEffect(() => {
    if (user && user.user_metadata?.full_name) {
      setName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      if (newPassword) {
        if (newPassword !== newPasswordConfirm) {
          setMessage('Lösenorden matchar inte.');
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }
      
      const { error: dataError } = await supabase.auth.updateUser({
        data: { full_name: name }
      });
      if (dataError) throw dataError;

      setMessage('Din profil har uppdaterats!');
      setNewPassword('');
      setNewPasswordConfirm('');
      setEditingProfile(false);
    } catch (err: any) {
      setMessage('Ett fel uppstod: ' + err.message);
    }
  };

  const completedProjects = projects.filter(p => p.projectInfo?.status === 'Klar' || p.projectInfo?.status === 'Avslutat');
  const ongoingProjects = projects.filter(p => p.projectInfo?.status === 'Pågående' || !p.projectInfo?.status);

  const filteredProjects = projects.filter(p => {
    if (statusFilter === 'Alla') return true;
    const status = p.projectInfo?.status || 'Pågående';
    if (statusFilter === 'Väntande' && (status === 'Väntande' || status === 'Väntar')) return true;
    return status === statusFilter;
  });

  return (
    <div className="p-6 md:p-10 w-full mx-auto space-y-8 animate-fade-in pb-20">
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden relative">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[150%] rounded-full bg-primary/[0.03] blur-3xl transform rotate-12"></div>
          <div className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[120%] rounded-full bg-tertiary/[0.04] blur-3xl transform -rotate-12"></div>
        </div>

        <div className="p-8 md:p-10 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-2">
              Välkommen, <span className="text-primary">{name || user?.email?.split('@')[0] || 'Användare'}</span>!
            </h1>
            <p className="text-on-surface-variant flex items-center gap-2 text-lg">
              <span className="material-symbols-outlined text-primary/80">domain</span>
              {companyName || 'Ditt företag'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <button 
              onClick={() => createProject(null)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
            >
              <span className="material-symbols-outlined">add</span>
              Nytt projekt
            </button>
            <button 
              onClick={() => setEditingProfile(!editingProfile)}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface text-on-surface border border-outline-variant rounded-xl font-medium hover:bg-surface-container-lowest transition-all"
            >
              <span className="material-symbols-outlined text-on-surface-variant">settings</span>
              Inställningar
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant border-t border-outline-variant bg-surface-container-lowest/50 backdrop-blur-sm relative z-10">
          <div className="p-6 flex items-center gap-4 hover:bg-surface-container-lowest transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">folder_open</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface-variant mb-0.5 uppercase tracking-wider">Totalt antal projekt</p>
              <p className="text-2xl font-black text-on-surface leading-none">{projects.length}</p>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4 hover:bg-surface-container-lowest transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-status-success">check_circle</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface-variant mb-0.5 uppercase tracking-wider">Färdigställda</p>
              <p className="text-2xl font-black text-on-surface leading-none">{completedProjects.length}</p>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4 hover:bg-surface-container-lowest transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">pending_actions</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface-variant mb-0.5 uppercase tracking-wider">Pågående</p>
              <p className="text-2xl font-black text-on-surface leading-none">{ongoingProjects.length}</p>
            </div>
          </div>
        </div>

        {editingProfile && (
          <div className="p-6 border-t border-outline-variant bg-surface-container-lowest relative z-10">
            <h2 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">manage_accounts</span>
              Profilinställningar
            </h2>
            {message && (
              <div className={`p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-3 ${message.includes('fel') || message.includes('inte') ? 'bg-error/10 text-error' : 'bg-status-success/10 text-status-success'}`}>
                <span className="material-symbols-outlined">{message.includes('fel') || message.includes('inte') ? 'error' : 'check_circle'}</span>
                {message}
              </div>
            )}
            <form onSubmit={handleUpdateProfile} className="max-w-md space-y-5">
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  Ditt namn
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  placeholder="Skriv ditt namn här..."
                />
              </div>
              <div className="pt-2">
                <label className="block text-sm font-bold text-on-surface-variant mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">password</span>
                  Nytt lösenord
                </label>
                <p className="text-xs text-on-surface-variant mb-2">Lämna tomt om du vill behålla ditt nuvarande lösenord.</p>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  placeholder="Skriv nytt lösenord..."
                />
              </div>
              {newPassword && (
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-1.5">Bekräfta nytt lösenord</label>
                  <input 
                    type="password" 
                    value={newPasswordConfirm} 
                    onChange={(e) => setNewPasswordConfirm(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    placeholder="Bekräfta lösenordet..."
                  />
                </div>
              )}
              <div className="pt-4 border-t border-outline-variant/50">
                <button type="submit" className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Spara ändringar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col h-full max-h-[800px]">
        <div className="px-6 py-4 flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest">
          <div>
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">folder_open</span> Kalkylprojekt & Portfolio
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">Hantera dina kalkylprojekt och mappar</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm font-medium border border-outline-variant rounded-lg px-3 py-1.5 bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            >
              <option value="Alla">Alla projekt</option>
              <option value="Pågående">Pågående</option>
              <option value="Väntande">Väntande</option>
              <option value="Klar">Klar</option>
              <option value="Avslutat">Avslutat</option>
              <option value="Avbrutet">Avbrutet</option>
            </select>
            <button className="flex items-center gap-1 text-sm font-medium text-primary hover:bg-surface-container-low px-3 py-1.5 rounded-lg transition-colors border border-outline-variant" title="Ny mapp" onClick={createFolder}>
              <span className="material-symbols-outlined text-[18px]">create_new_folder</span> Ny mapp
            </button>
            <button className="flex items-center gap-1 text-sm font-medium text-on-primary bg-primary hover:opacity-90 px-3 py-1.5 rounded-lg transition-opacity shadow-sm" title="Nytt projekt" onClick={() => createProject(null)}>
              <span className="material-symbols-outlined text-[18px]">add</span> Nytt projekt
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {folders.map(folder => {
              const folderProjects = filteredProjects.filter(p => p.folderId === folder.id);
              return (
                <div
                  key={folder.id} 
                  className="pt-2 pb-2 transition-all border border-outline-variant rounded-lg bg-surface-container-lowest mb-3"
                  draggable
                  onDragStart={(e) => { 
                    e.dataTransfer.setData('folderId', folder.id); 
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'shadow-sm'); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('border-primary', 'shadow-sm')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-primary', 'shadow-sm');
                    
                    const dropFolderId = e.dataTransfer.getData('folderId');
                    if (dropFolderId && dropFolderId !== folder.id) {
                      reorderFolders(dropFolderId, folder.id);
                      return;
                    }
                    
                    const projId = e.dataTransfer.getData('projectId');
                    if (projId) {
                      reorderProjects(projId, null, folder.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between group py-2 px-4 cursor-pointer hover:bg-surface-container-low transition-colors">
                    <div className="flex items-center gap-3 font-bold text-on-surface text-[15px]">
                      <span className="material-symbols-outlined text-primary text-[24px]">folder</span>
                      <span>{folder.name}</span>
                      <span className="text-xs font-normal text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">{folderProjects.length}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button className="text-outline hover:text-primary p-1 rounded hover:bg-surface-container-high" title="Nytt projekt i mapp" onClick={(e) => { e.stopPropagation(); createProject(folder.id); }}>
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                      <button className="text-outline hover:text-primary p-1 rounded hover:bg-surface-container-high" title="Ändra namn" onClick={(e) => renameFolder(folder.id, e)}>
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button className="text-outline hover:text-error p-1 rounded hover:bg-surface-container-high" title="Ta bort" onClick={(e) => deleteFolder(folder.id, e)}>
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {folderProjects.length === 0 && (
                      <div className="text-sm text-on-surface-variant italic py-2 pl-2 col-span-full">Inga projekt i denna mapp</div>
                    )}
                    {folderProjects.map(p => (
                      <div
                        key={p.id} 
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('projectId', p.id);
                        }}
                        onDragOver={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           e.currentTarget.classList.add('border-primary', 'shadow-md');
                        }}
                        onDragLeave={(e) => e.currentTarget.classList.remove('border-primary', 'shadow-md')}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove('border-primary', 'shadow-md');
                          const dragId = e.dataTransfer.getData('projectId');
                          if (dragId && dragId !== p.id) {
                            reorderProjects(dragId, p.id, folder.id);
                          }
                        }}
                        className={`flex flex-col group p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all border border-l-4 shadow-sm ${activeProjectId === p.id ? 'bg-primary/5 border-primary border-l-primary text-primary' : 'bg-surface border-outline-variant border-l-outline-variant hover:border-primary/50 text-on-surface'}`} 
                        onClick={() => switchProject(p.id)}
                      >
                        <div className="flex flex-col mb-3">
                          <div className="flex items-start gap-2 min-w-0 pointer-events-none mb-1">
                            <span className={`material-symbols-outlined text-[20px] ${activeProjectId === p.id ? '' : 'text-primary/70'}`}>article</span>
                            <span className="font-semibold text-sm line-clamp-2 leading-tight flex-1">{p.projectInfo.name || 'Namnlöst kalkylprojekt'}</span>
                          </div>
                          {(p.projectInfo.startDate || p.projectInfo.endDate) && (
                            <div className="text-[10px] text-on-surface-variant flex gap-2 pl-7 pointer-events-none">
                              {p.projectInfo.startDate && <span><i className="fa-regular fa-calendar mr-1"></i>{p.projectInfo.startDate}</span>}
                              {p.projectInfo.startDate && p.projectInfo.endDate && <span>-</span>}
                              {p.projectInfo.endDate && <span><i className="fa-regular fa-calendar-check mr-1"></i>{p.projectInfo.endDate}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-outline-variant/50">
                          <div>
                            <StatusPill status={p.projectInfo.status} />
                          </div>
                          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button className={`p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors ${activeProjectId === p.id ? 'text-primary' : 'text-outline hover:text-primary'}`} title="Ändra projektnamn" onClick={(e) => renameProject(p.id, e)}>
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                            </button>
                            <button className={`p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors ${activeProjectId === p.id ? 'text-primary' : 'text-outline hover:text-primary'}`} title="Kopiera projekt" onClick={(e) => duplicateProject(p.id, e)}>
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            </button>
                            {projects.length > 1 && (
                              <button className={`p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-error/10 transition-colors ${activeProjectId === p.id ? 'text-primary hover:text-error' : 'text-outline hover:text-error'}`} title="Ta bort" onClick={(e) => deleteProject(p.id, e)}>
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div
              className="mt-6 border-t border-outline-variant pt-4 min-h-[100px] pb-10 rounded-xl"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-surface-container-lowest', 'shadow-inner'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('bg-surface-container-lowest', 'shadow-inner')}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-surface-container-lowest', 'shadow-inner');
                const projId = e.dataTransfer.getData('projectId');
                if (projId) {
                  reorderProjects(projId, null, null);
                }
              }}
            >
              <div className="flex items-center gap-2 px-2 mb-3">
                <span className="material-symbols-outlined text-outline">inventory_2</span>
                <h3 className="text-sm font-bold tracking-wide text-on-surface-variant uppercase">Osorterade projekt</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {filteredProjects.filter(p => !p.folderId).map(p => (
                  <div
                    key={p.id} 
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData('projectId', p.id);
                    }}
                    onDragOver={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       e.currentTarget.classList.add('border-primary', 'shadow-md');
                    }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('border-primary', 'shadow-md')}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-primary', 'shadow-md');
                      const dragId = e.dataTransfer.getData('projectId');
                      if (dragId && dragId !== p.id) {
                        reorderProjects(dragId, p.id, null);
                      }
                    }}
                    className={`flex flex-col group p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all border border-l-4 shadow-sm ${activeProjectId === p.id ? 'bg-primary/5 border-primary border-l-primary text-primary' : 'bg-surface border-outline-variant border-l-outline-variant hover:border-primary/50 text-on-surface'}`} 
                    onClick={() => switchProject(p.id)}
                  >
                    <div className="flex flex-col mb-3">
                      <div className="flex items-start gap-2 min-w-0 pointer-events-none mb-1">
                        <span className={`material-symbols-outlined text-[20px] ${activeProjectId === p.id ? '' : 'text-primary/70'}`}>article</span>
                        <span className="font-semibold text-sm line-clamp-2 leading-tight flex-1">{p.projectInfo.name || 'Namnlöst kalkylprojekt'}</span>
                      </div>
                      {(p.projectInfo.startDate || p.projectInfo.endDate) && (
                        <div className="text-[10px] text-on-surface-variant flex gap-2 pl-7 pointer-events-none">
                          {p.projectInfo.startDate && <span><i className="fa-regular fa-calendar mr-1"></i>{p.projectInfo.startDate}</span>}
                          {p.projectInfo.startDate && p.projectInfo.endDate && <span>-</span>}
                          {p.projectInfo.endDate && <span><i className="fa-regular fa-calendar-check mr-1"></i>{p.projectInfo.endDate}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-outline-variant/50">
                      <div>
                        <StatusPill status={p.projectInfo.status} />
                      </div>
                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button className={`p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors ${activeProjectId === p.id ? 'text-primary' : 'text-outline hover:text-primary'}`} title="Ändra projektnamn" onClick={(e) => renameProject(p.id, e)}>
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        <button className={`p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors ${activeProjectId === p.id ? 'text-primary' : 'text-outline hover:text-primary'}`} title="Kopiera projekt" onClick={(e) => duplicateProject(p.id, e)}>
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        </button>
                        {projects.length > 1 && (
                          <button className={`p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-error/10 transition-colors ${activeProjectId === p.id ? 'text-primary hover:text-error' : 'text-outline hover:text-error'}`} title="Ta bort" onClick={(e) => deleteProject(p.id, e)}>
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log Section */}
        <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden mt-8">
          <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            <h2 className="text-lg font-bold text-on-surface">Aktivitetslogg</h2>
          </div>
          <div className="p-6">
            {(() => {
              const allLogs = projects.flatMap(p => 
                (p.activityLogs || []).map(log => ({ ...log, projectName: p.projectInfo.name || 'Okänt projekt' }))
              ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

              if (allLogs.length === 0) {
                return <div className="text-sm text-on-surface-variant italic py-4 text-center">Inga händelser registrerade ännu.</div>;
              }

              return (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant before:to-transparent">
                  {allLogs.map((log, i) => (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-primary/10 text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <span className="material-symbols-outlined text-[16px]">{log.action.includes('status') ? 'sync_alt' : (log.action.includes('bort') ? 'delete' : 'save')}</span>
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-on-surface text-sm">{log.action}</span>
                          <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded-full">
                            {new Date(log.timestamp).toLocaleString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-on-surface-variant mb-1">{log.projectName}</div>
                        {log.details && <div className="text-sm text-on-surface-variant/80">{log.details}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}
