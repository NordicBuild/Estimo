const DB_NAME = 'IFC_App_Storage';
const STORE_NAME = 'ifc_files';
const DB_VERSION = 1;

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveIfcFile(projectId: string, file: File) {
  const db = await getDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file, projectId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getIfcFile(projectId: string): Promise<File | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(projectId);
    
    request.onsuccess = () => {
      if (request.result instanceof File) {
         resolve(request.result);
      } else {
         resolve(undefined);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteIfcFile(projectId: string) {
  const db = await getDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(projectId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
