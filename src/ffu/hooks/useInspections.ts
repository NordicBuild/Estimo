import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../state/AuthContext';

export interface ChecklistItemDef {
  id: string;
  label: string;
  required: boolean;
  category?: string;
  expected_photo?: boolean;
}

export interface InspectionChecklist {
  id: string;
  name: string;
  description: string;
  items: ChecklistItemDef[];
  created_at: string;
}

export interface InspectionItemVal {
  item_id: string;
  checked: boolean;
  notes: string;
  photo_urls: string[];
  timestamp: string;
}

export interface InspectionReport {
  id: string;
  checklist_id: string;
  document_id?: string;
  inspector_id: string;
  inspection_date: string;
  status: 'draft' | 'submitted' | 'approved';
  items: InspectionItemVal[];
  location_coordinates?: string;
  created_at: string;
  completed_at?: string;
  approved_by?: string;
  approved_at?: string;
  checklist?: InspectionChecklist;
  inspector?: { first_name: string; last_name: string };
  approver?: { first_name: string; last_name: string };
}

export function useInspections(projectId: string | null) {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<InspectionChecklist[]>([]);
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChecklists = useCallback(async () => {
    if (!projectId || !user) return;
    const { data, error } = await supabase
      .from('inspection_checklists')
      .select('*')
      .eq('project_id', projectId);
    if (!error && data) setChecklists(data as any);
  }, [projectId, user]);

  const fetchReports = useCallback(async () => {
    if (!projectId || !user) return;
    const { data, error } = await supabase
      .from('inspection_reports')
      .select(`
        *,
        checklist:inspection_checklists(*),
        inspector:profiles!inspector_id(first_name, last_name),
        approver:profiles!approved_by(first_name, last_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (!error && data) setReports(data as any);
  }, [projectId, user]);

  useEffect(() => {
    if (projectId && user) {
      setIsLoading(true);
      Promise.all([fetchChecklists(), fetchReports()]).finally(() => setIsLoading(false));
    }
  }, [projectId, user, fetchChecklists, fetchReports]);

  const startInspection = async (checklistId: string, documentId?: string) => {
    if (!projectId || !user) throw new Error('Missing context');
    
    let location = null;
    try {
      if ('geolocation' in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = `POINT(${pos.coords.longitude} ${pos.coords.latitude})`;
      }
    } catch (e) {
      console.warn('GPS not available', e);
    }

    const { data, error } = await supabase
      .from('inspection_reports')
      .insert({
        company_id: (user?.user_metadata?.company_id || localStorage.getItem('companyId') || ''),
        project_id: projectId,
        checklist_id: checklistId,
        document_id: documentId || null,
        inspector_id: user.id,
        status: 'draft',
        items: [],
        location_coordinates: location
      })
      .select()
      .single();

    if (error) throw error;
    await fetchReports();
    return data;
  };

  const saveInspectionDraft = async (reportId: string, items: InspectionItemVal[]) => {
    const { error } = await supabase
      .from('inspection_reports')
      .update({ items })
      .eq('id', reportId);
    if (error) throw error;
    await fetchReports();
  };

  const submitInspection = async (reportId: string) => {
    const { error } = await supabase
      .from('inspection_reports')
      .update({ 
        status: 'submitted',
        completed_at: new Date().toISOString()
      })
      .eq('id', reportId);
    if (error) throw error;
    await fetchReports();
  };

  const approveInspection = async (reportId: string, notes?: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('inspection_reports')
      .update({ 
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', reportId);
    if (error) throw error;
    await fetchReports();
  };
  
  const uploadPhoto = async (reportId: string, itemId: string, file: File) => {
    if (!projectId) throw new Error('No project');
    const path = `inspections/${projectId}/${reportId}/${itemId}_${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('projects')
      .upload(path, file);
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('projects')
      .getPublicUrl(path);
      
    return publicUrl;
  };

  return {
    checklists,
    reports,
    isLoading,
    startInspection,
    saveInspectionDraft,
    submitInspection,
    approveInspection,
    uploadPhoto,
    refresh: fetchReports
  };
}
