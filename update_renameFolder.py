import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
'''      if (newName && newName.trim()) {
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
      }''',
'''      if (newName && newName.trim()) {
        setFolders(prev => {
          const updated = prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f);
          localStorage.setItem('betong_folders', JSON.stringify(updated));
          if (dataSpaceId) saveFoldersToSupabase(updated, dataSpaceId, user?.id || '');
          if (dataSpaceId) saveProjectsToSupabase(projects, dataSpaceId, user?.id || '');
          return updated;
        });
      }'''
)

with open("src/App.tsx", "w") as f:
    f.write(content)
