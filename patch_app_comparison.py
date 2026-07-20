import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Add imports
content = content.replace('import { useCalculation } from "./useCalculation";', 'import { useCalculation, computeCalculation } from "./useCalculation";\nimport { SnapshotComparison } from "./components/SnapshotComparison";')

# Add states inside App component
states_code = """
  const [snapshots, setSnapshots] = useState<ProjectVersion[]>(() => {
"""

new_states_code = """
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<ProjectVersion[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const [snapshots, setSnapshots] = useState<ProjectVersion[]>(() => {
"""

content = content.replace(states_code, new_states_code)

# Add virtual "Current State" snapshot generator
virtual_snap_code = """
  const handleCompare = () => {
    if (selectedForCompare.length === 2) {
      setShowComparison(true);
    } else {
      alert("Välj exakt två versioner att jämföra.");
    }
  };

  const toggleCompareSelection = (snap: ProjectVersion) => {
    if (selectedForCompare.find(s => s.id === snap.id)) {
      setSelectedForCompare(selectedForCompare.filter(s => s.id !== snap.id));
    } else {
      if (selectedForCompare.length < 2) {
        setSelectedForCompare([...selectedForCompare, snap]);
      } else {
        // Ersätt den äldsta valda
        setSelectedForCompare([selectedForCompare[1], snap]);
      }
    }
  };

  const virtualCurrentSnapshot: ProjectVersion = {
    id: 'current_state',
    name: 'Nuvarande Kalkyl (Osparad)',
    timestamp: new Date().toISOString(),
    byggdelar: byggdelar
  };
  
  const allSnapshots = [virtualCurrentSnapshot, ...snapshots];
"""

# Find where to put it
content = content.replace("  const saveSnapshot = () => {", virtual_snap_code + "\n  const saveSnapshot = () => {")

# Update the modal UI
old_modal_content = """
            <div className="p-4 overflow-y-auto flex-1">
              {snapshots.length === 0 ? (
                <div className="text-center p-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2">history</span>
                  <p>Inga ögonblicksbilder sparade ännu.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {snapshots.map(snap => (
                    <div key={snap.id} className="flex justify-between items-center p-4 border border-outline-variant rounded-lg bg-surface hover:bg-surface-container-lowest transition-colors shadow-sm">
                      <div>
                        <h4 className="font-bold text-on-surface">{snap.name}</h4>
                        <p className="text-xs text-on-surface-variant mt-1">Sparad: {new Date(snap.timestamp).toLocaleString('sv-SE')}</p>
                        <p className="text-xs text-on-surface-variant">Innehåller {snap.byggdelar?.length || 0} byggdelar.</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => restoreSnapshot(snap)}
                          className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-bold transition-colors flex items-center gap-1"
                          title="Återställ till denna version"
                        >
                          <span className="material-symbols-outlined text-[16px]">restore</span>
                          Återställ
                        </button>
                        <button 
                          onClick={() => deleteSnapshot(snap.id)}
                          className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 rounded-md text-xs font-bold transition-colors flex items-center gap-1"
                          title="Radera"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
"""

new_modal_content = """
            <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-on-surface">
                <input 
                  type="checkbox" 
                  checked={compareMode}
                  onChange={(e) => {
                    setCompareMode(e.target.checked);
                    if (!e.target.checked) setSelectedForCompare([]);
                  }}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                Jämförläge
              </label>
              {compareMode && (
                <button
                  onClick={handleCompare}
                  disabled={selectedForCompare.length !== 2}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2 ${
                    selectedForCompare.length === 2 
                      ? 'bg-primary text-on-primary hover:opacity-90 shadow-sm' 
                      : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
                  Jämför valda ({selectedForCompare.length}/2)
                </button>
              )}
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {allSnapshots.length === 1 ? (
                <div className="text-center p-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2">history</span>
                  <p>Inga ögonblicksbilder sparade ännu.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {allSnapshots.map((snap, idx) => {
                    const isSelected = selectedForCompare.some(s => s.id === snap.id);
                    const isCurrent = snap.id === 'current_state';
                    return (
                      <div 
                        key={snap.id} 
                        className={`flex justify-between items-center p-4 border rounded-lg transition-colors shadow-sm ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface hover:bg-surface-container-lowest'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {compareMode && (
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleCompareSelection(snap)}
                              className="rounded-full text-primary focus:ring-primary w-5 h-5 mr-2"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-on-surface">{snap.name}</h4>
                              {isCurrent && <span className="bg-tertiary/20 text-tertiary text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Aktiv</span>}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1">
                              {isCurrent ? 'Senaste osparade ändringar' : `Sparad: ${new Date(snap.timestamp).toLocaleString('sv-SE')}`}
                            </p>
                            <p className="text-xs text-on-surface-variant">Innehåller {snap.byggdelar?.length || 0} byggdelar.</p>
                          </div>
                        </div>
                        {!compareMode && (
                          <div className="flex gap-2">
                            {!isCurrent && (
                              <>
                                <button 
                                  onClick={() => restoreSnapshot(snap)}
                                  className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-bold transition-colors flex items-center gap-1"
                                  title="Återställ till denna version"
                                >
                                  <span className="material-symbols-outlined text-[16px]">restore</span>
                                  Återställ
                                </button>
                                <button 
                                  onClick={() => deleteSnapshot(snap.id)}
                                  className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 rounded-md text-xs font-bold transition-colors flex items-center gap-1"
                                  title="Radera"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
"""

content = content.replace(old_modal_content, new_modal_content)

# Add Comparison Component rendering
comparison_modal_code = """
      {showComparison && selectedForCompare.length === 2 && (
        <SnapshotComparison 
          snapA={selectedForCompare[0]} 
          snapB={selectedForCompare[1]} 
          materials={materials} 
          settings={settings} 
          companyTidsfaktorer={companyTidsfaktorer} 
          onClose={() => setShowComparison(false)} 
        />
      )}
"""

content = content.replace("    </AuthProvider>", comparison_modal_code + "\n    </AuthProvider>")

with open("src/App.tsx", "w") as f:
    f.write(content)
