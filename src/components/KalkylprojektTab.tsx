import React from 'react';

export function KalkylprojektTab() {
  return (
    <div className="flex-1 p-8 bg-surface overflow-auto">
      <h1 className="text-2xl font-bold mb-6 text-on-surface">Kalkylprojekt</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">folder_open</span>
              <span className="text-xs font-semibold bg-primary-container text-on-primary-container px-2 py-1 rounded-full">Aktiv</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Projekt {i}</h3>
            <p className="text-sm text-on-surface-variant mb-4">Beskrivning av kalkylprojekt {i}.</p>
            <div className="text-xs text-on-surface-variant border-t border-outline-variant pt-4 flex justify-between">
              <span>Senast ändrad: Idag</span>
              <span className="font-semibold text-primary">Öppna &rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
