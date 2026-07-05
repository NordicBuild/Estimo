import { supabase } from '../supabase';
import { Recept } from './recept';

export interface DbRecept {
  id: string;
  company_id: string;
  kod: string | null;
  namn: string;
  enhet: string | null;
  byggdel_type: string | null;
  byggdelsgrupp: string | null;
  data: Recept;
  created_at?: string;
}

export function isRecept(obj: any): obj is Recept {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.mangd !== 'number') return false;
  if (!Array.isArray(obj.material)) return false;
  if (!Array.isArray(obj.arbete)) return false;
  return true;
}

export async function listRecept(companyId: string): Promise<DbRecept[]> {
  try {
    const { data, error } = await supabase
      .from('byggdel_recept')
      .select('*')
      .eq('company_id', companyId)
      .order('namn', { ascending: true });

    if (error) {
      // warning removed
      return [];
    }

    return (data || []) as DbRecept[];
  } catch (err) {
    // warning removed
    return [];
  }
}

export async function saveRecept(dbRecept: DbRecept): Promise<void> {
  if (!isRecept(dbRecept.data)) {
    throw new Error('Ogiltigt recept-data');
  }

  const { error } = await supabase
    .from('byggdel_recept')
    .upsert({
      id: dbRecept.id,
      company_id: dbRecept.company_id,
      kod: dbRecept.kod,
      namn: dbRecept.namn,
      enhet: dbRecept.enhet,
      byggdel_type: dbRecept.byggdel_type,
      byggdelsgrupp: dbRecept.byggdelsgrupp,
      data: dbRecept.data,
    });

  if (error) {
    // warning removed
    throw error;
  }
}

export async function deleteRecept(id: string): Promise<void> {
  const { error } = await supabase
    .from('byggdel_recept')
    .delete()
    .eq('id', id);

  if (error) {
    // warning removed
    throw error;
  }
}
