import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

# 1. Add searchTerm state
content = content.replace(
    'const [newFolderName, setNewFolderName] = useState("");',
    'const [newFolderName, setNewFolderName] = useState("");\n  const [searchTerm, setSearchTerm] = useState("");'
)

# 2. Modify itemsInCurrentPath
old_memo = """  const itemsInCurrentPath = useMemo(() => {
   const items: any[] = [];
   const folderSet = new Set<string>();

   documents.forEach(doc => {
       if (!doc.file_path) return;
       const relPath = doc.file_path.replace(`${projectId}/`, '');
       if (relPath.startsWith(currentPath)) {
           const remainder = relPath.substring(currentPath.length);
           const slashIndex = remainder.indexOf('/');
           if (slashIndex === -1) {
               if (remainder !== '.keep') {
                  items.push({ type: 'file', ...doc });
               }
           } else {
               const folderName = remainder.substring(0, slashIndex);
               if (!folderSet.has(folderName)) {
                   folderSet.add(folderName);
                   items.push({ type: 'folder', name: folderName, path: currentPath + folderName + '/', id: `folder_${folderName}` });
               }
           }
       }
   });
   
   items.sort((a, b) => {
       if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
       const nameA = a.type === 'folder' ? a.name : a.filename;
       const nameB = b.type === 'folder' ? b.name : b.filename;
       return nameA.localeCompare(nameB);
   });
   
   return items;
  }, [documents, currentPath, projectId]);"""

new_memo = """  const itemsInCurrentPath = useMemo(() => {
   const items: any[] = [];
   const folderSet = new Set<string>();

   documents.forEach(doc => {
       if (!doc.file_path) return;
       const relPath = doc.file_path.replace(`${projectId}/`, '');
       
       if (searchTerm) {
           if (doc.filename !== '.keep' && doc.filename.toLowerCase().includes(searchTerm.toLowerCase())) {
               items.push({ type: 'file', ...doc });
           }
       } else if (relPath.startsWith(currentPath)) {
           const remainder = relPath.substring(currentPath.length);
           const slashIndex = remainder.indexOf('/');
           if (slashIndex === -1) {
               if (remainder !== '.keep') {
                  items.push({ type: 'file', ...doc });
               }
           } else {
               const folderName = remainder.substring(0, slashIndex);
               if (!folderSet.has(folderName)) {
                   folderSet.add(folderName);
                   items.push({ type: 'folder', name: folderName, path: currentPath + folderName + '/', id: `folder_${folderName}` });
               }
           }
       }
   });
   
   items.sort((a, b) => {
       if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
       const nameA = a.type === 'folder' ? a.name : a.filename;
       const nameB = b.type === 'folder' ? b.name : b.filename;
       return nameA.localeCompare(nameB);
   });
   
   return items;
  }, [documents, currentPath, projectId, searchTerm]);"""

content = content.replace(old_memo, new_memo)

# 3. Add search input UI below header or in the flex wrap gap
old_header_controls = """        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsNewFolderOpen(true)} variant="ghost" className="flex items-center gap-2">
            <i className="fa-solid fa-folder-plus"></i> Ny mapp
          </Button>"""

new_header_controls = """        <div className="flex flex-wrap items-center gap-2">
          <div className="relative mr-2">
             <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
             <input 
               type="text" 
               placeholder="Sök dokument..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-48"
             />
          </div>
          <Button onClick={() => setIsNewFolderOpen(true)} variant="ghost" className="flex items-center gap-2">
            <i className="fa-solid fa-folder-plus"></i> Ny mapp
          </Button>"""

content = content.replace(old_header_controls, new_header_controls)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
