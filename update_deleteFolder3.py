import re

with open("src/App.tsx", "r") as f:
    content = f.read()

def replacer(match):
    return '''      setFolders(prev => {
        const updated = prev.filter(f => f.id !== id);
        localStorage.setItem('betong_folders', JSON.stringify(updated));
        if (dataSpaceId) saveFoldersToSupabase(updated, dataSpaceId, user?.id || '');
        return updated;
      });
      setProjects(prev => {
        const updatedProj = prev.map(p => p.folderId === id ? { ...p, folderId: null } : p);
        localStorage.setItem('betong_saved_projects', JSON.stringify(updatedProj));
        if (dataSpaceId) saveProjectsToSupabase(updatedProj, dataSpaceId, user?.id || '');
        return updatedProj;
      });
      showUndoToast(`Mapp '${deletedFolder.name}' borttagen`, () => {
        setFolders(prev => {
          const updated = [...prev, deletedFolder];
          localStorage.setItem('betong_folders', JSON.stringify(updated));
          if (dataSpaceId) saveFoldersToSupabase(updated, dataSpaceId, user?.id || '');
          return updated;
        });
        setProjects(prev => {
          const updatedProj = prev.map(p => previousProjectIdsInFolder.includes(p.id) ? { ...p, folderId: id } : p);
          localStorage.setItem('betong_saved_projects', JSON.stringify(updatedProj));
          if (dataSpaceId) saveProjectsToSupabase(updatedProj, dataSpaceId, user?.id || '');
          return updatedProj;
        });
        setUndoToast(null);
      });'''

old_content = content
content = re.sub(
    r"      setFolders\(prev => prev\.filter\(f => f\.id !== id\)\);\n      setProjects\(prev => prev\.map\(p => p\.folderId === id \? \{ \.\.\.p, folderId: null \} : p\)\);\n      showUndoToast\(`Mapp '\$\{deletedFolder\.name\}' borttagen`, \(\) => \{\n        setFolders\(prev => \[\.\.\.prev, deletedFolder\]\)\;\n        setProjects\(prev => prev\.map\(p => previousProjectIdsInFolder\.includes\(p\.id\) \? \{ \.\.\.p, folderId: id \} : p\)\);\n        setUndoToast\(null\);\n      \}\);",
    replacer,
    content,
    flags=re.DOTALL
)

if old_content == content:
    print("NO CHANGE")
else:
    print("CHANGED")

with open("src/App.tsx", "w") as f:
    f.write(content)
