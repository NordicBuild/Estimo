import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Material, ArbetsMoment, ProjectFolder, SavedProject, ProjectInfo, INITIAL_PROJECT_INFO, CompanyInfo, INITIAL_COMPANY_INFO, INITIAL_MATERIALS, INITIAL_ARBETS_DATA, Byggdel, UserSettings, INITIAL_USER_SETTINGS } from '../data';
import { User } from '@supabase/supabase-js';

export function useSupabaseData(
  user: User | null,
  appMode: 'kalkyl' | 'admin',
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void
) {
  const [folders, setFolders] = useState<ProjectFolder[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('betong_folders') || '[]');
    } catch { return []; }
  });

  const [projects, setProjects] = useState<SavedProject[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('betong_saved_projects') || '[]');
      if (saved.length > 0) return saved;
    } catch {}
    return [{
      id: 'default',
      folderId: null,
      byggdelar: [],
      projectInfo: INITIAL_PROJECT_INFO,
      settings: {
        fTim: 425, fOrg: 0.22, fForbr: 0.03, fMaskin: 85, fTrakt: 0, vMatP: 0.10, vArbP: 0.15,
        tRate: 425, mRate: 85, trRate: 0, timeFactor: 1.0
      }
    }];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return localStorage.getItem('betong_active_project_id') || 'default';
  });

  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(projects.find(p => p.id === activeProjectId)?.projectInfo || INITIAL_PROJECT_INFO);
  const [byggdelar, setByggdelar] = useState<Byggdel[]>(projects.find(p => p.id === activeProjectId)?.byggdelar || []);
  const [settings, setSettings] = useState(projects.find(p => p.id === activeProjectId)?.settings || {
    fTim: 425, fOrg: 0.22, fForbr: 0.03, fMaskin: 85, fTrakt: 0, vMatP: 0.10, vArbP: 0.15,
    tRate: 425, mRate: 85, trRate: 0, timeFactor: 1.0
  });

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    try {
      const saved = localStorage.getItem('betong_company_info');
      return saved ? { ...INITIAL_COMPANY_INFO, ...JSON.parse(saved) } : INITIAL_COMPANY_INFO;
    } catch {
      return INITIAL_COMPANY_INFO;
    }
  });

  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('betong_user_settings');
      return saved ? { ...INITIAL_USER_SETTINGS, ...JSON.parse(saved) } : INITIAL_USER_SETTINGS;
    } catch {
      return INITIAL_USER_SETTINGS;
    }
  });

  const [materials, setMaterials] = useState<Material[]>([]);
  const [arbetsData, setArbetsData] = useState<ArbetsMoment[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataSpaceId, setDataSpaceId] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'manager' | 'user' | null>(null);
  
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('betong_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!user) {
      setMaterials(INITIAL_MATERIALS);
      setArbetsData(INITIAL_ARBETS_DATA);
      setDataLoaded(true);
      setDataSpaceId(null);
      return;
    }

    const loadData = async () => {
      let allUsers: any[] = [];
      try {
        const { data: usersData, error } = await supabase.from('app_state').select('data').eq('id', 'global_users').single();
        if (error) throw error;
        allUsers = usersData?.data || [];
      } catch(e) {
        const local = localStorage.getItem('betong_global_users');
        if (local) allUsers = JSON.parse(local);
      }
      let appUser = allUsers.find((u: any) => u.email.toLowerCase() === user.email?.toLowerCase());

      const isHardcodedAdmin = user.email?.toLowerCase() === 'mtoumia@gmail.com' || user.email?.toLowerCase().includes('admin');
      const isHardcodedUser = user.email?.toLowerCase() === 'user@estimo.se';

      if (isHardcodedAdmin) {
        appUser = { id: appUser?.id || 'admin_override', email: user.email, role: 'admin', companyId: appUser?.companyId || `admin_comp_${user.id}` };
      } else if (!appUser && isHardcodedUser) {
        appUser = { id: 'user_override', email: user.email, role: 'user', companyId: `user_comp_demo` };
      }

      if (!appUser) {
        setAccessDenied(true);
        setDataLoaded(true);
        return;
      }

      if (appMode === 'admin' && appUser.role !== 'admin') {
        setAccessDenied(true);
        setDataLoaded(true);
        return;
      }

      setCurrentUserRole(appUser.role);
      const dsId = appUser.companyId && appUser.role !== 'admin' ? appUser.companyId : user.id;
      setDataSpaceId(dsId);

      const { data: sessionData, error: sessionError } = await supabase
        .from('app_state')
        .select('id, data')
        .in('id', [
          `materials_${dsId}`,
          `arbetsmoments_${dsId}`,
          `folders_${dsId}`,
          `projects_${dsId}`,
          `company_info_${dsId}`,
          `custom_categories_${dsId}`,
          `active_project_id_${user.id}`,
          `projects_${user.id}`,
          `materials_all`,
          `arbetsmoments_all`
        ]);

      if (sessionError) {
        setDbReady(false);
        if (sessionError.code === '42P01') {
          showNotification('Tabellen "app_state" saknas i Supabase! Skapa den i SQL Editor.', 'error');
        } else {
          console.warn("Supabase varning (laddar lokalt data istället):", sessionError.message || sessionError);
        }
      } else {
        setDbReady(true);
      }

      if (sessionData) {
        const matsDoc = sessionData.find(d => d.id === `materials_${dsId}`);
        if (matsDoc && !localStorage.getItem('betong_materials')) {
          setMaterials(matsDoc.data as Material[]);
        } else {
          const localMats = localStorage.getItem('betong_materials');
          const oldMatsDoc = sessionData.find(d => d.id === 'materials_all');
          const dataToSet = localMats ? JSON.parse(localMats) : (oldMatsDoc ? oldMatsDoc.data as Material[] : INITIAL_MATERIALS);
          try { await supabase.from('app_state').upsert({ id: `materials_${dsId}`, data: dataToSet }); } catch(e) {}
          setMaterials(dataToSet);
        }

        const arbDoc = sessionData.find(d => d.id === `arbetsmoments_${dsId}`);
        if (arbDoc && !localStorage.getItem('betong_arbetsmoments')) {
          setArbetsData(arbDoc.data as ArbetsMoment[]);
        } else {
          const localArbs = localStorage.getItem('betong_arbetsmoments');
          const oldArbDoc = sessionData.find(d => d.id === 'arbetsmoments_all');
          const dataToSet = localArbs ? JSON.parse(localArbs) : (oldArbDoc ? oldArbDoc.data as ArbetsMoment[] : INITIAL_ARBETS_DATA);
          try { await supabase.from('app_state').upsert({ id: `arbetsmoments_${dsId}`, data: dataToSet }); } catch(e) {}
          setArbetsData(dataToSet);
        }

        const foldersDoc = sessionData.find(d => d.id === `folders_${dsId}`);
        if (foldersDoc) setFolders(foldersDoc.data);

        const projectsDoc = sessionData.find(d => d.id === `projects_${dsId}`);
        if (projectsDoc) {
          setProjects(projectsDoc.data || []);
        } else {
          const oldProjectsDoc = sessionData.find(d => d.id === `projects_${user.id}`);
          if (oldProjectsDoc) {
            await supabase.from('app_state').upsert({ id: `projects_${dsId}`, data: oldProjectsDoc.data });
            setProjects(oldProjectsDoc.data || []);
          }
        }

        const currentProjects = projectsDoc ? projectsDoc.data : (sessionData.find(d => d.id === `projects_${user.id}`)?.data || []);
        const activeProjDoc = sessionData.find(d => d.id === `active_project_id_${user.id}`);
        const activeId = activeProjDoc?.data || 'default';
        const proj = (currentProjects || []).find((p: any) => p.id === activeId) || (currentProjects || [])[0];
          
        if (proj) {
          setActiveProjectId(proj.id);
          setByggdelar(proj.byggdelar);
          setProjectInfo(proj.projectInfo);
          setSettings(proj.settings);
        }

        const companyInfoDoc = sessionData.find(d => d.id === `company_info_${dsId}`);
        if (companyInfoDoc) setCompanyInfo(companyInfoDoc.data);

        const userSettingsDoc = sessionData.find(d => d.id === `user_settings_${user.id}`);
        if (userSettingsDoc) setUserSettings(userSettingsDoc.data);

        const customCategoriesDoc = sessionData.find(d => d.id === `custom_categories_${dsId}`);
        if (customCategoriesDoc) setCustomCategories(customCategoriesDoc.data);
      } else {
        const localMaterials = localStorage.getItem('betong_materials');
        if (localMaterials) setMaterials(JSON.parse(localMaterials));

        const localArbs = localStorage.getItem('betong_arbetsmoments');
        if (localArbs) setArbetsData(JSON.parse(localArbs));

        const localFolders = localStorage.getItem('betong_folders');
        if (localFolders) setFolders(JSON.parse(localFolders));

        const localProjects = localStorage.getItem('betong_saved_projects');
        if (localProjects) {
          const parsedProj = JSON.parse(localProjects);
          setProjects(parsedProj);
          const activeId = localStorage.getItem('betong_active_project_id') || 'default';
          const proj = parsedProj.find((p: any) => p.id === activeId) || parsedProj[0];
          if (proj) {
            setActiveProjectId(proj.id);
            setByggdelar(proj.byggdelar);
            setProjectInfo(proj.projectInfo);
            setSettings(proj.settings);
          }
        }

        const localCompany = localStorage.getItem('betong_company_info');
        if (localCompany) setCompanyInfo(JSON.parse(localCompany));

        const localUserSettings = localStorage.getItem('betong_user_settings');
        if (localUserSettings) setUserSettings(JSON.parse(localUserSettings));

        const localCategories = localStorage.getItem('betong_custom_categories');
        if (localCategories) setCustomCategories(JSON.parse(localCategories));
      }

      setDataLoaded(true);
      return null;
    };

    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    loadData().then(c => { 
      if (c) {
        if (!isMounted) {
          supabase.removeChannel(c);
        } else {
          activeChannel = c as any;
        }
      }
    });

    return () => {
      isMounted = false;
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, [user, appMode]);
  
  useEffect(() => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === activeProjectId ? {
        ...p,
        byggdelar,
        projectInfo: { ...projectInfo, name: projectInfo.name || 'Nytt Projekt' },
        settings
      } : p);
      localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
      return updated;
    });
  }, [byggdelar, projectInfo, settings, activeProjectId]);

  useEffect(() => {
    localStorage.setItem('betong_folders', JSON.stringify(folders));
    if (dbReady && dataSpaceId) supabase.from('app_state').upsert({ id: `folders_${dataSpaceId}`, data: folders }).then(({error}) => {
      if (error) console.warn("folder sync error", error);
    });
  }, [folders, dataSpaceId, dbReady]);

  useEffect(() => {
    localStorage.setItem('betong_active_project_id', activeProjectId);
    if (dbReady && user) supabase.from('app_state').upsert({ id: `active_project_id_${user.id}`, data: activeProjectId }).then(({error}) => {
      if (error) console.warn("active project sync error", error);
    });
  }, [activeProjectId, user, dbReady]);

  useEffect(() => {
    localStorage.setItem('betong_custom_categories', JSON.stringify(customCategories));
    if (dbReady && dataSpaceId) supabase.from('app_state').upsert({ id: `custom_categories_${dataSpaceId}`, data: customCategories }).then(({error}) => {
      if (error) console.warn("custom categories sync error", error);
    });
  }, [customCategories, dataSpaceId, dbReady]);

  useEffect(() => {
    localStorage.setItem('betong_company_info', JSON.stringify(companyInfo));
    if (dbReady && dataSpaceId) supabase.from('app_state').upsert({ id: `company_info_${dataSpaceId}`, data: companyInfo }).then(({error}) => {
      if (error) console.warn("company info sync error", error);
    });
  }, [companyInfo, dataSpaceId, dbReady]);

  useEffect(() => {
    localStorage.setItem('betong_user_settings', JSON.stringify(userSettings));
    if (dbReady && user) supabase.from('app_state').upsert({ id: `user_settings_${user.id}`, data: userSettings }).then(({error}) => {
      if (error) console.warn("user settings sync error", error);
    });
  }, [userSettings, user, dbReady]);

  useEffect(() => {
    if (projects.length > 0) {
      if (dbReady && dataSpaceId) supabase.from('app_state').upsert({ id: `projects_${dataSpaceId}`, data: projects }).then(({error}) => {
        if (error) console.warn("projects sync error", error);
      });
    }
  }, [projects, dataSpaceId, dbReady]);

  const switchProject = (newId: string) => {
    const target = projects.find(p => p.id === newId);
    if (target) {
      setByggdelar(target.byggdelar);
      setProjectInfo(target.projectInfo);
      setSettings(target.settings);
      setActiveProjectId(newId);
    }
  };

  return {
    folders, setFolders,
    projects, setProjects,
    activeProjectId, setActiveProjectId,
    projectInfo, setProjectInfo,
    byggdelar, setByggdelar,
    settings, setSettings,
    companyInfo, setCompanyInfo,
    userSettings, setUserSettings,
    materials, setMaterials,
    arbetsData, setArbetsData,
    dataLoaded, setDataLoaded,
    dataSpaceId, setDataSpaceId,
    accessDenied, setAccessDenied,
    currentUserRole, setCurrentUserRole,
    customCategories, setCustomCategories,
    switchProject
  };
}
