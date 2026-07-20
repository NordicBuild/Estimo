import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
'''      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;''',
'''      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      localStorage.setItem('betong_folders', JSON.stringify(next));
      if (dataSpaceId) saveFoldersToSupabase(next, dataSpaceId, user?.id || '');
      return next;'''
)

with open("src/App.tsx", "w") as f:
    f.write(content)
