import re

with open("src/supabase.ts", "r") as f:
    content = f.read()

new_functions = """
export async function saveProjectsToSupabase(
  projects: any[], 
  companyId: string,
  userId: string
): Promise<boolean> {
  if (!companyId) return false;
  try {
    const { error } = await supabase.from('app_state').upsert({
      id: `projects_${companyId}`,
      company_id: companyId,
      data: projects
    });
    if (error) {
      console.error('Failed to sync projects to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception syncing projects to Supabase:', err);
    return false;
  }
}

export async function saveFoldersToSupabase(
  folders: any[], 
  companyId: string,
  userId: string
): Promise<boolean> {
  if (!companyId) return false;
  try {
    const { error } = await supabase.from('app_state').upsert({
      id: `folders_${companyId}`,
      company_id: companyId,
      data: folders
    });
    if (error) {
      console.error('Failed to sync folders to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception syncing folders to Supabase:', err);
    return false;
  }
}
"""

if "saveProjectsToSupabase" not in content:
    content += "\n" + new_functions

with open("src/supabase.ts", "w") as f:
    f.write(content)
