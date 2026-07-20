import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
'''      if (newName && newName.trim()) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, projectInfo: { ...p.projectInfo, name: newName.trim() } } : p));
        if (activeProjectId === id) {''',
'''      if (newName && newName.trim()) {
        setProjects(prev => {
          const updated = prev.map(p => p.id === id ? { ...p, projectInfo: { ...p.projectInfo, name: newName.trim() } } : p);
          localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
          if (dataSpaceId) saveProjectsToSupabase(updated, dataSpaceId, user?.id || '');
          return updated;
        });
        if (activeProjectId === id) {'''
)

with open("src/App.tsx", "w") as f:
    f.write(content)
