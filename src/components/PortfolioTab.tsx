import React from 'react';

export function PortfolioTab() {
  return (
    <div className="flex-1 p-8 bg-surface overflow-auto">
      <h1 className="text-2xl font-bold mb-6 text-on-surface">Portfolio</h1>
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 shadow-sm text-center">
        <span className="material-symbols-outlined text-6xl text-primary/50 mb-4">cases</span>
        <h2 className="text-xl font-bold mb-2">Din Portfolio</h2>
        <p className="text-on-surface-variant max-w-md mx-auto">
          Här samlas en översikt av alla dina pågående och avslutade projekt, med nyckeltal och analyser över tid.
        </p>
        <button className="mt-6 px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors">
          Skapa Ny Rapport
        </button>
      </div>
    </div>
  );
}
