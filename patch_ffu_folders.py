import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

# Add checkboxes to folders in desktop view
old_folder_tr = """                if (item.type === 'folder') {
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setCurrentPath(item.path)}>
                      <td className="p-3 text-center"></td>
                      <td className="p-3" colSpan={5}>
                        <div className="flex items-center gap-2 font-medium">
                          <i className="fa-solid fa-folder text-blue-500"></i>
                          {item.name}
                        </div>
                      </td>
                    </tr>
                  );
                }"""

new_folder_tr = """                if (item.type === 'folder') {
                  return (
                    <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`} onClick={() => setCurrentPath(item.path)}>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="p-3" colSpan={5}>
                        <div className="flex items-center gap-2 font-medium">
                          <i className="fa-solid fa-folder text-blue-500"></i>
                          {item.name}
                        </div>
                      </td>
                    </tr>
                  );
                }"""
content = content.replace(old_folder_tr, new_folder_tr)

# Add checkboxes to folders in mobile view
old_folder_div = """              if (item.type === 'folder') {
                return (
                  <div key={item.id} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50" onClick={() => setCurrentPath(item.path)}>
                    <i className="fa-solid fa-folder text-blue-500"></i>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                );
              }"""

new_folder_div = """              if (item.type === 'folder') {
                return (
                  <div key={item.id} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`} onClick={() => setCurrentPath(item.path)}>
                    <div onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                    <i className="fa-solid fa-folder text-blue-500"></i>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                );
              }"""
content = content.replace(old_folder_div, new_folder_div)

# Change Select All checkbox to include folders
old_select_all = """                  checked={itemsInCurrentPath.filter(i => i.type === 'file').length > 0 && selectedIds.length === itemsInCurrentPath.filter(i => i.type === 'file').length}"""
new_select_all = """                  checked={itemsInCurrentPath.length > 0 && itemsInCurrentPath.every(i => selectedIds.includes(i.id))}"""
content = content.replace(old_select_all, new_select_all)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
