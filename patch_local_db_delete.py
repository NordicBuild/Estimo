with open("src/ffu/localDb.ts", "r") as f:
    content = f.read()

new_funcs = """
export const deleteDocument = async (id: string) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    store.delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteFile = async (id: string) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    store.delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};
"""

content += new_funcs

with open("src/ffu/localDb.ts", "w") as f:
    f.write(content)
