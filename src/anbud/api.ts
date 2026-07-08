import { supabase } from '../supabase';

export interface DbOffert {
  id: string;
  company_id: string;
  project_id: string;
  anbud_id: string | null;
  leverantor: string;
  typ: 'ue' | 'leverantor';
  valuta: string;
  status: string;
  poster: Record<string, number>;
  fast_tillagg: number;
  giltig_till: string | null;
  not: string | null;
  created_at?: string;
}

export function isOffert(obj: any): obj is DbOffert {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.project_id !== 'string') return false;
  if (typeof obj.leverantor !== 'string') return false;
  if (obj.typ !== 'ue' && obj.typ !== 'leverantor') return false;
  if (typeof obj.poster !== 'object') return false;
  return true;
}

export async function listOfferter(projectId: string): Promise<DbOffert[]> {
  try {
    const { data, error } = await supabase
      .from('leverantor_offert')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      // warning removed
      return [];
    }

    return (data || []) as DbOffert[];
  } catch (err) {
    // warning removed
    return [];
  }
}

export async function saveOffert(offert: DbOffert): Promise<void> {
  if (!isOffert(offert)) {
    throw new Error('Ogiltig offert');
  }

  const { error } = await supabase
    .from('leverantor_offert')
    .upsert({
      id: offert.id,
      company_id: offert.company_id,
      project_id: offert.project_id,
      anbud_id: offert.anbud_id,
      leverantor: offert.leverantor,
      typ: offert.typ,
      valuta: offert.valuta || 'SEK',
      status: offert.status || 'inkommen',
      poster: offert.poster,
      fast_tillagg: offert.fast_tillagg || 0,
      giltig_till: offert.giltig_till,
      not: offert.not
    });

  if (error) {
    // warning removed
    throw error;
  }
}

export async function deleteOffert(id: string): Promise<void> {
  const { error } = await supabase
    .from('leverantor_offert')
    .delete()
    .eq('id', id);

  if (error) {
    // warning removed
    throw error;
  }
}

export async function setStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('leverantor_offert')
    .update({ status })
    .eq('id', id);

  if (error) {
    // warning removed
    throw error;
  }
}
