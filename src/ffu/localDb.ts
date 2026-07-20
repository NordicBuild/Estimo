export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FFUDocuments', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveDocument = async (doc: any) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    store.put(doc);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const getDocuments = async (projectId: string): Promise<any[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const store = tx.objectStore('documents');
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result || [];
      resolve(all.filter(d => d.project_id === projectId));
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveFile = async (id: string, file: File) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    store.put({ id, file });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const getFile = async (id: string): Promise<File | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ? request.result.file : null);
    request.onerror = () => reject(request.error);
  });
};

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
