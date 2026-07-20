import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
'''      if (name && name.trim()) {
        setFolders(prev => [...prev, { id: 'folder_' + Date.now(), name: name.trim() }]);
      }''',
'''      if (name && name.trim()) {
        setFolders(prev => {
          const updated = [...prev, { id: 'folder_' + Date.now(), name: name.trim() }];
          localStorage.setItem('betong_folders', JSON.stringify(updated));
          if (dataSpaceId) saveFoldersToSupabase(updated, dataSpaceId, user?.id || '');
          if (dataSpaceId) saveProjectsToSupabase(projects, dataSpaceId, user?.id || '');
          return updated;
        });
      }'''
)

with open("src/App.tsx", "w") as f:
    f.write(content)
