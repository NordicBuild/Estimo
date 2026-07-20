import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const { isOnline, pendingUploads, setPendingUploads } = useOnlineStatus();


  const handleRetry = () => {
    // In a real app, this would trigger background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        // @ts-ignore
        registration.sync.register('sync-uploads');
      });
    } else {
      alert('Bakgrundssynk stöds inte av denna webbläsare, försöker synka manuellt...');
      setPendingUploads(0); // Mock clear
    }
  };

  if (isOnline) {
    if (pendingUploads > 0) {
      return (
        <div className="fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-3 rounded-xl shadow-lg text-sm flex flex-col gap-2 z-50">
          <div className="flex items-center gap-2 font-medium">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Synkar {pendingUploads} uppladdningar...
          </div>
          <button onClick={handleRetry} className="bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-3 py-1.5 rounded-md text-xs transition-colors font-medium self-end">
            Försök igen
          </button>
        </div>
      );
    }
    return null;
  }


  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 z-50">
      <i className="fa-solid fa-wifi-slash"></i>
      Du är offline (Lokalt läge)
    </div>
  );
}
