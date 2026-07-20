import React from 'react';

export function AktivitetsloggTab() {
  return (
    <div className="flex-1 p-8 bg-surface overflow-auto">
      <h1 className="text-2xl font-bold mb-6 text-on-surface">Aktivitetslogg</h1>
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-sm">
        <p className="text-on-surface-variant">Här visas historik och händelser i projektet.</p>
        
        <div className="mt-6 space-y-4">
          <div className="flex gap-4 p-4 rounded-lg bg-surface-container border border-outline-variant/50">
            <span className="material-symbols-outlined text-primary">edit</span>
            <div>
              <p className="font-semibold text-sm">Projekt uppdaterat</p>
              <p className="text-xs text-on-surface-variant">Idag kl 10:30 av Användare</p>
            </div>
          </div>
          <div className="flex gap-4 p-4 rounded-lg bg-surface-container border border-outline-variant/50">
            <span className="material-symbols-outlined text-primary">note_add</span>
            <div>
              <p className="font-semibold text-sm">Nytt dokument uppladdat</p>
              <p className="text-xs text-on-surface-variant">Igår kl 14:15 av Användare</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
