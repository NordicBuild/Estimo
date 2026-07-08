import { supabase } from '../supabase';

export interface DbUtfall {
  id?: string;
  company_id: string;
  project_id: string;
  line_key: string;
  ac: number | null;
  fardiggrad: number | null;
  manuell_eac: number | null;
  noterat_at?: string;
}

export async function listUtfall(companyId: string, projectId: string): Promise<DbUtfall[]> {
  try {
    const { data, error } = await supabase
      .from('projekt_utfall')
      .select('*')
      .eq('company_id', companyId)
      .eq('project_id', projectId);

    if (error) {
      // warning removed
      return [];
    }

    return (data || []) as DbUtfall[];
  } catch (err) {
    // warning removed
    return [];
  }
}

export async function saveUtfall(utfall: DbUtfall): Promise<void> {
  const payload = {
    company_id: utfall.company_id,
    project_id: utfall.project_id,
    line_key: utfall.line_key,
    ac: utfall.ac,
    fardiggrad: utfall.fardiggrad,
    manuell_eac: utfall.manuell_eac,
    noterat_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('projekt_utfall')
    .upsert(payload, { onConflict: 'project_id,line_key' });

  if (error) {
    // warning removed
    throw error;
  }
}
