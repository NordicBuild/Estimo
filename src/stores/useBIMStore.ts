import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '../supabase';

export interface BIMElement {
  id: string;
  model_id: string;
  guid: string;
  category: string;
  name: string;
  storey: string;
  properties: any;
  geometry_data?: any;
  discipline?: string;
}

export interface BIMSnapshot {
  id: string;
  name: string;
  camera_state: any;
  visibility_state: any;
  selection_state: string[]; // Array of selected element IDs for serializability
  created_at?: string;
}

export interface BIMState {
  activeModelId: string | null;
  modelUrl: string | null;
  modelName: string;
  elements: BIMElement[];
  selectedElementIds: Set<string>;
  filters: {
    categories: Set<string>;
    storeys: Set<string>;
    disciplines: Set<string>;
    searchText: string;
  };
  clipping: {
    enabled: boolean;
    axisX: [min: number, max: number];
    axisY: [min: number, max: number];
    axisZ: [min: number, max: number];
  };
  colorMode: 'by-category' | 'by-discipline' | 'default';
  snapshots: BIMSnapshot[];
  loading: boolean;
  error: string | null;

  // Actions
  setActiveModel: (modelId: string | null) => Promise<void>;
  setElements: (elements: BIMElement[]) => void;
  selectElement: (elementId: string, isMultiSelect?: boolean) => void;
  deselectAll: () => void;
  toggleCategory: (categoryName: string) => void;
  toggleStorey: (storeyName: string) => void;
  toggleDiscipline: (disciplineName: string) => void;
  clearFilters: () => void;
  setSearchText: (text: string) => void;
  setClipping: (axisX: [number, number], axisY: [number, number], axisZ: [number, number]) => void;
  setClippingEnabled: (enabled: boolean) => void;
  saveSnapshot: (config: Omit<BIMSnapshot, 'id' | 'created_at'>) => BIMSnapshot;
  loadSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
  setColorMode: (mode: 'by-category' | 'by-discipline' | 'default') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setModelUrl: (url: string | null) => void;
  setModelName: (name: string) => void;
}

