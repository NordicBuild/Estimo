import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
'''           next.splice(dropIndex, 0, moved);
           localStorage.setItem('betong_saved_projects', JSON.stringify(next));
           return next;
        }
      }
      next.push(moved);
      localStorage.setItem('betong_saved_projects', JSON.stringify(next));
      return next;''',
'''           next.splice(dropIndex, 0, moved);
           localStorage.setItem('betong_saved_projects', JSON.stringify(next));
           if (dataSpaceId) saveProjectsToSupabase(next, dataSpaceId, user?.id || '');
           return next;
        }
      }
      next.push(moved);
      localStorage.setItem('betong_saved_projects', JSON.stringify(next));
      if (dataSpaceId) saveProjectsToSupabase(next, dataSpaceId, user?.id || '');
      return next;'''
)

with open("src/App.tsx", "w") as f:
    f.write(content)
