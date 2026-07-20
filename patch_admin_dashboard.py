import re

with open("src/components/Ffu/AdminDashboard.tsx", "r") as f:
    content = f.read()

old_collab_html = """              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                 <h3 className="text-lg font-bold text-on-surface mb-4">Toppmedarbetare</h3>
                 <div className="text-sm text-on-surface-variant py-4 text-center">
                    Data samlas in...
                 </div>
              </div>"""

new_collab_html = """              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                 <h3 className="text-lg font-bold text-on-surface mb-4">Toppmedarbetare (Flest kommentarer)</h3>
                 {collabData.topCommenters?.length > 0 ? (
                   <div className="space-y-3">
                     {collabData.topCommenters.map((user: any, idx: number) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/50">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                             {user.name.charAt(0)}
                           </div>
                           <span className="font-medium text-on-surface">{user.name}</span>
                         </div>
                         <div className="text-sm font-bold text-on-surface-variant">
                           {user.count} <span className="text-xs font-normal">inlägg</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-sm text-on-surface-variant py-4 text-center">
                      Ingen data ännu.
                   </div>
                 )}
              </div>"""

content = content.replace(old_collab_html, new_collab_html)

content = content.replace(
    "4.2 <span className=\"text-xl text-on-surface-variant font-medium\">timmar</span>",
    "{collabData.avgApprovalTime.toFixed(1)} <span className=\"text-xl text-on-surface-variant font-medium\">timmar</span>"
)

with open("src/components/Ffu/AdminDashboard.tsx", "w") as f:
    f.write(content)
