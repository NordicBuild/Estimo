import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

export type DocumentType = 'ritning' | 'mätning' | 'instruktion' | 'bild' | 'annat';
export type FilterType = 'all' | DocumentType;

export interface DocumentFolder {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  icon: string | null;
  position: number;
}

export interface ProjectDocument {
  id: string;
  folder_id: string;
  filename: string;
  mime_type: string;
  size: number;
  document_type: DocumentType;
  tags?: string[];
}

export interface FfuState {
  activeProjectId: string | null;
  activeFolderId: string | null;
  folderHierarchy: DocumentFolder[];
  documents: ProjectDocument[];
  searchText: string;
  selectedTags: Set<string>;
  filterByType: FilterType;
  selectedDocumentIds: Set<string>;
  uploadProgress: Map<string, number>;
  showNewFolderDialog: boolean;
  showUploadZone: boolean;
  loading: boolean;
  error: string | null;
}

export interface FfuActions {
  setActiveProject: (projectId: string | null) => void;
  setActiveFolder: (folderId: string | null) => void;
  fetchFolderHierarchy: (projectId: string) => Promise<void>;
  fetchDocumentsInFolder: (folderId: string) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  selectDocument: (docId: string, isMultiSelect: boolean) => void;
  deselectAll: () => void;
  addTag: (documentId: string, tagName: string) => Promise<void>;
  removeTag: (documentId: string, tagName: string) => Promise<void>;
  setSearchText: (text: string) => void;
  setFilterByType: (type: FilterType) => void;
  toggleTagFilter: (tagName: string) => void;
  setUploadProgress: (filename: string, percent: number) => void;
  setShowNewFolderDialog: (show: boolean) => void;
  setShowUploadZone: (show: boolean) => void;
}

type FfuStore = FfuState & FfuActions;

const initialState: FfuState = {
  activeProjectId: null,
  activeFolderId: null,
  folderHierarchy: [],
  documents: [],
  searchText: '',
  selectedTags: new Set(),
  filterByType: 'all',
  selectedDocumentIds: new Set(),
  uploadProgress: new Map(),
  showNewFolderDialog: false,
  showUploadZone: false,
  loading: false,
  error: null,
};

