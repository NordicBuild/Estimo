import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. createProject
content = content.replace(
'''        setProjects(prev => {
          const updated = [...prev, newProj];
          localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
          return updated;
        });''',
'''        setProjects(prev => {
          const updated = [...prev, newProj];
          localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
          if (dataSpaceId) saveProjectsToSupabase(updated, dataSpaceId, user?.id || '');
          return updated;
        });'''
)

# 2. duplicateProject
content = content.replace(
'''    setProjects(prev => {
      const updated = [...prev, newProj];
      localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
      return updated;
    });''',
'''    setProjects(prev => {
      const updated = [...prev, newProj];
      localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
      if (dataSpaceId) saveProjectsToSupabase(updated, dataSpaceId, user?.id || '');
      return updated;
    });'''
)

# 3. deleteProject
content = content.replace(
'''      setProjects(updatedList);
      localStorage.setItem('betong_saved_projects', JSON.stringify(updatedList));''',
'''      setProjects(updatedList);
      localStorage.setItem('betong_saved_projects', JSON.stringify(updatedList));
      if (dataSpaceId) saveProjectsToSupabase(updatedList, dataSpaceId, user?.id || '');'''
)

content = content.replace(
'''          localStorage.setItem('betong_saved_projects', JSON.stringify(restored));
          return restored;''',
'''          localStorage.setItem('betong_saved_projects', JSON.stringify(restored));
          if (dataSpaceId) saveProjectsToSupabase(restored, dataSpaceId, user?.id || '');
          return restored;'''
)

with open("src/App.tsx", "w") as f:
    f.write(content)
