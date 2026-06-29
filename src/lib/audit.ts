import { supabase } from '../supabase';

export async function logEvent(event: string, meta: object = {}) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const company_id = profile?.company_id;

    await supabase.from('audit_log').insert({
      user_id: user.id,
      company_id: company_id,
      event,
      meta
    });
  } catch (error) {
    console.error("Failed to log audit event", error);
  }
}