export const useFfuStore = create<FfuStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setActiveProject: (projectId) => set({ activeProjectId: projectId }),
        setActiveFolder: (folderId) => set({ activeFolderId: folderId }),

        fetchFolderHierarchy: async (projectId) => {
          set({ loading: true, error: null });
          try {
            set({ folderHierarchy: [], loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        fetchDocumentsInFolder: async (folderId) => {
          set({ loading: true, error: null });
          try {
            set({ documents: [], loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        createFolder: async (name, parentId) => {
          const { activeProjectId, folderHierarchy } = get();
          if (!activeProjectId) return;
          
          set({ loading: true, error: null });
          try {
            const newFolder: DocumentFolder = {
              id: crypto.randomUUID(),
              project_id: activeProjectId,
              parent_id: parentId,
              name,
              icon: null,
              position: folderHierarchy.length,
            };
            set((state) => ({
              folderHierarchy: [...state.folderHierarchy, newFolder],
              loading: false,
              showNewFolderDialog: false,
            }));
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        renameFolder: async (folderId, newName) => {
          set({ loading: true, error: null });
          try {
            set((state) => ({
              folderHierarchy: state.folderHierarchy.map((f) =>
                f.id === folderId ? { ...f, name: newName } : f
              ),
              loading: false,
            }));
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        deleteFolder: async (folderId) => {
          set({ loading: true, error: null });
          try {
            set((state) => {
              const foldersToRemove = new Set<string>([folderId]);
              let changed = true;
              while (changed) {
                changed = false;
                for (const f of state.folderHierarchy) {
                  if (f.parent_id && foldersToRemove.has(f.parent_id) && !foldersToRemove.has(f.id)) {
                    foldersToRemove.add(f.id);
                    changed = true;
                  }
                }
              }
              
              return {
                folderHierarchy: state.folderHierarchy.filter(f => !foldersToRemove.has(f.id)),
                activeFolderId: foldersToRemove.has(state.activeFolderId || '') ? null : state.activeFolderId,
                loading: false,
              };
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        selectDocument: (docId, isMultiSelect) => {
          set((state) => {
            const newSelected = new Set(isMultiSelect ? state.selectedDocumentIds : []);
            if (newSelected.has(docId)) {
              newSelected.delete(docId);
            } else {
              newSelected.add(docId);
            }
            return { selectedDocumentIds: newSelected };
          });
        },

        deselectAll: () => set({ selectedDocumentIds: new Set() }),

        addTag: async (documentId, tagName) => {
          set((state) => ({
            documents: state.documents.map(doc => 
              doc.id === documentId 
                ? { ...doc, tags: [...new Set([...(doc.tags || []), tagName])] }
                : doc
            )
          }));
        },

        removeTag: async (documentId, tagName) => {
          set((state) => ({
            documents: state.documents.map(doc => 
              doc.id === documentId 
                ? { ...doc, tags: (doc.tags || []).filter(t => t !== tagName) }
                : doc
            )
          }));
        },

        setSearchText: (text) => set({ searchText: text }),
        
        setFilterByType: (type) => set({ filterByType: type }),
        
        toggleTagFilter: (tagName) => set((state) => {
          const newTags = new Set(state.selectedTags);
          if (newTags.has(tagName)) {
            newTags.delete(tagName);
          } else {
            newTags.add(tagName);
          }
          return { selectedTags: newTags };
        }),

        setUploadProgress: (filename, percent) => set((state) => {
          const newProgress = new Map(state.uploadProgress);
          if (percent >= 100) {
            newProgress.delete(filename);
          } else {
            newProgress.set(filename, percent);
          }
          return { uploadProgress: newProgress };
        }),

        setShowNewFolderDialog: (show) => set({ showNewFolderDialog: show }),
        setShowUploadZone: (show) => set({ showUploadZone: show }),
      }),
      {
        name: 'ffu-search-storage',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          searchText: state.searchText,
          filterByType: state.filterByType,
          selectedTags: Array.from(state.selectedTags) as any,
        }),
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          selectedTags: new Set(persistedState?.selectedTags || []),
        }),
      }
    ),
    { name: 'FFU Store' }
  )
);

export const useFfuFolder = () => {
  const { activeFolderId, folderHierarchy } = useFfuStore();

  const breadcrumb = (): { id: string; name: string }[] => {
    const path: { id: string; name: string }[] = [];
    let currentId = activeFolderId;
    
    while (currentId) {
      const folder = folderHierarchy.find(f => f.id === currentId);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parent_id;
      } else {
        break;
      }
    }
    return path;
  };

  const visibleFolders = (): DocumentFolder[] => {
    return folderHierarchy
      .filter(f => f.parent_id === activeFolderId)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  };

  const activeFolder = folderHierarchy.find(f => f.id === activeFolderId) || null;

  return { activeFolder, breadcrumb: breadcrumb(), visibleFolders: visibleFolders() };
};

export const useFfuSearch = () => {
  const { documents, searchText, filterByType, selectedTags } = useFfuStore();

  const filteredDocuments = (): ProjectDocument[] => {
    return documents.filter(doc => {
      if (filterByType !== 'all' && doc.document_type !== filterByType) {
        return false;
      }
      if (searchText) {
        const query = searchText.toLowerCase();
        if (!(doc.filename || '').toLowerCase().includes(query)) {
          return false;
        }
      }
      if (selectedTags.size > 0) {
        const docTags = new Set(doc.tags || []);
        for (const tag of selectedTags) {
          if (!docTags.has(tag)) {
            return false;
          }
        }
      }
      return true;
    });
  };

  return { filteredDocuments: filteredDocuments() };
};

export const useFfuSelection = () => {
  const selectedDocumentIds = useFfuStore(state => state.selectedDocumentIds);
  const selectDocument = useFfuStore(state => state.selectDocument);
  const deselectAll = useFfuStore(state => state.deselectAll);
  
  return {
    selectedDocumentIds,
    selectedCount: selectedDocumentIds.size,
    isAllSelected: (docIds: string[]) => docIds.length > 0 && docIds.every(id => selectedDocumentIds.has(id)),
    selectDocument,
    deselectAll,
  };
};

export const useFfuUpload = () => {
  const uploadProgress = useFfuStore(state => state.uploadProgress);
  const setUploadProgress = useFfuStore(state => state.setUploadProgress);
  const showUploadZone = useFfuStore(state => state.showUploadZone);
  const setShowUploadZone = useFfuStore(state => state.setShowUploadZone);
  
  const totalUploadProgress = (): number => {
    if (uploadProgress.size === 0) return 0;
    let sum = 0;
    uploadProgress.forEach(progress => sum += progress);
    return Math.round(sum / uploadProgress.size);
  };

  return {
    uploadProgress,
    totalUploadProgress: totalUploadProgress(),
    isUploading: uploadProgress.size > 0,
    showUploadZone,
    setUploadProgress,
    setShowUploadZone,
  };
};
