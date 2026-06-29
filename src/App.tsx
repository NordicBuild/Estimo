import React, { useState, useMemo, useEffect, useRef } from "react";
import { INITIAL_MATERIALS, INITIAL_ARBETS_DATA, Material, ArbetsMoment, Byggdel, INITIAL_TIDSFAKTORER, TYPE_UNIT, ProjectInfo, CompanyInfo, INITIAL_PROJECT_INFO, INITIAL_COMPANY_INFO, SavedProject, ProjectFolder } from "./data";
import { useCalculation } from "./useCalculation";
// import removed
import { AdminTab } from "./components/AdminTab";
import { ByggdelModal } from "./components/ByggdelModal";
import { ErfarenhetModal } from "./components/ErfarenhetModal";
import { TabRouter } from "./components/Workspace/TabRouter";
import { Header } from "./components/Header";
import { useDialog } from './hooks/useDialog';
import { useAppAuth } from './hooks/useAppAuth';
import { useByggdelModal } from './hooks/useByggdelModal';
import { useSupabaseData } from './hooks/useSupabaseData';
import { WorkspaceActions, WorkspaceNav } from "./components/WorkspaceToolbar";
import { supabase, logout, loginWithGoogle } from "./supabase";
import { User } from '@supabase/supabase-js';
// import removed
import { calculateBaseMoments, calculateDefaultMoments } from "./calculationHelpers";


import { AuthProvider } from './state/AuthContext';
import { ProjectDataProvider } from './state/ProjectDataContext';
import { KalkylHistoryProvider } from './state/KalkylHistoryContext';

