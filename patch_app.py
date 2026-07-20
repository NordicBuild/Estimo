import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Add saveProjectsToSupabase inside saveVersion
content = content.replace(
'''          saveVersion={(name) => {
            logEvent('calc_saved', { projectId: activeProjectId, versionName: name });
            setProjects(prev => prev.map(p => {
              if (p.id === activeProjectId) {
                return { 
                  ...p, 
                  versions: [...(p.versions || []), { id: 'v_' + Date.now(), name, timestamp: new Date().toISOString(), byggdelar: [...byggdelar] }],
                  activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action: 'Sparade version', details: `Version "${name}" skapades` }, ...(p.activityLogs || [])]
                };
              }
              return p;
            }));
            showNotification("Version sparad", "success");
          }}''',
'''          saveVersion={(name) => {
            logEvent('calc_saved', { projectId: activeProjectId, versionName: name });
            setProjects(prev => {
              const updated = prev.map(p => {
                if (p.id === activeProjectId) {
                  return { 
                    ...p, 
                    versions: [...(p.versions || []), { id: 'v_' + Date.now(), name, timestamp: new Date().toISOString(), byggdelar: [...byggdelar] }],
                    activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action: 'Sparade version', details: `Version "${name}" skapades` }, ...(p.activityLogs || [])]
                  };
                }
                return p;
              });
              localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
              if (dataSpaceId) saveProjectsToSupabase(updated, dataSpaceId, user?.id || '');
              return updated;
            });
            showNotification("Version sparad", "success");
          }}'''
)

# Add saveProjectsToSupabase inside loadVersion
content = content.replace(
'''          loadVersion={(version) => {
            setByggdelar(version.byggdelar);
            setProjects(prev => prev.map(p => {
              if (p.id === activeProjectId) {
                return {
                  ...p,
                  activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action: 'Laddade version', details: `Återställde till version "${version.name}"` }, ...(p.activityLogs || [])]
                };
              }
              return p;
            }));
            showNotification("Version läst in: " + version.name, "success");
          }}''',
'''          loadVersion={(version) => {
            setByggdelar(version.byggdelar);
            setProjects(prev => {
              const updated = prev.map(p => {
                if (p.id === activeProjectId) {
                  return {
                    ...p,
                    activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action: 'Laddade version', details: `Återställde till version "${version.name}"` }, ...(p.activityLogs || [])]
                  };
                }
                return p;
              });
              localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
              if (dataSpaceId) saveProjectsToSupabase(updated, dataSpaceId, user?.id || '');
              return updated;
            });
            showNotification("Version läst in: " + version.name, "success");
          }}'''
)

# Add saveProjectsToSupabase inside deleteVersion
content = content.replace(
'''          deleteVersion={(vId) => {
            confirmAction("Ta bort version", "Är du säker på att du vill ta bort denna version?", () => {
              setProjects(prev => prev.map(p => {
                if (p.id === activeProjectId) {
                  const vName = p.versions?.find(v => v.id === vId)?.name || 'Okänd';
                  return { 
                    ...p, 
                    versions: p.versions?.filter(v => v.id !== vId),
                    activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action: 'Tog bort version', details: `Version "${vName}" raderades` }, ...(p.activityLogs || [])]
                  };
                }
                return p;
              }));
              showNotification("Version borttagen", "info");
            });
          }}''',
'''          deleteVersion={(vId) => {
            confirmAction("Ta bort version", "Är du säker på att du vill ta bort denna version?", () => {
              setProjects(prev => {
                const updated = prev.map(p => {
                  if (p.id === activeProjectId) {
                    const vName = p.versions?.find(v => v.id === vId)?.name || 'Okänd';
                    return { 
                      ...p, 
                      versions: p.versions?.filter(v => v.id !== vId),
                      activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action: 'Tog bort version', details: `Version "${vName}" raderades` }, ...(p.activityLogs || [])]
                    };
                  }
                  return p;
                });
                localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
                if (dataSpaceId) saveProjectsToSupabase(updated, dataSpaceId, user?.id || '');
                return updated;
              });
              showNotification("Version borttagen", "info");
            });
          }}'''
)

# Add saveProjectsToSupabase inside addActivityLog
content = content.replace(
'''          addActivityLog={(action, details) => {
            setProjects(prev => prev.map(p => {
              if (p.id === activeProjectId) {
                return {
                  ...p,
                  activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action, details }, ...(p.activityLogs || [])]
                };
              }
              return p;
            }));
          }}''',
'''          addActivityLog={(action, details) => {
            setProjects(prev => {
              const updated = prev.map(p => {
                if (p.id === activeProjectId) {
                  return {
                    ...p,
                    activityLogs: [{ id: 'al_' + Date.now(), timestamp: new Date().toISOString(), action, details }, ...(p.activityLogs || [])]
                  };
                }
                return p;
              });
              localStorage.setItem('betong_saved_projects', JSON.stringify(updated));
              if (dataSpaceId) saveProjectsToSupabase(updated, dataSpaceId, user?.id || '');
              return updated;
            });
          }}'''
)


with open("src/App.tsx", "w") as f:
    f.write(content)

