import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

old_memo = """  const itemsInCurrentPath = useMemo(() => {
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
           
           const parts = relPath.split('/');
           parts.pop(); // remove filename
           let currentFolderPath = '';
           for (const part of parts) {
               const folderName = part;
               currentFolderPath += folderName + '/';
               if (folderName.toLowerCase().includes(searchTerm.toLowerCase())) {
                   if (!folderSet.has(currentFolderPath)) {
                       folderSet.add(currentFolderPath);
                       items.push({ type: 'folder', name: folderName, path: currentFolderPath, id: `folder_${currentFolderPath}` });
                   }
               }
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

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