export default function App() {
  const [appMode, setAppMode] = useState<'kalkyl' | 'admin'>(() => (localStorage.getItem('betong_app_mode') as any) || 'kalkyl');
  const [activeTab, setActiveTab] = useState<'hemsida' | 'projekt' | 'kalkyl' | 'pdf' | 'bim' | 'material' | 'arbete' | 'analys' | 'sammanstalln' | 'planering' | 'slutsida' | 'anbud' | 'inkop' | 'prognos' | 'admin' | 'maskiner' | 'bilar' | 'ovrigt' | 'dokument_ffu' | 'dokument_modell' | 'dokument_kommunikation' | 'arbetare' | 'fastigheter' | 'receptbibliotek' | 'mina_uppgifter'>(() => {
    return (localStorage.getItem('betong_active_tab') as any) || 'projekt';
  });
  const [adminSubTab, setAdminSubTab] = useState<'oversikt' | 'kunder' | 'fakturor' | 'register' | 'installningar'>(() => {
    return (localStorage.getItem('betong_admin_subtab') as any) || 'oversikt';
  });
  
  const {
    user,
    profile,
    refreshProfile,
    isAdmin,
    authInitialized,
    manualEmail,
    setManualEmail,
    manualPassword,
    setManualPassword,
    manualLoginError,
    setManualLoginError,
    loginMode,
    setLoginMode,
    handleManualLogin,
    handleLogout,
    loginWithGoogle
  } = useAppAuth(appMode, setAppMode);

  useEffect(() => {
    localStorage.setItem('betong_app_mode', appMode);
  }, [appMode]);

  useEffect(() => {
    localStorage.setItem('betong_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('betong_admin_subtab', adminSubTab);
  }, [adminSubTab]);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dialogConfig, confirmAction, promptAction } = useDialog();
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const {
    folders, setFolders,
    projects, setProjects,
    activeProjectId, setActiveProjectId,
    projectInfo, setProjectInfo,
    byggdelar, setByggdelar: setSupabaseByggdelar,
    settings, setSettings,
    companyInfo, setCompanyInfo,
    userSettings, setUserSettings,
    materials, setMaterials,
    arbetsData, setArbetsData,
    companyTidsfaktorer, setCompanyTidsfaktorer,
    dataLoaded, setDataLoaded,
    dataSpaceId, setDataSpaceId,
    accessDenied, setAccessDenied,
    needsOnboarding, setNeedsOnboarding,
    currentUserRole, setCurrentUserRole,
    customCategories, setCustomCategories,
    byggdelTemplates, addTemplate, deleteTemplate,
    switchProject
  } = useSupabaseData(user, appMode, showNotification);

  const [byggdelHistory, setByggdelHistory] = useState<Byggdel[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Initialize history when project changes
  useEffect(() => {
    setByggdelHistory([byggdelar]);
    setHistoryIndex(0);
  }, [activeProjectId]);

  const setByggdelar = (update: React.SetStateAction<Byggdel[]>) => {
    setSupabaseByggdelar(prev => {
      const next = typeof update === 'function' ? (update as any)(prev) : update;
      
      setByggdelHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(next);
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(idx => Math.min(idx + 1, 50));
      
      return next;
    });
  };

  const undoByggdelar = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSupabaseByggdelar(byggdelHistory[newIndex]);
    }
  };

  const redoByggdelar = () => {
    if (historyIndex < byggdelHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSupabaseByggdelar(byggdelHistory[newIndex]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
          // Let native undo work in input fields
          return;
        }
        e.preventDefault();
        if (e.shiftKey) {
          redoByggdelar();
        } else {
          undoByggdelar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, byggdelHistory]);

  const createFolder = () => {
    promptAction("Ny mapp", "Namn på ny mapp:", "", (name) => {
      if (name && name.trim()) {
        setFolders(prev => [...prev, { id: 'folder_' + Date.now(), name: name.trim() }]);
      }
    });
  };

  const getNextProjectNumber = () => {
    let maxNr = 0;
    projects.forEach(p => {
      const nrStr = (p.projectInfo.nr || '').trim();
      const nr = parseInt(nrStr, 10);
      if (!isNaN(nr) && Number.isInteger(nr) && String(nr) === nrStr && nr > maxNr) {
        maxNr = nr;
      }
    });
    return maxNr > 0 ? (maxNr + 1).toString() : '1001';
  };

  const createProject = (folderId: string | null = null) => {
    const nextNr = getNextProjectNumber();
    promptAction("Nytt projekt", "Projektnamn:", "", (name) => {
      if (name && name.trim()) {
        const newProj: SavedProject = {
          id: 'proj_' + Date.now(),
          folderId,
          byggdelar: [],
          projectInfo: { ...INITIAL_PROJECT_INFO, name: name.trim(), nr: nextNr },
          settings: {
            fTim: 425, fOrg: 0.22, fForbr: 0.03, fMaskin: 85, fTrakt: 0, vMatP: userSettings.defaultMargin, vArbP: userSettings.defaultMargin,
            tRate: 425, mRate: 85, trRate: 0, timeFactor: 1.0
          }
        };
        setProjects(prev => {
          const updated = [...prev, newProj];
          localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
          return updated;
        });
        setByggdelar(newProj.byggdelar);
        setProjectInfo(newProj.projectInfo);
        setSettings(newProj.settings);
        setActiveProjectId(newProj.id);
        if (window.innerWidth < 1024) setSidebarOpen(false);
      }
    });
  };

  const duplicateProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = projects.find(p => p.id === id);
    if (!target) return;
    
    const newProj: SavedProject = {
      ...target,
      id: 'proj_' + Date.now(),
      projectInfo: { ...target.projectInfo, name: `${target.projectInfo.name} (Kopia)` }
    };
    
    setProjects(prev => {
      const updated = [...prev, newProj];
      localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
      return updated;
    });
    setByggdelar(newProj.byggdelar);
    setProjectInfo(newProj.projectInfo);
    setSettings(newProj.settings);
    setActiveProjectId(newProj.id);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmAction("Ta bort projekt", "Är du säker på att du vill ta bort detta projekt?", () => {
      const deletedProject = projects.find(p => p.id === id);
      if (!deletedProject) return;

      let updatedList = projects.filter(p => p.id !== id);
      
      if (updatedList.length === 0) {
        const fallbackId = 'proj_' + Date.now();
        const fallbackProject: SavedProject = {
          id: fallbackId,
          folderId: null,
          byggdelar: [],
          projectInfo: { ...INITIAL_PROJECT_INFO, nr: getNextProjectNumber() },
          settings: {
            fTim: 425, fOrg: 0.22, fForbr: 0.03, fMaskin: 85, fTrakt: 0, vMatP: userSettings.defaultMargin, vArbP: userSettings.defaultMargin,
            tRate: 425, mRate: 85, trRate: 0, timeFactor: 1.0
          }
        };
        updatedList = [fallbackProject];
      }

      setProjects(updatedList);
      localStorage.setItem('betong_saved_projects', JSON.stringify(updatedList));
      
      if (activeProjectId === id) {
        const next = updatedList[0];
        setByggdelar(next.byggdelar);
        setProjectInfo(next.projectInfo);
        setSettings(next.settings);
        setActiveProjectId(next.id);
      }

      showUndoToast(`Projekt '${deletedProject.projectInfo.name}' borttaget`, () => {
        setProjects(prev => {
          // If the fallback project is empty and is the only other project, we might want to drop it
          // But appending is fine
          const isOnlyFallback = prev.length === 1 && prev[0].projectInfo.name === '' && prev[0].byggdelar.length === 0;
          const restored = isOnlyFallback ? [deletedProject] : [...prev, deletedProject];
          localStorage.setItem('betong_saved_projects', JSON.stringify(restored));
          return restored;
        });
        setUndoToast(null);
      });
    });
  };

  const renameFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    promptAction("Ändra namn", "Ange nytt namn för mappen:", folder.name, (newName) => {
      if (newName && newName.trim()) {
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
      }
    });
  };

  const renameProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === id);
    if (!project) return;
    promptAction("Ändra namn", "Ange nytt namn för projektet:", project.projectInfo.name || '', (newName) => {
      if (newName && newName.trim()) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, projectInfo: { ...p.projectInfo, name: newName.trim() } } : p));
        if (activeProjectId === id) {
          setProjectInfo(prev => ({ ...prev, name: newName.trim() }));
        }
      }
    });
  };

  const deleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmAction("Ta bort mapp", "Är du säker på att du vill ta bort mappen? Alla projekt i mappen kommer att flyttas till roten.", () => {
      const deletedFolder = folders.find(f => f.id === id);
      if (!deletedFolder) return;
      
      const previousProjectIdsInFolder = projects.filter(p => p.folderId === id).map(p => p.id);

      setFolders(prev => prev.filter(f => f.id !== id));
      setProjects(prev => prev.map(p => p.folderId === id ? { ...p, folderId: null } : p));

      showUndoToast(`Mapp '${deletedFolder.name}' borttagen`, () => {
        setFolders(prev => [...prev, deletedFolder]);
        setProjects(prev => prev.map(p => previousProjectIdsInFolder.includes(p.id) ? { ...p, folderId: id } : p));
        setUndoToast(null);
      });
    });
  };

  useEffect(() => {
    // Check if county/country is different for traktamente
    const projLan = projectInfo.lan.trim().toLowerCase();
    const projLand = projectInfo.land.trim().toLowerCase();
    const compLan = companyInfo.lan.trim().toLowerCase();
    const compLand = companyInfo.land.trim().toLowerCase();

    if (projLan && compLan && projLand && compLand) {
      if (projLan !== compLan || projLand !== compLand) {
        setSettings(s => ({ ...s, trRate: 120 }));
      } else {
        setSettings(s => ({ ...s, trRate: 0 }));
      }
    }
  }, [projectInfo.lan, projectInfo.land, companyInfo.lan, companyInfo.land]);

  const {
    modalOpen, setModalOpen,
    editId, setEditId,
    mName, setMName,
    mType, setMType,
    mGroup, setMGroup,
    mObjFactor, setMObjFactor,
    mLength, setMLength,
    mWidth, setMWidth,
    mHeight, setMHeight,
    mShaftWidth, setMShaftWidth,
    mShaftHeight, setMShaftHeight,
    mWallThickness, setMWallThickness,
    mSlabThickness, setMSlabThickness,
    mCount, setMCount,
    mArea, setMArea,
    mPerimeter, setMPerimeter,
    mStepCount, setMStepCount,
    mStepWidth, setMStepWidth,
    mStepHeight, setMStepHeight,
    mStepDepth, setMStepDepth,
    mRampThickness, setMRampThickness,
    mMoments, setMMoments,
    mError, setMError,
    isOpeningModal
  } = useByggdelModal();

  const [showErfarenhetModal, setShowErfarenhetModal] = useState(false);
  const [undoToast, setUndoToast] = useState<{ id: number; message: string; action: () => void } | null>(null);

  const showUndoToast = (message: string, action: () => void) => {
    const id = Date.now();
    setUndoToast({ id, message, action });
    setTimeout(() => {
      setUndoToast(current => current?.id === id ? null : current);
    }, 8000);
  };

  const calcResult = useCalculation(
    byggdelar,
    materials,
    settings.fOrg,
    settings.fForbr,
    settings.tRate,
    settings.mRate,
    settings.trRate,
    settings.vMatP,
    settings.vArbP,
    settings.timeFactor,
    companyTidsfaktorer
  );

  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  const modalCalcQty = mCount;

  const pushMaterials = async (newMats: Material[]) => {
    setMaterials(newMats);
    localStorage.setItem('betong_materials', JSON.stringify(newMats));
    if (user && dataSpaceId) {
      try {
        const { error } = await supabase.from('app_state').upsert({ id: `materials_${dataSpaceId}`, company_id: dataSpaceId, data: newMats });
        if (error) {
          console.warn("pushMaterials error:", error);
          showNotification("Fel vid databassparning (Material), sparat lokalt. " + error.message, "error");
        }
      } catch(e) {}
    }
  };

  const pushArbetsData = async (newArbs: ArbetsMoment[]) => {
    setArbetsData(newArbs);
    localStorage.setItem('betong_arbetsmoments', JSON.stringify(newArbs));
    if (user && dataSpaceId) {
      try {
        const { error } = await supabase.from('app_state').upsert({ id: `arbetsmoments_${dataSpaceId}`, company_id: dataSpaceId, data: newArbs });
        if (error) {
          console.warn("pushArbetsData error:", error);
          showNotification("Fel vid databassparning (Arbetsmoment), sparat lokalt. " + error.message, "error");
        }
      } catch(e) {}
    }
  };

  const updateMaterial = (index: number, updates: Partial<Material>) => {
    const newMats = [...materials];
    newMats[index] = { ...newMats[index], ...updates };
    pushMaterials(newMats);
  };
  
  const updateMaterialPrice = (materialName: string, price: number) => {
    const idx = materials.findIndex(m => m.name === materialName);
    if (idx !== -1) {
      const mat = materials[idx];
      const today = new Date().toISOString().split('T')[0];
      const newHistory = [...(mat.priceHistory || [])];
      
      if (newHistory.length === 0 && mat.price > 0) {
        newHistory.push({ date: '2023-01-01', price: mat.price });
      }
      
      const existingTodayIndex = newHistory.findIndex(h => h.date === today);
      if (existingTodayIndex !== -1) {
        newHistory[existingTodayIndex] = { date: today, price: price };
      } else {
        newHistory.push({ date: today, price: price });
      }
      
      updateMaterial(idx, { price: price, priceHistory: newHistory });
      showNotification(`Pris sparat till register för ${materialName}.`, 'success');
    }
  };
  
  const updateMultipleMaterials = (indices: number[], updates: Partial<Material>, addHistory?: { price: number, date: string, updateCurrentPrice: boolean }) => {
    const newMats = [...materials];
    indices.forEach(idx => {
      let matUpdates = { ...updates };
      let newHistory = [...(newMats[idx].priceHistory || [])];
      let historyChanged = false;

      if (addHistory) {
        if (newHistory.length === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          newHistory.push({ date: yesterday.toISOString().split('T')[0], price: newMats[idx].price ?? 0 });
        }
        newHistory.push({ date: addHistory.date, price: addHistory.price });
        historyChanged = true;
        if (addHistory.updateCurrentPrice) {
          matUpdates.price = addHistory.price;
        }
      } else if ('price' in updates && updates.price !== newMats[idx].price) {
        if (newHistory.length === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          newHistory.push({ date: yesterday.toISOString().split('T')[0], price: newMats[idx].price ?? 0 });
        }
        newHistory.push({ date: new Date().toISOString().split('T')[0], price: updates.price as number });
        historyChanged = true;
      }

      if (historyChanged) {
        matUpdates.priceHistory = newHistory;
      }
      
      newMats[idx] = { ...newMats[idx], ...matUpdates };
    });
    pushMaterials(newMats);
  };
  const addMaterial = (mat: Material) => pushMaterials([...materials, mat]);
  const addMaterials = (mats: Material[]) => pushMaterials([...materials, ...mats]);
  const deleteMaterial = (index: number) => pushMaterials(materials.filter((_, i) => i !== index));
  const deleteMultipleMaterials = (indices: number[]) => pushMaterials(materials.filter((_, i) => !indices.includes(i)));

  const addCategory = (cat: string) => {
    setCustomCategories(prev => {
      const newCats = prev.includes(cat) ? prev : [...prev, cat];
      if (user && dataSpaceId) {
        supabase.from('app_state').upsert({ id: `custom_categories_${dataSpaceId}`, company_id: dataSpaceId, data: newCats });
      }
      return newCats;
    });
  };
  const renameCategory = (oldCat: string, newCat: string) => {
    pushMaterials(materials.map(m => m.cat === oldCat ? { ...m, cat: newCat } : m));
    setCustomCategories(cats => {
      const newCats = cats.map(c => c === oldCat ? newCat : c);
      if (user && dataSpaceId) {
        supabase.from('app_state').upsert({ id: `custom_categories_${dataSpaceId}`, company_id: dataSpaceId, data: newCats });
      }
      return newCats;
    });
  };
  const removeCategory = (cat: string) => {
    pushMaterials(materials.map(m => m.cat === cat ? { ...m, cat: 'Övrigt' } : m));
    setCustomCategories(cats => {
      const newCats = cats.filter(c => c !== cat);
      if (user && dataSpaceId) {
        supabase.from('app_state').upsert({ id: `custom_categories_${dataSpaceId}`, company_id: dataSpaceId, data: newCats });
      }
      return newCats;
    });
  };

  const [customArbCategories, setCustomArbCategories] = useState<string[]>([]);
  
  const updateArbete = (index: number, updates: Partial<ArbetsMoment>) => {
    const newArb = [...arbetsData];
    newArb[index] = { ...newArb[index], ...updates };
    pushArbetsData(newArb);
  };
  
  const updateMultipleArbeten = (indices: number[], updates: Partial<ArbetsMoment>) => {
    const newArb = [...arbetsData];
    indices.forEach(idx => {
      newArb[idx] = { ...newArb[idx], ...updates };
    });
    pushArbetsData(newArb);
  };

  const addArbete = (arb: ArbetsMoment) => pushArbetsData([...arbetsData, arb]);
  const addArbeten = (arbs: ArbetsMoment[]) => pushArbetsData([...arbetsData, ...arbs]);
  const deleteArbete = (index: number) => pushArbetsData(arbetsData.filter((_, i) => i !== index));
  const deleteMultipleArbeten = (indices: number[]) => pushArbetsData(arbetsData.filter((_, i) => !indices.includes(i)));

  const toggleByggdel = (id: number) => {
    setByggdelar(prev => prev.map(p => p.id === id ? { ...p, collapsed: !p.collapsed } : p));
  };

  const toggleAllByggdelar = (collapse: boolean) => {
    setByggdelar(prev => prev.map(p => ({ ...p, collapsed: collapse })));
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const importedByggdelar: Byggdel[] = data.map((row: any, i) => {
           const typeLabel = row['Typ'] || row['Type'] || '';
           let type = '24.1_Fundament';
           const matchedType = INITIAL_TIDSFAKTORER.find(t => 
             typeLabel && (t.type.toLowerCase().includes(typeLabel.toLowerCase()) || 
             t.label.toLowerCase().includes(typeLabel.toLowerCase()))
           );
           if (matchedType) type = matchedType.type;

           const qty = parseFloat(row['Mängd']) || parseFloat(row['Kvantitet']) || parseFloat(row['Antal']) || parseFloat(row['Qty']) || 1;
           const length = parseFloat(row['Längd']) || parseFloat(row['Length']) || 1;
           const width = parseFloat(row['Bredd']) || parseFloat(row['Width']) || 1;
           const height = parseFloat(row['Höjd']) || parseFloat(row['Height']) || 0.2;
           const name = row['Namn'] || row['Name'] || row['Byggdel'] || `Importerad ${length}x${width}x${height}`;
           const comment = row['Kommentar'] || row['Comment'] || '';

           const dims = { length, width, height, qty };

           return {
             id: Date.now() + Math.floor(Math.random() * 1000) + i,
             name,
             type,
             qty,
             dimensions: dims,
             comment,
             active: true,
             collapsed: true,
             moments: calculateDefaultMoments(type, dims),
             objFactor: 1.0
           };
        });

        if (importedByggdelar.length > 0) {
          setByggdelar(prev => [...prev, ...importedByggdelar]);
        }
      } catch (err) {
        console.error("Error reading file:", err);
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    // 1. Projektinfo
    const projRows = [
      { 'Fält': 'Projektnummer', 'Värde': projectInfo.nr },
      { 'Fält': 'Projektnamn', 'Värde': projectInfo.name },
      { 'Fält': 'Kund', 'Värde': projectInfo.client },
      { 'Fält': 'Kund Kontakt', 'Värde': projectInfo.clientContact },
      { 'Fält': 'Ort', 'Värde': projectInfo.ort },
      { 'Fält': 'Företagsnamn', 'Värde': companyInfo.name },
      { 'Fält': 'Företaget Email', 'Värde': companyInfo.email },
    ];

    // 2. Byggdelar & underliggande moment
    const partRows: any[] = [];
    byggdelar.forEach(p => {
      if (partRows.length > 0) partRows.push({ 'Kategori': '' }); // Empty row for readability

      const pResult = calcResult.parts.find(x => x.id === p.id);
      const partCost = pResult?.costNetto || 0;
      partRows.push({
        'Kategori': 'Byggdel',
        'Namn / Etikett': p.name,
        'Gruppering': p.group || '',
        'Typ / Material': p.type,
        'Mängd': p.qty,
        'Enhet': pResult?.unit || 'st',
        'Timmar': pResult?.tim || 0,
        'Materialkostnad (kr)': Math.round((pResult?.costNetto || 0) - (pResult?.tim || 0) * settings.tRate),
        'Arbetskostnad (kr)': Math.round((pResult?.tim || 0) * settings.tRate),
        'Totalt Pris (kr)': Math.round(partCost)
      });
      if (p.moments) {
        let mIdx = 0;
        p.moments.forEach(m => {
          if (m.active !== false) {
             const mRes = pResult?.moments?.[mIdx];
             partRows.push({
               'Kategori': '  - Moment',
               'Namn / Etikett': m.label,
               'Gruppering': '',
               'Typ / Material': m.material,
               'Mängd': m.amount,
               'Enhet': m.matUnit || '',
               'Timmar': Math.round((mRes?.hrs || 0) * 10) / 10,
               'Materialkostnad (kr)': Math.round((mRes?.matNetto || 0)),
               'Arbetskostnad (kr)': Math.round((mRes?.arbNetto || 0)),
               'Totalt Pris (kr)': Math.round((mRes?.cost || 0))
             });
          }
          mIdx++;
        });
      }
    });

    // 3. Material Sammanställning
    const matRows = (calcResult.materialsSummary || []).filter(m => m.qty > 0).map(m => {
       const globalMat = materials.find(gm => gm.name === m.name);
       return {
         'Artikel': m.name,
         'Kategori': m.cat,
         'Kvantitet': Math.round(m.qty * 10) / 10,
         'Enhet': m.unit,
         'á-pris (kr)': globalMat?.price || 0,
         'Totalt (kr)': Math.round(m.costNetto)
       };
    });

    // 4. Slutsida (Sammanställning)
    const summaryRows = [
      { 'Beskrivning': 'Totalt Materialkostnad', 'Belopp (kr)': Math.round(calcResult.totMat) },
      { 'Beskrivning': 'Totalt Arbetskostnad', 'Belopp (kr)': Math.round(calcResult.totArb) },
      { 'Beskrivning': 'Summa UE-kostnad', 'Belopp (kr)': 0 },
      { 'Beskrivning': 'Gemensamma Omkostnader', 'Belopp (kr)': Math.round(calcResult.omkTot) },
      { 'Beskrivning': 'Summa Netto Produktionskostnad', 'Belopp (kr)': Math.round(calcResult.projNetto) },
      { 'Beskrivning': 'Vinst/Risk Arbete', 'Belopp (kr)': Math.round(calcResult.vArbKr || 0) },
      { 'Beskrivning': 'Vinst/Risk Material', 'Belopp (kr)': Math.round(calcResult.vMatKr || 0) },
      { 'Beskrivning': 'Vinst/Risk UE', 'Belopp (kr)': 0 },
      { 'Beskrivning': 'Vinst/Risk Totalt', 'Belopp (kr)': Math.round(calcResult.vTot) },
      { 'Beskrivning': 'Anbud (exkl moms)', 'Belopp (kr)': Math.round(calcResult.anbud) },
      { 'Beskrivning': 'Moms', 'Belopp (kr)': Math.round(calcResult.anbud * 0.25) },
      { 'Beskrivning': 'Anbud (inkl moms)', 'Belopp (kr)': Math.round(calcResult.anbud * 1.25) }
    ];

    // 5. Kundanbud
    const clientOfferRows: any[] = [
      { 'Rubrik': 'KUNDANBUD' },
      { 'Rubrik': 'Datum', 'Information': new Date().toLocaleDateString('sv-SE') },
      { 'Rubrik': 'Projekt', 'Information': projectInfo.name },
      { 'Rubrik': 'Kund', 'Information': projectInfo.client },
      { 'Rubrik': '' },
      { 'Rubrik': 'Beskrivning', 'Information': 'Vi erbjuder oss härmed att utföra projektet enligt nedanstående specifikation och mängder.' },
      ...(projectInfo.contractType ? [{ 'Rubrik': '', 'Information': `Entreprenaden är avsedd att utföras i enlighet med Allmänna Bestämmelser för ${projectInfo.contractType === 'ABT06' ? 'totalentreprenader, ABT 06' : 'byggnads-, anläggnings- och installationsentreprenader, AB 04'}.` }] : []),
      { 'Rubrik': '' },
      { 'Rubrik': 'Specifikation' }
    ];

    byggdelar.filter(p => p.active !== false).forEach(p => {
       const partCalc = calcResult.parts.find(x => x.id === p.id);
       let priceStr = '';
       if (p.showPriceInOffer && partCalc) {
          const partsTotalCost = calcResult.totArb + calcResult.totMat;
          const ratio = partsTotalCost > 0 ? partCalc.costNetto / partsTotalCost : 0;
          const partAnbudPrice = partCalc.costNetto + (calcResult.omkTot * ratio) + (calcResult.vTot * ratio);
          priceStr = `${Math.round(partAnbudPrice).toLocaleString('sv-SE')} kr`;
       }

       if (priceStr) {
          clientOfferRows.push({ 'Rubrik': p.name, 'Information': `${p.qty} ${partCalc?.unit || 'st'}`, 'Pris': priceStr });
       } else {
          clientOfferRows.push({ 'Rubrik': p.name, 'Information': `${p.qty} ${partCalc?.unit || 'st'}` });
       }
    });

    clientOfferRows.push(
      { 'Rubrik': '' },
      { 'Rubrik': 'Pris exkl. moms', 'Information': `${Math.round(calcResult.anbud).toLocaleString('sv-SE')} kr` },
      { 'Rubrik': 'Moms', 'Information': `${Math.round(calcResult.anbud * 0.25).toLocaleString('sv-SE')} kr` },
      { 'Rubrik': 'Pris inkl. moms', 'Information': `${Math.round(calcResult.anbud * 1.25).toLocaleString('sv-SE')} kr` },
    );

    const wb = XLSX.utils.book_new();
    
    const wsProj = XLSX.utils.json_to_sheet(projRows);
    wsProj['!cols'] = [{wch: 25}, {wch: 40}];

    const wsParts = XLSX.utils.json_to_sheet(partRows);
    wsParts['!cols'] = [{wch: 15}, {wch: 30}, {wch: 20}, {wch: 25}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 20}, {wch: 20}];
    
    const wsMat = XLSX.utils.json_to_sheet(matRows);
    wsMat['!cols'] = [{wch: 30}, {wch: 20}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 15}];
    
    const wsSum = XLSX.utils.json_to_sheet(summaryRows);
    wsSum['!cols'] = [{wch: 40}, {wch: 20}];

    const wsOffer = XLSX.utils.json_to_sheet(clientOfferRows);
    wsOffer['!cols'] = [{wch: 30}, {wch: 30}];

    XLSX.utils.book_append_sheet(wb, wsProj, "Projektinfo");
    XLSX.utils.book_append_sheet(wb, wsParts, "Kalkyl & Moment");
    XLSX.utils.book_append_sheet(wb, wsMat, "Materialsammanställning");
    XLSX.utils.book_append_sheet(wb, wsSum, "Slutsida");
    XLSX.utils.book_append_sheet(wb, wsOffer, "Kundanbud");

    XLSX.writeFile(wb, `${projectInfo.name || 'Kalkyl'}_Export.xlsx`);
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { 'Typ': '24.1_Fundament', 'Namn': 'Plint 1', 'Mängd': 1, 'Längd': 1.2, 'Bredd': 1.2, 'Höjd': 0.6, 'Kommentar': 'Exempel' },
      { 'Typ': '27_Platta_pa_mark', 'Namn': 'Bottenplatta', 'Mängd': 1, 'Längd': 10, 'Bredd': 8, 'Höjd': 0.2, 'Kommentar': 'Garage' },
      { 'Typ': '24.2_Vagg', 'Namn': 'Källarvägg', 'Mängd': 1, 'Längd': 10, 'Bredd': 1, 'Höjd': 2.5, 'Kommentar': 'Exempel: Tjocklek = 0.2 (använd Bredd för väggtjocklek i vissa fall)' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Byggdelar");
    XLSX.writeFile(wb, "ImportMall_Byggdelar.xlsx");
  };

  const reorderByggdelar = (dragIndex: number, dropIndex: number) => {
    setByggdelar(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
  };

  const reorderMoment = (byggdelId: number, dragIndex: number, dropIndex: number) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id !== byggdelId) return p;
      if (!p.moments) return p;
      const nextMoments = [...p.moments];
      const [moved] = nextMoments.splice(dragIndex, 1);
      nextMoments.splice(dropIndex, 0, moved);
      return { ...p, moments: nextMoments };
    }));
  };

  const updateStartDay = (byggdelId: number, startDay: number | null, mIndex?: number) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id !== byggdelId) return p;
      if (typeof mIndex === 'number') {
        const nextMoments = [...(p.moments || [])];
        if (nextMoments[mIndex]) {
          nextMoments[mIndex] = { ...nextMoments[mIndex], startDay };
        }
        return { ...p, moments: nextMoments };
      }
      return { ...p, startDay };
    }));
  };

  const updatePlanDates = (byggdelId: number, startDate: string | undefined, endDate: string | undefined, mIndex?: number) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id !== byggdelId) return p;
      if (typeof mIndex === 'number') {
        const nextMoments = [...(p.moments || [])];
        if (nextMoments[mIndex]) {
          nextMoments[mIndex] = { ...nextMoments[mIndex], startDate, endDate };
        }
        return { ...p, moments: nextMoments };
      }
      return { ...p, startDate, endDate };
    }));
  };

  const updateMomentWorkers = (byggdelId: number, mIndex: number, workers: number) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id !== byggdelId) return p;
      const nextMoments = [...(p.moments || [])];
      if (nextMoments[mIndex]) {
        nextMoments[mIndex] = { ...nextMoments[mIndex], workers };
      }
      return { ...p, moments: nextMoments };
    }));
  };

  const updateByggdelColor = (byggdelId: number, color: string) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id !== byggdelId) return p;
      return { ...p, color };
    }));
  };

  const updateByggdelOfferPrice = (byggdelId: number, show: boolean) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id !== byggdelId) return p;
      return { ...p, showPriceInOffer: show };
    }));
  };

  const reorderFolders = (dragId: string, dropId: string) => {
    setFolders(prev => {
      const dragIndex = prev.findIndex(f => f.id === dragId);
      const dropIndex = prev.findIndex(f => f.id === dropId);
      if (dragIndex < 0 || dropIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
  };

  const reorderProjects = (dragId: string, dropId: string | null, destFolderId: string | null) => {
    setProjects(prev => {
      const dragIndex = prev.findIndex(p => p.id === dragId);
      if (dragIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      moved.folderId = destFolderId;
      
      if (dropId) {
        const dropIndex = next.findIndex(p => p.id === dropId);
        if (dropIndex >= 0) {
           next.splice(dropIndex, 0, moved);
           localStorage.setItem('betong_saved_projects', JSON.stringify(next));
           return next;
        }
      }
      next.push(moved);
      localStorage.setItem('betong_saved_projects', JSON.stringify(next));
      return next;
    });
  };

  const addTemplatePart = (templateData: any) => {
    const newPart = {
      ...templateData,
      id: Date.now() + Math.floor(Math.random() * 1000),
    };
    setByggdelar(prev => [...prev, newPart]);
    showNotification(`Byggdel från mall '${templateData.name || 'okänd'}' tillagd.`, 'success');
  };

  const removePart = (id: number) => {
    const p = byggdelar.find(x => x.id === id);
    if (!p) return;
    setByggdelar(prev => prev.filter(x => x.id !== id));
    showNotification('Byggdel borttagen.', 'success');
  };

  const removeMultipleParts = (ids: number[]) => {
    setByggdelar(prev => prev.filter(x => !ids.includes(x.id)));
    showNotification(`${ids.length} byggdelar borttagna.`, 'success');
  };

  const updateMultipleParts = (ids: number[], updates: Partial<Byggdel>) => {
    setByggdelar(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...updates } : p));
    showNotification(`${ids.length} byggdelar uppdaterade.`, 'success');
  };

  const clonePart = (id: number) => {
    const partToClone = byggdelar.find(p => p.id === id);
    if (partToClone) {
      const clonedPart: Byggdel = {
        ...partToClone,
        id: Date.now(), // Generate a new unique ID
        name: `${partToClone.name} (Kopia)`,
        moments: (partToClone.moments || []).map(m => ({...m})), // Deep copy moments so they can be modified independently
        dimensions: partToClone.dimensions ? { ...partToClone.dimensions } : undefined,
      };
      setByggdelar(prev => [...prev, clonedPart]);
      showNotification(`Byggdel "${partToClone.name}" har kopierats. Kom ihåg att justera mängd och tidsåtgång för momenten om det behövs!`, 'success');
    }
  };

  const togglePartActive = (id: number) => {
    setByggdelar(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const toggleTypeActive = (groupKey: string, active: boolean) => {
    setByggdelar(prev => prev.map(p => {
      const groupSuffix = p.type + (p.revision ? '__REV__' + p.revision : '');
      const pGroupKey = p.group ? `${p.group}__GROUP__${groupSuffix}` : groupSuffix;
      return pGroupKey === groupKey ? { ...p, active } : p;
    }));
  };

  const cloneType = (groupKey: string) => {
    setByggdelar(prev => {
      const partsToClone = prev.filter(p => {
        const groupSuffix = p.type + (p.revision ? '__REV__' + p.revision : '');
        const pGroupKey = p.group ? `${p.group}__GROUP__${groupSuffix}` : groupSuffix;
        return pGroupKey === groupKey;
      });
      
      const newRevCount = prev.filter(p => p.type === partsToClone[0]?.type).length / partsToClone.length || 1;
      const newRevisionName = `Kopia ${Math.floor(newRevCount)}`;

      const newParts = partsToClone.map((b, i) => ({
        ...b,
        id: Date.now() + Math.random() + i, // ensure unique ID
        name: b.name,
        revision: b.revision ? b.revision + ' (kopia)' : newRevisionName
      }));
      return [...prev, ...newParts];
    });
  };

  const addMeasurementParts = (newParts: Omit<Byggdel, 'id'>[]) => {
    setByggdelar(prev => {
      const highestId = Math.max(0, ...prev.map(b => b.id));
      const partsWithIds = newParts.map((part, index) => ({
        ...part,
        id: highestId + 1 + index,
      }));
      showNotification(`Lade till ${partsWithIds.length} element från mätning.`, 'success');
      return [...prev, ...partsWithIds];
    });
  };

  const openModal = (id?: number) => {
    if (id !== undefined) {
      setEditId(id);
    } else {
      setEditId(null);
    }
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const saveByggdel = (newPart: Byggdel) => {
    if (editId !== null) {
      setByggdelar(prev => prev.map(p => p.id === editId ? newPart : p));
      showNotification('Byggdel uppdaterad.', 'success');
    } else {
      setByggdelar([...byggdelar, newPart]);
      showNotification('Byggdel skapad.', 'success');
    }
    closeModal();
  };

  const updateMoment = (byggdelId: number, momentIndex: number, updates: any) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id === byggdelId) {
        const newM = [...p.moments];
        newM[momentIndex] = { ...newM[momentIndex], ...updates };
        return { ...p, moments: newM };
      }
      return p;
    }));
  };

  const addMoment = (byggdelId: number) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id === byggdelId) {
        return { ...p, moments: [...p.moments, { label: 'Nytt Moment', material: materials[0]?.name || '', amount: 0, timeUnit: 0, active: true }] };
      }
      return p;
    }));
  };

  const removeMoment = (byggdelId: number, momentIndex: number) => {
    const p = byggdelar.find(x => x.id === byggdelId);
    if (!p) return;
    setByggdelar(prev => prev.map(p => {
      if (p.id === byggdelId) {
        const newM = [...p.moments];
        newM.splice(momentIndex, 1);
        return { ...p, moments: newM };
      }
      return p;
    }));
    showNotification('Moment borttaget.', 'success');
  };

  const duplicateMoment = (byggdelId: number, momentIndex: number) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id === byggdelId) {
        const newM = [...p.moments];
        const original = newM[momentIndex];
        if (original) {
          const duplicate = { ...original, label: original.label + ' (Kopia)' };
          newM.splice(momentIndex + 1, 0, duplicate);
        }
        return { ...p, moments: newM };
      }
      return p;
    }));
    showNotification('Moment duplicerat.', 'success');
  };

  const updatePartQty = (id: number, qty: number, raw?: string) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          qty,
          qtyRaw: raw !== undefined ? raw : p.qtyRaw,
          dimensions: p.dimensions ? { ...p.dimensions, qty } : undefined
        };
      }
      return p;
    }));
  };

  const updatePartAntal = (id: number, antal: number, raw?: string) => {
    setByggdelar(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, antal, antalRaw: raw !== undefined ? raw : p.antalRaw };
      }
      return p;
    }));
  };

  const resetData = async () => {
    setByggdelar([]);
    setSettings({
      fTim: 425, fOrg: 0.22, fForbr: 0.03, fMaskin: 85, fTrakt: 0, vMatP: userSettings.defaultMargin, vArbP: userSettings.defaultMargin,
      tRate: 425, mRate: 85, trRate: 0, timeFactor: 1.0
    });
    setProjects([]);
    setFolders([]);
    setCustomCategories([]);
    setCompanyInfo(INITIAL_COMPANY_INFO);
    localStorage.clear();
    
    let baseMats = INITIAL_MATERIALS;
    let baseArb = INITIAL_ARBETS_DATA;
    
    if (user && dataSpaceId) {
      // Fetch global defaults first
      const { data: mData } = await supabase.from('app_state').select('data').eq('id', 'materials_all').single();
      if (mData) baseMats = mData.data as Material[];
      
      const { data: aData } = await supabase.from('app_state').select('data').eq('id', 'arbetsmoments_all').single();
      if (aData) baseArb = aData.data as ArbetsMoment[];
      
      await supabase.from('app_state').upsert({ id: `materials_${dataSpaceId}`, company_id: dataSpaceId, data: baseMats });
      await supabase.from('app_state').upsert({ id: `arbetsmoments_${dataSpaceId}`, company_id: dataSpaceId, data: baseArb });
      await supabase.from('app_state').delete().in('id', [
        `folders_${dataSpaceId}`,
        `projects_${dataSpaceId}`,
        `company_info_${dataSpaceId}`,
        `custom_categories_${dataSpaceId}`,
        `active_project_id_${user.id}`
      ]);
    }
    setMaterials(baseMats);
    setArbetsData(baseArb);
    showNotification("All data har återställts.", 'success');
  };

  const exportData = () => {
    try {
      const backup = { byggdelar, materials, arbetsData, settings, customCategories, projectInfo, companyInfo };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kalkyl_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification("Data exporterades framgångsrikt!", 'success');
    } catch (err) {
      console.error(err);
      showNotification("Ett fel inträffade vid export av filen.", 'error');
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.byggdelar) setByggdelar(data.byggdelar);
        if (data.materials) setMaterials(data.materials);
        if (data.customCategories) setCustomCategories(data.customCategories);
        if (data.arbetsData) setArbetsData(data.arbetsData);
        if (data.settings) setSettings(data.settings);
        if (data.projectInfo) setProjectInfo({ ...INITIAL_PROJECT_INFO, ...data.projectInfo });
        if (data.companyInfo) setCompanyInfo({ ...INITIAL_COMPANY_INFO, ...data.companyInfo });
        showNotification("Data importerades framgångsrikt!", 'success');
      } catch (err) {
        showNotification("Ett fel inträffade vid import av filen.", 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  if (!authInitialized) {
    return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--blue)] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4" style={{
        backgroundImage: 'linear-gradient(135deg, var(--blue-lt) 0%, var(--bg) 100%)'
      }}>
        <div className="bg-white p-10 rounded-2xl shadow-2xl border border-[var(--border)] max-w-md w-full text-center transform transition-all hover:scale-[1.01]">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--blue)] to-[var(--blue-dk)] flex items-center justify-center text-white font-extrabold text-3xl shadow-[0_8px_16px_var(--blue-glow)]">E</div>
            <h1 className="text-3xl font-extrabold mb-2 text-gray-900 tracking-tight">Estimo</h1>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">
              Välkommen. Logga in för att komma åt dina kalkyler och din organisations projekt.
            </p>

            <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
              <button
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${loginMode === 'kalkyl' ? 'bg-white shadow-sm text-[var(--blue)]' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setLoginMode('kalkyl')}
              >
                Kalkyl Portal
              </button>
              <button
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${loginMode === 'admin' ? 'bg-white shadow-sm text-[var(--blue)]' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setLoginMode('admin')}
              >
                Admin Portal
              </button>
            </div>

            <form onSubmit={handleManualLogin} className="mb-6 space-y-3 text-left">
              <div>
                <input 
                  type="text" 
                  placeholder="Användarnamn" 
                  value={manualEmail}
                  onChange={e => setManualEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-[var(--blue)] outline-none transition-colors"
                />
              </div>
              <div>
                <input 
                  type="password" 
                  placeholder="Lösenord" 
                  value={manualPassword}
                  onChange={e => setManualPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-[var(--blue)] outline-none transition-colors"
                />
              </div>
              {manualLoginError && <p className="text-red-500 text-xs">{manualLoginError}</p>}
              <button 
                type="submit"
                className="w-full bg-[var(--blue)] hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow focus:ring-2 focus:ring-blue-100 outline-none transform active:scale-95"
              >
                Logga in till {loginMode === 'admin' ? 'Admin Portal' : 'Kalkyl'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">
                Genom att logga in godkänner du våra användarvillkor och vår integritetspolicy.
              </p>
            </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Åtkomst nekad</h1>
            <p className="text-gray-600 mb-8">
              {appMode === 'admin' 
                ? `Ditt konto (${user?.email}) saknar administrativ behörighet.` 
                : `Ditt konto (${user?.email}) har inte kopplats till något företag ännu.`}
              <br/><br/>
              Kontakta din administratör (eller företagsledare) för att få tillgång.
            </p>
            <button onClick={() => {
              handleLogout();
              setAccessDenied(false);
            }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-colors">
              Gå tillbaka / Logga ut
            </button>
        </div>
      </div>
    );
  }

  if (needsOnboarding && user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md w-full">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Välkommen!</h1>
            <p className="text-gray-600 mb-8">
              Det verkar som att du inte är kopplad till ett företag än. 
              Klicka nedan för att registrera ditt konto och ett nytt företag.
            </p>
            <button 
              onClick={async () => {
                const companyName = prompt("Ange ditt företagsnamn:");
                if (!companyName) return;
                
                try {
                  const { data: company, error: compErr } = await supabase
                    .from('companies')
                    .insert([{ name: companyName }])
                    .select()
                    .single();
                  
                  if (compErr) throw compErr;
                  
                  const { error: profErr } = await supabase
                    .from('profiles')
                    .insert([{ 
                      id: user.id, 
                      company_id: company.id, 
                      role: 'admin',
                      email: user.email,
                      name: user.email?.split('@')[0] || 'Användare'
                    }]);
                    
                  if (profErr) throw profErr;
                  
                  window.location.reload();
                } catch (e: any) {
                  showNotification("Kunde inte registrera företag: " + e.message, "error");
                }
              }} 
              className="w-full bg-[var(--blue)] hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
            >
              Registrera företag
            </button>
            <button onClick={() => {
              handleLogout();
              setNeedsOnboarding(false);
            }} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Gå tillbaka / Logga ut
            </button>
        </div>
      </div>
    );
  }

  if (appMode === 'admin') {
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant max-w-md w-full text-center shadow-lg">
            <span className="material-symbols-outlined text-[48px] text-status-error mb-4">gpp_bad</span>
            <h1 className="text-2xl font-bold text-on-surface mb-2">Behörighet saknas</h1>
            <p className="text-on-surface-variant mb-6">
              Du saknar administratörsrättigheter för att visa den här sidan.
            </p>
            <button 
              className="bg-primary text-on-primary font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors"
              onClick={() => {
                localStorage.setItem('betong_app_mode', 'kalkyl');
                setAppMode('kalkyl');
              }}
            >
              Tillbaka till Kalkylportal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background text-on-background font-sans flex flex-col h-screen overflow-hidden">
        <header className="bg-surface border-b border-outline-variant h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50 text-on-surface">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-primary font-extrabold text-sm">A</div>
            <div className="font-extrabold text-sm md:text-[15px] tracking-tight">Estimo <span className="text-outline font-normal ml-1">| Admin Portal</span></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-on-surface-variant hidden md:block">Inloggad som: <strong>{user.email}</strong></div>
            <button className="text-outline hover:text-primary transition-colors text-xs font-semibold px-2 flex items-center" onClick={handleLogout} title="Logga ut">
              <span className="material-symbols-outlined text-[18px] mr-1.5">logout</span>Logga ut
            </button>
          </div>
        </header>
        <div className="flex-1 flex overflow-hidden">
             <div className="w-1/5 bg-gray-50 border-r border-gray-200 p-4 space-y-4">
                <nav className="flex flex-col gap-1">
                   <button 
                      className={`text-left px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors ${adminSubTab === 'oversikt' ? 'bg-[var(--blue-lt)] text-[var(--blue)]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                      onClick={() => setAdminSubTab('oversikt')}
                   >
                      <i className="fa-solid fa-chart-line w-5 text-center"></i> Översikt
                   </button>
                   <button 
                      className={`text-left px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors text-[var(--blue-d)] ${adminSubTab === 'kunder' ? 'bg-[var(--blue-lt)] text-[var(--blue)]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                      onClick={() => setAdminSubTab('kunder')}
                   >
                      <i className="fa-solid fa-building w-5 text-center"></i> Företag & Kunder
                   </button>
                   <button 
                      className={`text-left px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors ${adminSubTab === 'register' ? 'bg-[var(--blue-lt)] text-[var(--blue)]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                      onClick={() => setAdminSubTab('register')}
                   >
                      <i className="fa-solid fa-database w-5 text-center"></i> Standardregister
                   </button>
                   <button 
                      className={`text-left px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors ${adminSubTab === 'fakturor' ? 'bg-[var(--blue-lt)] text-[var(--blue)]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                      onClick={() => setAdminSubTab('fakturor')}
                   >
                      <i className="fa-solid fa-file-invoice w-5 text-center"></i> Fakturor
                   </button>
                   <button 
                      className={`text-left px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors ${adminSubTab === 'installningar' ? 'bg-[var(--blue-lt)] text-[var(--blue)]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                      onClick={() => setAdminSubTab('installningar')}
                   >
                      <i className="fa-solid fa-gear w-5 text-center"></i> Inställningar
                   </button>
                </nav>
                <div className="pt-6 border-t border-gray-200 mt-6">
                   <button 
                     className="w-full text-left px-3 py-2 rounded-lg text-blue-600 hover:bg-blue-50 focus:bg-blue-50 font-medium text-sm flex items-center gap-3 transition-colors"
                     onClick={() => {
                        localStorage.setItem('betong_app_mode', 'kalkyl');
                        setAppMode('kalkyl');
                     }}
                   >
                     <i className="fa-solid fa-calculator text-blue-400 w-5 text-center"></i> Kalkylportal &rarr;
                   </button>
                </div>
             </div>
             <main className="flex-1 overflow-auto bg-gray-50/50">
                 <AdminTab 
                  user={user} 
                  activeTab={adminSubTab} 
                  userSettings={userSettings} setUserSettings={setUserSettings}
                  materials={materials} updateMaterial={updateMaterial} updateMultipleMaterials={updateMultipleMaterials} addMaterial={addMaterial} addMaterials={addMaterials} deleteMaterial={deleteMaterial} deleteMultipleMaterials={deleteMultipleMaterials}
                  arbetsData={arbetsData} updateArbete={updateArbete} updateMultipleArbeten={updateMultipleArbeten} addArbete={addArbete} addArbeten={addArbeten} deleteArbete={deleteArbete} deleteMultipleArbeten={deleteMultipleArbeten}
                  customCategories={customCategories} addCategory={addCategory} renameCategory={renameCategory} removeCategory={removeCategory}
                />
             </main>
        </div>
      </div>
    );
  }

  const handleApplyOffert = (priserPerKey: Record<string, number>) => {
    let count = 0;
    setByggdelar(prev => prev.map(b => {
      const key = b.id.toString();
      if (priserPerKey[key] !== undefined) {
        count++;
        return {
          ...b,
          isBought: true,
          boughtPrice: priserPerKey[key]
        };
      }
      return b;
    }));
    showNotification(`Offerten antogs. ${count} byggdelar uppdaterades.`, 'success');
  };

  return (
    <AuthProvider value={{
        user, authInitialized, manualEmail, setManualEmail, manualPassword, setManualPassword,
        manualLoginError, setManualLoginError, loginMode, setLoginMode, handleManualLogin, handleLogout, loginWithGoogle, appMode, setAppMode
    }}>
      <ProjectDataProvider value={{
        folders, setFolders, projects, setProjects, activeProjectId, setActiveProjectId, projectInfo, setProjectInfo,
        byggdelar, setByggdelar: setSupabaseByggdelar, settings, setSettings, companyInfo, setCompanyInfo, userSettings, setUserSettings,
        materials, setMaterials, arbetsData, setArbetsData, companyTidsfaktorer, setCompanyTidsfaktorer, dataLoaded, setDataLoaded,
        dataSpaceId, setDataSpaceId, accessDenied, setAccessDenied, needsOnboarding, setNeedsOnboarding, currentUserRole, setCurrentUserRole,
        customCategories, setCustomCategories, byggdelTemplates, addTemplate, deleteTemplate, switchProject
      }}>
        <KalkylHistoryProvider value={{ 
          byggdelHistory, historyIndex, undoByggdelar, redoByggdelar,
          calcResult, addParts: addMeasurementParts, addPartFromTemplate: addTemplatePart, toggleByggdel, toggleAllByggdelar,
          reorderByggdelar, removePart, removeMultipleParts, updateMultipleParts, clonePart, togglePartActive, toggleTypeActive,
          cloneType, openModal, updateMoment, duplicateMoment, updateMaterialPrice, addMoment, removeMoment, updatePartQty, updatePartAntal
        }}>
          <div className="min-h-screen bg-background text-on-background font-sans flex flex-col h-screen overflow-hidden">
            <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        handleLogout={handleLogout}
        loginWithGoogle={loginWithGoogle}
        calcResult={calcResult}
      />

      <div className="flex flex-1 overflow-hidden relative print:overflow-visible">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden print:hidden" onClick={() => setSidebarOpen(false)}></div>
        )}

        <WorkspaceNav activeTab={activeTab} setActiveTab={setActiveTab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isAdmin={isAdmin} />

        <div className="flex-1 flex flex-col min-w-0">
          <WorkspaceActions
            openModal={openModal}
            fileInputRef={fileInputRef}
            handleImportExcel={handleImportExcel}
            handleExportExcel={handleExportExcel}
            downloadTemplate={downloadTemplate}
          />

          <div className="flex-1 relative flex min-w-0 min-h-0">
            <main className={`flex-1 relative flex flex-col min-w-0 min-h-0 ${['kalkyl', 'pdf', 'bim'].includes(activeTab) ? 'overflow-hidden' : 'overflow-y-auto'} print:overflow-visible bg-surface-container-lowest`}>
        <TabRouter 
          activeTab={activeTab}
          user={user}
          profile={profile}
          refreshProfile={refreshProfile}
          projects={projects}
          folders={folders}
          activeProjectId={activeProjectId}
          companyInfo={companyInfo}
          createFolder={createFolder}
          createProject={createProject}
          renameFolder={renameFolder}
          deleteFolder={deleteFolder}
          renameProject={renameProject}
          duplicateProject={duplicateProject}
          deleteProject={deleteProject}
          switchProject={(id) => { switchProject(id); setActiveTab('projekt'); }}
          reorderProjects={reorderProjects}
          reorderFolders={reorderFolders}
          projectInfo={projectInfo}
          setProjectInfo={setProjectInfo}
          setCompanyInfo={setCompanyInfo}
          currentProject={projects.find(p => p.id === activeProjectId)}
          saveVersion={(name) => {
            setProjects(prev => prev.map(p => {
              if (p.id === activeProjectId) {
                return { 
                  ...p, 
                  versions: [...(p.versions || []), { id: 'v_' + Date.now(), name, timestamp: new Date().toISOString(), byggdelar: [...byggdelar] }],
                  activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action: 'Sparade version', details: `Version "${name}" skapades` }, ...(p.activityLogs || [])]
                };
              }
              return p;
            }));
            showNotification("Version sparad", "success");
          }}
          loadVersion={(version) => {
            setByggdelar(version.byggdelar);
            setProjects(prev => prev.map(p => {
              if (p.id === activeProjectId) {
                return {
                  ...p,
                  activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action: 'Laddade version', details: `Återställde till version "${version.name}"` }, ...(p.activityLogs || [])]
                };
              }
              return p;
            }));
            showNotification("Version läst in: " + version.name, "success");
          }}
          deleteVersion={(vId) => {
            confirmAction("Ta bort version", "Är du säker på att du vill ta bort denna version?", () => {
              setProjects(prev => prev.map(p => {
                if (p.id === activeProjectId) {
                  const vName = p.versions?.find(v => v.id === vId)?.name || 'Okänd';
                  return { 
                    ...p, 
                    versions: p.versions?.filter(v => v.id !== vId),
                    activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action: 'Tog bort version', details: `Version "${vName}" raderades` }, ...(p.activityLogs || [])]
                  };
                }
                return p;
              }));
              showNotification("Version borttagen", "info");
            });
          }}
          addActivityLog={(action, details) => {
            setProjects(prev => prev.map(p => {
              if (p.id === activeProjectId) {
                return {
                  ...p,
                  activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action, details }, ...(p.activityLogs || [])]
                };
              }
              return p;
            }));
          }}
          byggdelar={byggdelar}
          dataSpaceId={dataSpaceId}
          onProjectCompleted={() => setShowErfarenhetModal(true)}
          calcResult={calcResult}
          materials={materials}
          addMeasurementParts={addMeasurementParts}
          settings={settings}
          updateSettings={(key, val) => setSettings({ ...settings, [key]: val })}
          byggdelTemplates={byggdelTemplates}
          addTemplate={addTemplate}
          deleteTemplate={deleteTemplate}
          addTemplatePart={addTemplatePart}
          toggleByggdel={toggleByggdel}
          toggleAllByggdelar={toggleAllByggdelar}
          reorderByggdelar={reorderByggdelar}
          removePart={removePart}
          removeMultipleParts={removeMultipleParts}
          updateMultipleParts={updateMultipleParts}
          clonePart={clonePart}
          togglePartActive={togglePartActive}
          toggleTypeActive={toggleTypeActive}
          cloneType={cloneType}
          openModal={openModal}
          updateMoment={updateMoment}
          duplicateMoment={duplicateMoment}
          updateMaterialPrice={updateMaterialPrice}
          addMoment={addMoment}
          removeMoment={removeMoment}
          updatePartQty={updatePartQty}
          updatePartAntal={updatePartAntal}
          customCategories={customCategories}
          updateMaterial={updateMaterial}
          updateMultipleMaterials={updateMultipleMaterials}
          addMaterial={addMaterial}
          addMaterials={addMaterials}
          deleteMaterial={deleteMaterial}
          deleteMultipleMaterials={deleteMultipleMaterials}
          addCategory={addCategory}
          renameCategory={renameCategory}
          removeCategory={removeCategory}
          showNotification={showNotification}
          arbetsData={arbetsData}
          customArbCategories={customArbCategories}
          updateArbete={updateArbete}
          updateMultipleArbeten={updateMultipleArbeten}
          addArbete={addArbete}
          addArbeten={addArbeten}
          deleteArbete={deleteArbete}
          deleteMultipleArbeten={deleteMultipleArbeten}
          addArbCategory={(cat) => setCustomArbCategories(prev => [...prev.filter(c => c !== cat), cat])}
          reorderMoment={reorderMoment}
          updateStartDay={updateStartDay}
          updatePlanDates={updatePlanDates}
          updateMomentWorkers={updateMomentWorkers}
          updateByggdelColor={updateByggdelColor}
          setSettings={setSettings}
          updateByggdelOfferPrice={updateByggdelOfferPrice}
          handleApplyOffert={handleApplyOffert}
        />
      </main>
          </div>
      </div>
      </div>

      <ByggdelModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSave={saveByggdel}
        initialData={editId !== null ? byggdelar.find(p => p.id === editId) || null : null}
        materials={materials}
        arbetsData={arbetsData}
        settings={settings}
        onAddMaterial={addMaterial}
      />

      {dialogConfig.isOpen && (
        <div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-auto flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{dialogConfig.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{dialogConfig.message}</p>
              
              {dialogConfig.type === 'prompt' && (
                <input 
                  type="text" 
                  autoFocus
                  defaultValue={dialogConfig.defaultValue}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)] outline-none transition-all"
                  onKeyDown={e => {
                    if (e.key === 'Enter') dialogConfig.onConfirm(e.currentTarget.value);
                    if (e.key === 'Escape') dialogConfig.onCancel();
                  }}
                  id="dialog-prompt-input"
                />
              )}
            </div>
            
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button 
                className="px-4 py-2 rounded-md text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                onClick={dialogConfig.onCancel}
              >
                Avbryt
              </button>
              <button 
                className="px-4 py-2 rounded-md text-sm font-bold text-white bg-[var(--blue)] hover:bg-[var(--blue-dk)] transition-colors shadow-sm"
                onClick={() => {
                  if (dialogConfig.type === 'prompt') {
                    const el = document.getElementById('dialog-prompt-input') as HTMLInputElement;
                    dialogConfig.onConfirm(el?.value || '');
                  } else {
                    dialogConfig.onConfirm(true);
                  }
                }}
              >
                {dialogConfig.type === 'prompt' ? 'OK' : 'Ja, fortsätt'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ErfarenhetModal
        isOpen={showErfarenhetModal}
        onClose={() => setShowErfarenhetModal(false)}
        byggdelar={byggdelar}
        calcResult={calcResult}
        companyTidsfaktorer={companyTidsfaktorer}
        setCompanyTidsfaktorer={setCompanyTidsfaktorer}
        showNotification={showNotification}
      />

      {undoToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[3000] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-[var(--surface-inv)] text-white shadow-xl rounded-lg px-4 py-2.5 flex items-center gap-4 border border-[var(--border)]">
            <span className="text-sm font-medium">{undoToast.message}</span>
            <div className="flex items-center gap-2 border-l border-white/20 pl-4">
              <button 
                className="text-[var(--blue-lt)] font-bold text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors"
                onClick={undoToast.action}
              >
                Ångra
              </button>
              <button className="text-gray-400 hover:text-white p-1" onClick={() => setUndoToast(null)}>
                  <i className="fa-solid fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[3000] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`shadow-xl rounded-lg px-5 py-3.5 flex items-center gap-3 border ${
            notification.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' :
            notification.type === 'success' ? 'bg-green-50 text-green-900 border-green-200' :
            'bg-slate-800 text-white border-slate-700'
          }`}>
            <i className={`fa-solid ${
              notification.type === 'error' ? 'fa-circle-exclamation text-red-500' :
              notification.type === 'success' ? 'fa-circle-check text-green-500' :
              'fa-circle-info text-blue-400'
            } text-lg`}></i>
            <span className="text-sm font-medium tracking-wide">{notification.message}</span>
            <button 
              className={`ml-2 transition-colors ${
                notification.type === 'error' ? 'text-red-400 hover:text-red-700' :
                notification.type === 'success' ? 'text-green-500 hover:text-green-800' :
                'text-slate-400 hover:text-white'
              }`}
              onClick={() => setNotification(null)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}
          </div>
        </KalkylHistoryProvider>
      </ProjectDataProvider>
    </AuthProvider>
  );
}
