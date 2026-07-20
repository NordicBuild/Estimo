import re

with open("src/App.tsx", "r") as f:
    content = f.read()

new_func = '''  const deleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmAction("Ta bort mapp", "Är du säker på att du vill ta bort mappen? Alla projekt i mappen kommer att flyttas till roten.", () => {
      const deletedFolder = folders.find(f => f.id === id);
      if (!deletedFolder) return;
      
      const previousProjectIdsInFolder = projects.filter(p => p.folderId === id).map(p => p.id);
      
      setFolders(prev => {
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
      });
    });
  };'''

content = re.sub(
    r"  const deleteFolder = \(id: string, e: React\.MouseEvent\) => \{.*?\n  \};\n",
    new_func + "\n",
    content,
    flags=re.DOTALL
)

with open("src/App.tsx", "w") as f:
    f.write(content)
