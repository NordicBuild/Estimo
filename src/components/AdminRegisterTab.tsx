import React, { useState, useEffect, Suspense, lazy } from 'react';
import { supabase } from '../supabase';
import { Material, ArbetsMoment, INITIAL_MATERIALS, INITIAL_ARBETS_DATA } from '../data';

const MaterialTab = lazy(() => import('./MaterialTab').then(m => ({ default: m.MaterialTab })));
const ArbetsmomentTab = lazy(() => import('./ArbetsmomentTab').then(m => ({ default: m.ArbetsmomentTab })));

interface AdminRegisterTabProps {
  materials?: Material[];
  updateMaterial?: (i: number, u: Partial<Material>) => void;
  updateMultipleMaterials?: (inds: number[], u: Partial<Material>) => void;
  addMaterial?: (m: Material) => void;
  addMaterials?: (m: Material[]) => void;
  deleteMaterial?: (i: number) => void;
  deleteMultipleMaterials?: (inds: number[]) => void;

  arbetsData?: ArbetsMoment[];
  updateArbete?: (i: number, u: Partial<ArbetsMoment>) => void;
  updateMultipleArbeten?: (inds: number[], u: Partial<ArbetsMoment>) => void;
  addArbete?: (a: ArbetsMoment) => void;
  addArbeten?: (a: ArbetsMoment[]) => void;
  deleteArbete?: (i: number) => void;
  deleteMultipleArbeten?: (inds: number[]) => void;

  customCategories?: string[];
  addCategory?: (c: string) => void;
  renameCategory?: (o: string, n: string) => void;
  removeCategory?: (c: string) => void;
}

export function AdminRegisterTab({
  materials = [], updateMaterial = () => {}, updateMultipleMaterials = () => {}, addMaterial = () => {}, addMaterials = () => {}, deleteMaterial = () => {}, deleteMultipleMaterials = () => {},
  arbetsData = [], updateArbete = () => {}, updateMultipleArbeten = () => {}, addArbete = () => {}, addArbeten = () => {}, deleteArbete = () => {}, deleteMultipleArbeten = () => {},
  customCategories = [], addCategory = () => {}, renameCategory = () => {}, removeCategory = () => {}
}: AdminRegisterTabProps) {
  const [activeTab, setActiveTab] = useState<'material' | 'arbete'>('material');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };


  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 max-w-7xl mx-auto rounded-lg relative">
      {notification && (
        <div className={`absolute top-4 right-4 px-4 py-2 rounded shadow-md text-white z-50 transition-all ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            <i className={`fa-solid ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
            {notification.message}
        </div>
      )}
      <div className="bg-white px-6 pt-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <i className="fa-solid fa-database mr-3 text-[var(--blue)]"></i>
            Standardregister (Basdata för nya databaser)
        </h2>
        <p className="text-sm text-gray-500 mb-6">Detta register fungerar som en master och kopieras till kalkyler/organisationer som standard när en ny användare loggar in eller återställer sin data. Du lägger material och arbetsmoment här, som användarna sedan kan ändra i sin portal.</p>
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
