import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';

// We infer the type from the hook return type
export type ProjectDataContextType = ReturnType<typeof useSupabaseData>;

const ProjectDataContext = createContext<ProjectDataContextType | undefined>(undefined);

export function ProjectDataProvider({ children, value }: { children: ReactNode, value: ProjectDataContextType }) {
  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
}

export function useProjectData() {
  const context = useContext(ProjectDataContext);
  if (context === undefined) {
    throw new Error('useProjectData must be used within a ProjectDataProvider');
  }
  return context;
}
