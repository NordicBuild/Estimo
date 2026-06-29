import React, { useState, useEffect, Suspense, lazy } from 'react';
import { supabase } from '../supabase';
import { Material, ArbetsMoment, INITIAL_MATERIALS, INITIAL_ARBETS_DATA } from '../data';

const MaterialTab = lazy(() => import('./MaterialTab').then(m => ({ default: m.MaterialTab })));
const ArbetsmomentTab = lazy(() => import('./ArbetsmomentTab').then(m => ({ default: m.ArbetsmomentTab })));

export function AdminRegisterTab() {
  const [activeTab, setActiveTab] = useState<'material' | 'arbete'>('material');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [arbetsData, setArbetsData] = useState<ArbetsMoment[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGlobalDefaults();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadGlobalDefaults = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('global_defaults').select('*');
      if (error) throw error;
      
      const mats = data.find(d => d.id === 'materials');
      const arbs = data.find(d => d.id === 'arbetsmoments');
      const cats = data.find(d => d.id === 'categories');

      setMaterials(mats ? mats.data : INITIAL_MATERIALS);
      setArbetsData(arbs ? arbs.data : INITIAL_ARBETS_DATA);
      setCustomCategories(cats ? cats.data : []);
    } catch (e: any) {
      console.error("Fel vid hämtning av global_defaults", e);
      showNotification("Kunde inte ladda data", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalDefault = async (id: string, data: any) => {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      
      const { error } = await supabase.from('global_defaults').upsert({
        id,
        data,
        updated_by: userId
      });
      if (error) throw error;
    } catch (e: any) {
      console.error(`Fel vid sparning av ${id}`, e);
      showNotification(`Kunde inte spara ${id}`, "error");
    }
  };

  const handleResetToFactory = async () => {
    if (confirm("Är du säker på att du vill återställa till fabriksvärden? Alla befintliga ändringar i det globala registret kommer att raderas.")) {
      setMaterials(INITIAL_MATERIALS);
      setArbetsData(INITIAL_ARBETS_DATA);
      setCustomCategories([]);
      
      await saveGlobalDefault('materials', INITIAL_MATERIALS);
      await saveGlobalDefault('arbetsmoments', INITIAL_ARBETS_DATA);
      await saveGlobalDefault('categories', []);
      showNotification("Återställt till fabriksvärden", "success");
    }
  };

  // --- Material handlers ---
  const updateMaterial = (i: number, u: Partial<Material>) => {
    const newMats = [...materials];
    newMats[i] = { ...newMats[i], ...u };
    setMaterials(newMats);
    saveGlobalDefault('materials', newMats);
  };
  const updateMultipleMaterials = (inds: number[], u: Partial<Material>) => {
    const newMats = [...materials];
    inds.forEach(i => { newMats[i] = { ...newMats[i], ...u }; });
    setMaterials(newMats);
    saveGlobalDefault('materials', newMats);
  };
  const addMaterial = (m: Material) => {
    const newMats = [...materials, m];
    setMaterials(newMats);
    saveGlobalDefault('materials', newMats);
  };
  const addMaterials = (m: Material[]) => {
    const newMats = [...materials, ...m];
    setMaterials(newMats);
    saveGlobalDefault('materials', newMats);
  };
  const deleteMaterial = (i: number) => {
    const newMats = materials.filter((_, idx) => idx !== i);
    setMaterials(newMats);
    saveGlobalDefault('materials', newMats);
  };
  const deleteMultipleMaterials = (inds: number[]) => {
    const newMats = materials.filter((_, idx) => !inds.includes(idx));
    setMaterials(newMats);
    saveGlobalDefault('materials', newMats);
  };

  // --- Arbetsmoment handlers ---
  const updateArbete = (i: number, u: Partial<ArbetsMoment>) => {
    const newArbs = [...arbetsData];
    newArbs[i] = { ...newArbs[i], ...u };
    setArbetsData(newArbs);
    saveGlobalDefault('arbetsmoments', newArbs);
  };
  const updateMultipleArbeten = (inds: number[], u: Partial<ArbetsMoment>) => {
    const newArbs = [...arbetsData];
    inds.forEach(i => { newArbs[i] = { ...newArbs[i], ...u }; });
    setArbetsData(newArbs);
    saveGlobalDefault('arbetsmoments', newArbs);
  };
  const addArbete = (a: ArbetsMoment) => {
    const newArbs = [...arbetsData, a];
    setArbetsData(newArbs);
    saveGlobalDefault('arbetsmoments', newArbs);
  };
  const addArbeten = (a: ArbetsMoment[]) => {
    const newArbs = [...arbetsData, ...a];
    setArbetsData(newArbs);
    saveGlobalDefault('arbetsmoments', newArbs);
  };
  const deleteArbete = (i: number) => {
    const newArbs = arbetsData.filter((_, idx) => idx !== i);
    setArbetsData(newArbs);
    saveGlobalDefault('arbetsmoments', newArbs);
  };
  const deleteMultipleArbeten = (inds: number[]) => {
    const newArbs = arbetsData.filter((_, idx) => !inds.includes(idx));
    setArbetsData(newArbs);
    saveGlobalDefault('arbetsmoments', newArbs);
  };

  // --- Category handlers ---
  const addCategory = (c: string) => {
    const newCats = [...customCategories, c];
    setCustomCategories(newCats);
    saveGlobalDefault('categories', newCats);
  };
  const renameCategory = (oldCat: string, newCat: string) => {
    const newCats = customCategories.map(c => c === oldCat ? newCat : c);
    setCustomCategories(newCats);
    saveGlobalDefault('categories', newCats);
    
    // Also update materials and arbetsmoment using this category
    let matsUpdated = false;
    const newMats = materials.map(m => {
      if (m.cat === oldCat) {
        matsUpdated = true;
        return { ...m, cat: newCat };
      }
      return m;
    });
    if (matsUpdated) {
      setMaterials(newMats);
      saveGlobalDefault('materials', newMats);
    }
    
    let arbsUpdated = false;
    const newArbs = arbetsData.map(a => {
      if (a.cat === oldCat) {
        arbsUpdated = true;
        return { ...a, cat: newCat };
      }
      return a;
    });
    if (arbsUpdated) {
      setArbetsData(newArbs);
      saveGlobalDefault('arbetsmoments', newArbs);
    }
  };
  const removeCategory = (c: string) => {
    const newCats = customCategories.filter(cat => cat !== c);
    setCustomCategories(newCats);
    saveGlobalDefault('categories', newCats);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laddar globala register...</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 max-w-7xl mx-auto rounded-lg relative">
      {notification && (
        <div className={`absolute top-4 right-4 px-4 py-2 rounded shadow-md text-white z-50 transition-all ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            <i className={`fa-solid ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
            {notification.message}
        </div>
      )}
      
      {/* Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-0">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <i className="fa-solid fa-exclamation-circle text-yellow-500 mt-1"></i>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 font-medium">
              Detta är PLATTFORMENS standardregister. Ändringar här påverkar vilka material/arbetsmoment nya företag startar med. Befintliga företags egna register ändras inte.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white px-6 pt-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <i className="fa-solid fa-globe mr-3 text-[var(--blue)]"></i>
              Globalt Standardregister
          </h2>
          <button 
            onClick={handleResetToFactory}
            className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
          >
            <i className="fa-solid fa-rotate-left mr-2"></i>
            Återställ till fabriksvärden
          </button>
        </div>
        <div className="flex space-x-6 border-b border-gray-200">
            <button 
                onClick={() => setActiveTab('material')}
                className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'material' ? 'border-[var(--blue)] text-[var(--blue)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
                Materialregister ({materials.length})
            </button>
            <button 
                onClick={() => setActiveTab('arbete')}
                className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'arbete' ? 'border-[var(--blue)] text-[var(--blue)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
                Arbetsmomentregister ({arbetsData.length})
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-white p-4 pb-20">
        {activeTab === 'material' && (
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Laddar Materialregister...</div>}>
            <MaterialTab 
              materials={materials} 
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
            />
          </Suspense>
        )}
        {activeTab === 'arbete' && (
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Laddar Arbetsmomentregister...</div>}>
            <ArbetsmomentTab 
              arbetsData={arbetsData}
              customCategories={customCategories}
              updateArbete={updateArbete}
              updateMultipleArbeten={updateMultipleArbeten}
              addArbete={addArbete}
              addArbeten={addArbeten}
              deleteArbete={deleteArbete}
              deleteMultipleArbeten={deleteMultipleArbeten}
              addCategory={addCategory}
              renameCategory={renameCategory}
              removeCategory={removeCategory}
              showNotification={showNotification}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