export const useBIMStore = create<BIMState>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        activeModelId: null,
        modelUrl: null,
        modelName: 'Exempelmodell (Mock)',
        elements: [],
        selectedElementIds: new Set<string>(),
        filters: {
          categories: new Set<string>(),
          storeys: new Set<string>(),
          disciplines: new Set<string>(),
          searchText: '',
        },
        clipping: {
          enabled: false,
          axisX: [0, 100],
          axisY: [0, 100],
          axisZ: [0, 100],
        },
        colorMode: 'default',
        snapshots: [],
        loading: false,
        error: null,

        // Actions
        setActiveModel: async (modelId) => {
          set({ activeModelId: modelId, loading: true, error: null });
          if (!modelId) {
            set({ modelUrl: null, elements: [], loading: false });
            return;
          }
          try {
            // Fetch model details for URL
            const { data: modelData, error: modelError } = await supabase
              .from('bim_models')
              .select('geometry_url, has_geometry')
              .eq('id', modelId)
              .single();

            if (modelError) throw modelError;

            // Fetch elements
            const { data: elements, error: elementsError } = await supabase
              .from('bim_elements')
              .select('*')
              .eq('model_id', modelId);

            if (elementsError) throw elementsError;

            set({
              modelUrl: modelData.geometry_url || null,
              elements: (elements as BIMElement[]) || [],
              loading: false
            });
          } catch (err: any) {
            console.error('[BIMStore] Failed to set active model', err);
            set({ error: err.message, loading: false });
          }
        },

        setElements: (elements) => set({ elements }),

        selectElement: (elementId, isMultiSelect = false) => set((state) => {
          const newSelection = new Set(isMultiSelect ? state.selectedElementIds : []);
          if (newSelection.has(elementId)) {
            newSelection.delete(elementId);
          } else {
            newSelection.add(elementId);
          }
          return { selectedElementIds: newSelection };
        }),

        deselectAll: () => set({ selectedElementIds: new Set<string>() }),

        toggleCategory: (categoryName) => set((state) => {
          const newCategories = new Set(state.filters.categories);
          if (newCategories.has(categoryName)) {
            newCategories.delete(categoryName);
          } else {
            newCategories.add(categoryName);
          }
          return { filters: { ...state.filters, categories: newCategories } };
        }),

        toggleStorey: (storeyName) => set((state) => {
          const newStoreys = new Set(state.filters.storeys);
          if (newStoreys.has(storeyName)) {
            newStoreys.delete(storeyName);
          } else {
            newStoreys.add(storeyName);
          }
          return { filters: { ...state.filters, storeys: newStoreys } };
        }),

        toggleDiscipline: (disciplineName) => set((state) => {
          const newDisciplines = new Set(state.filters.disciplines);
          if (newDisciplines.has(disciplineName)) {
            newDisciplines.delete(disciplineName);
          } else {
            newDisciplines.add(disciplineName);
          }
          return { filters: { ...state.filters, disciplines: newDisciplines } };
        }),

        clearFilters: () => set((state) => ({
          filters: {
            categories: new Set(),
            storeys: new Set(),
            disciplines: new Set(),
            searchText: ''
          }
        })),

        setSearchText: (text) => set((state) => ({
          filters: { ...state.filters, searchText: text }
        })),

        setClipping: (axisX, axisY, axisZ) => set((state) => ({
          clipping: { ...state.clipping, axisX, axisY, axisZ }
        })),

        setClippingEnabled: (enabled) => set((state) => ({
          clipping: { ...state.clipping, enabled }
        })),

        saveSnapshot: (config) => {
          const newSnapshot: BIMSnapshot = {
            ...config,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          };
          set((state) => ({
            snapshots: [...state.snapshots, newSnapshot]
          }));
          return newSnapshot;
        },

        loadSnapshot: (snapshotId) => set((state) => {
          const snapshot = state.snapshots.find(s => s.id === snapshotId);
          if (!snapshot) return state;

          return {
            selectedElementIds: new Set(snapshot.selection_state),
            // Restoring other snapshot states could be added here
          };
        }),

        deleteSnapshot: (snapshotId) => set((state) => ({
          snapshots: state.snapshots.filter(s => s.id !== snapshotId)
        })),

        setColorMode: (mode) => set({ colorMode: mode }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        setModelUrl: (url) => set({ modelUrl: url }),
        setModelName: (name) => set({ modelName: name }),
      }),
      {
        name: 'bim-store-snapshots',
        // Only persist the snapshots array to localStorage
        partialize: (state) => ({ snapshots: state.snapshots }),
      }
    ),
    { name: 'BIMStore' }
  )
);

// Helper Functions
export const getVisibleElements = (elements: BIMElement[], filters: BIMState['filters']): BIMElement[] => {
  const searchLower = filters.searchText.toLowerCase();

  return elements.filter((el) => {
    // Category Filter
    if (filters.categories.size > 0 && !filters.categories.has(el.category)) return false;
    
    // Storey Filter
    if (filters.storeys.size > 0 && !filters.storeys.has(el.storey)) return false;
    
    // Discipline Filter
    if (filters.disciplines.size > 0 && el.discipline && !filters.disciplines.has(el.discipline)) return false;
    
    // Search Filter
    if (searchLower) {
      const matchName = el.name?.toLowerCase().includes(searchLower);
      const matchGuid = el.guid?.toLowerCase().includes(searchLower);
      if (!matchName && !matchGuid) return false;
    }

    return true;
  });
};

export const selectElementsByCategory = (state: BIMState): Map<string, BIMElement[]> => {
  const map = new Map<string, BIMElement[]>();
  state.elements.forEach(el => {
    const cat = el.category || 'Unknown';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(el);
  });
  return map;
};

export const selectElementsByStorey = (state: BIMState): Map<string, BIMElement[]> => {
  const map = new Map<string, BIMElement[]>();
  state.elements.forEach(el => {
    const storey = el.storey || 'Unknown';
    if (!map.has(storey)) map.set(storey, []);
    map.get(storey)!.push(el);
  });
  return map;
};

export const selectSelectedElementCount = (state: BIMState): number => {
  return state.selectedElementIds.size;
};
