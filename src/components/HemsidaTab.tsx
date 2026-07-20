import React, { useState, useEffect } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
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
  createFolder: (parentId?: string) => void;
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
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

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

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
    e.dataTransfer.setData('dragFolderId', folderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    const dragFolderId = e.dataTransfer.getData('dragFolderId');
    
    if (projectId) {
      reorderProjects(projectId, null, targetFolderId);
    } else if (dragFolderId && dragFolderId !== targetFolderId) {
      // Allow moving folder into another folder, or root (if targetFolderId is null)
      reorderFolders(dragFolderId, targetFolderId || '');
    }
  };

  const completedProjects = (projects || []).filter(p => p?.projectInfo?.status === 'Klar' || p?.projectInfo?.status === 'Avslutat');
  const ongoingProjects = (projects || []).filter(p => p?.projectInfo?.status === 'Pågående' || !p?.projectInfo?.status);

  const filteredProjects = (projects || []).filter(p => {
    if (!p) return false;
    if (statusFilter === 'Alla') return true;
    const status = p?.projectInfo?.status || 'Pågående';
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

      
      <div className="h-[800px] mt-8 w-full border border-outline-variant rounded-2xl overflow-hidden shadow-sm bg-surface">
        <PanelGroup orientation="horizontal">
          
          {/* Panel 1: Kalkylprojekt */}
          <Panel defaultSize={40} minSize={20}>
            <div className="bg-surface overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest">
                <div>
                  <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">folder_open</span> Projekt
                  </h2>
                  <p className="text-sm text-on-surface-variant mt-1">Hantera dina projekt och mappar</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select 
                    className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="Alla">Alla statusar</option>
                    <option value="Pågående">Pågående</option>
                    <option value="Väntande">Väntande</option>
                    <option value="Klar">Färdigställda</option>
                  </select>
                  <button 
                    onClick={() => createFolder()} 
                    className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
                    Ny mapp
                  </button>
                  <button 
                    onClick={() => createProject(null)} 
                    className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nytt projekt
                  </button>
                </div>
              </div>
              
              <div className="p-0 overflow-y-auto flex-1">
                
                {/* Folders */}
                {folders.filter(f => !f.parentId).map(folder => {
                  const renderFolder = (folder: ProjectFolder, depth: number) => {
                    const childFolders = folders.filter(f => f.parentId === folder.id);
                    const childProjects = filteredProjects.filter(p => p.folderId === folder.id);
                    return (
                      <div key={folder.id} className="border-b border-outline-variant/50 last:border-b-0"
                        onDragOver={handleDragOver}
                        onDrop={(e) => { e.stopPropagation(); handleDrop(e, folder.id); }}
                      >
                        <div 
                          className="px-6 py-3 bg-surface-container-lowest flex items-center justify-between group cursor-pointer hover:bg-surface-container-low transition-colors"
                          onClick={(e) => toggleFolder(folder.id, e)}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleFolderDragStart(e, folder.id); }}
                          style={{ paddingLeft: `${1.5 + depth * 1.5}rem` }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200" style={{ transform: collapsedFolders[folder.id] ? 'rotate(-90deg)' : 'none' }}>
                              expand_more
                            </span>
                            <span className="material-symbols-outlined text-primary">folder</span>
                            <span className="font-bold text-on-surface">{folder.name}</span>
                            <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                              {childProjects.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button className="p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors text-outline hover:text-primary" title="Ändra namn" onClick={(e) => renameFolder(folder.id, e)}>
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                            </button>
                            <button className="p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors text-outline hover:text-primary" title="Skapa undermapp här" onClick={(e) => { e.stopPropagation(); createFolder(folder.id); }}>
                              <span className="material-symbols-outlined text-[14px]">create_new_folder</span>
                            </button>
                            <button className="p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors text-outline hover:text-primary" title="Skapa projekt här" onClick={(e) => { e.stopPropagation(); createProject(folder.id); }}>
                              <span className="material-symbols-outlined text-[14px]">add</span>
                            </button>
                            <button className="p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-error/10 transition-colors text-outline hover:text-error" title="Ta bort mapp" onClick={(e) => deleteFolder(folder.id, e)}>
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
                        </div>
                        
                        <div 
                          className={`flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}
                          style={{ 
                            maxHeight: collapsedFolders[folder.id] ? '0px' : '2000px',
                            opacity: collapsedFolders[folder.id] ? 0 : 1
                          }}
                        >
                          {childFolders.map(cf => renderFolder(cf, depth + 1))}
                          {childProjects.map(p => (
                            <div 
                              key={p.id} 
                              draggable
                              onDragStart={(e) => handleDragStart(e, p.id)}
                              className={`group flex flex-col p-4 border-b border-outline-variant/30 last:border-b-0 hover:bg-primary/5 transition-all cursor-pointer ${activeProjectId === p.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                              onClick={() => switchProject(p.id)}
                              style={{ paddingLeft: `${1.5 + (depth + 1) * 1.5}rem` }}
                            >
                              <div className="flex flex-col mb-3">
                                <div className="flex items-start gap-2 min-w-0 pointer-events-none mb-1">
                                  <span className={`material-symbols-outlined text-[20px] ${activeProjectId === p.id ? '' : 'text-primary/70'}`}>article</span>
                                  <span className="font-semibold text-sm line-clamp-2 leading-tight flex-1">{p.projectInfo.name || 'Namnlöst projekt'}</span>
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
                                  <button className={`p-1 w-6 h-6 flex items-center justify-center rounded hover:bg-error/10 transition-colors ${activeProjectId === p.id ? 'text-primary hover:text-error' : 'text-outline hover:text-error'}`} title="Ta bort" onClick={(e) => deleteProject(p.id, e)}>
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  };
                  return renderFolder(folder, 0);
                })}
{/* Root Projects */}
                  <div className="border-t border-outline-variant/50 mt-4 first:border-t-0 first:mt-0 pb-16 min-h-[150px]"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, null)}
                  >
                    <div className="px-6 py-3 bg-surface-container-lowest flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">horizontal_rule</span>
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Okategoriserade</span>
                    </div>
                    <div className="flex flex-col">
                      {filteredProjects.filter(p => !p.folderId).length === 0 && (
                        <div className="text-center py-6 text-sm text-on-surface-variant/50 font-bold border-2 border-dashed border-outline-variant/30 rounded-xl mx-4 mt-2 mb-4 pointer-events-none">
                          Dra hit projekt för att ta bort från mapp
                        </div>
                      )}
                      {filteredProjects.filter(p => !p.folderId).map(p => (
                        <div 
                          key={p.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, p.id)}
                          className={`group flex flex-col p-4 border-b border-outline-variant/30 last:border-b-0 hover:bg-primary/5 transition-all cursor-pointer ${activeProjectId === p.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                          onClick={() => switchProject(p.id)}
                        >
                          <div className="flex flex-col mb-3">
                            <div className="flex items-start gap-2 min-w-0 pointer-events-none mb-1">
                              <span className={`material-symbols-outlined text-[20px] ${activeProjectId === p.id ? '' : 'text-primary/70'}`}>article</span>
                              <span className="font-semibold text-sm line-clamp-2 leading-tight flex-1">{p.projectInfo.name || 'Namnlöst projekt'}</span>
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
          </Panel>

          <PanelResizeHandle className="w-2 bg-surface-container-highest hover:bg-primary/50 active:bg-primary transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-1 h-8 bg-outline-variant rounded-full" />
          </PanelResizeHandle>
          
          {/* Panel 2: Aktivitetslogg */}
          <Panel defaultSize={30} minSize={20}>
            <div className="bg-surface overflow-hidden flex flex-col h-full border-l border-outline-variant">
              <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                <h2 className="text-lg font-bold text-on-surface">Aktivitetslogg</h2>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
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
          </Panel>

          <PanelResizeHandle className="w-2 bg-surface-container-highest hover:bg-primary/50 active:bg-primary transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-1 h-8 bg-outline-variant rounded-full" />
          </PanelResizeHandle>
          
          {/* Panel 3: Portfolio */}
          <Panel defaultSize={30} minSize={20}>
            <div className="bg-surface overflow-hidden flex flex-col h-full border-l border-outline-variant">
              <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">cases</span>
                <h2 className="text-lg font-bold text-on-surface">Portfolio & Nyckeltal</h2>
              </div>
              <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
                
                {(() => {
                  const totalContractValue = projects.reduce((acc, p) => acc + (Number(p.projectInfo.contractValue) || 0), 0);
                  const totalBta = projects.reduce((acc, p) => acc + (Number(p.projectInfo.bta) || 0), 0);
                  
                  const statusCounts = projects.reduce((acc, p) => {
                    const status = p.projectInfo.status || 'Pågående';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  const pieData = Object.keys(statusCounts).map(key => ({
                    name: key,
                    value: statusCounts[key]
                  }));
                  
                  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
                          <span className="text-xs font-bold text-on-surface-variant uppercase mb-1">Totalt Värde</span>
                          <span className="text-xl font-black text-on-surface">{totalContractValue.toLocaleString('sv-SE')} kr</span>
                        </div>
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
                          <span className="text-xs font-bold text-on-surface-variant uppercase mb-1">Total BTA</span>
                          <span className="text-xl font-black text-on-surface">{totalBta.toLocaleString('sv-SE')} m²</span>
                        </div>
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
                          <span className="text-xs font-bold text-on-surface-variant uppercase mb-1">Snittvärde/Projekt</span>
                          <span className="text-xl font-black text-on-surface">{projects.length > 0 ? (totalContractValue / projects.length).toLocaleString('sv-SE', {maximumFractionDigits: 0}) : 0} kr</span>
                        </div>
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col">
                          <span className="text-xs font-bold text-on-surface-variant uppercase mb-1">Totala Projekt</span>
                          <span className="text-xl font-black text-on-surface">{projects.length} st</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-sm font-bold text-on-surface mb-4">Projektstatus</h3>
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => [`${value} st`, 'Antal']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-2">
                          {pieData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                              {entry.name} ({entry.value})
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-6">
                        <button className="w-full px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">download</span> Exportera Rapport
                        </button>
                      </div>
                    </>
                  );
                })()}

              </div>
            </div>
          </Panel>
</PanelGroup>
      </div>
    </div>
  );
}
