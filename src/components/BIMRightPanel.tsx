import React, { useMemo, useState } from 'react';
import { useBIMStore, getVisibleElements } from '../stores/useBIMStore';
import { Info, BarChart2, Camera, Plus, Trash2, Download, ListChecks, CheckCircle, Save, Layers } from 'lucide-react';
import { BIMAddToBOQModal } from './BIMAddToBOQModal';

export function BIMRightPanel({ addParts }: { addParts?: (parts: any[]) => void }) {
  const [activeTab, setActiveTab] = useState<'info' | 'summary' | 'snapshots'>('info');
  const [isBOQModalOpen, setIsBOQModalOpen] = useState(false);

  
  const elements = useBIMStore((state) => state.elements);
  const filters = useBIMStore((state) => state.filters);
  const visibleElements = useMemo(() => getVisibleElements(elements, filters), [elements, filters]);
  const selectedElementIds = useBIMStore((state) => state.selectedElementIds);
  const snapshots = useBIMStore((state) => state.snapshots);
  const saveSnapshot = useBIMStore((state) => state.saveSnapshot);
  const loadSnapshot = useBIMStore((state) => state.loadSnapshot);
  const deleteSnapshot = useBIMStore((state) => state.deleteSnapshot);
  const cameraState = useBIMStore((state) => state.clipping); // Using clipping as a placeholder for camera

  const [newSnapshotName, setNewSnapshotName] = useState('');

  const selectedElements = useMemo(() => {
    return elements.filter(el => selectedElementIds.has(el.id || el.guid));
  }, [elements, selectedElementIds]);

  const primaryElement = selectedElements[0];

  const handleSaveSnapshot = () => {
    if (!newSnapshotName.trim()) return;
    saveSnapshot({
      name: newSnapshotName,
      camera_state: cameraState, // In a real app, you'd pull the exact camera matrix/position
      visibility_state: {}, // Placeholder
      selection_state: Array.from(selectedElementIds)
    });
    setNewSnapshotName('');
  };

  const handleExportJson = () => {
    const data = JSON.stringify(visibleElements, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bim_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const SummaryTab = () => {
    const summary = useMemo(() => {
      const byCategory: Record<string, number> = {};
      const byStorey: Record<string, number> = {};
      const byDiscipline: Record<string, number> = {};

      visibleElements.forEach(el => {
        const cat = el.category || 'Unknown';
        const st = el.storey || 'Unknown';
        const disc = el.discipline || 'Unknown';

        byCategory[cat] = (byCategory[cat] || 0) + 1;
        byStorey[st] = (byStorey[st] || 0) + 1;
        byDiscipline[disc] = (byDiscipline[disc] || 0) + 1;
      });

      return {
        byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
        byStorey: Object.entries(byStorey).sort((a, b) => b[1] - a[1]),
        byDiscipline: Object.entries(byDiscipline).sort((a, b) => b[1] - a[1]),
      };
    }, [visibleElements]);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

    const Section = ({ title, data }: { title: string, data: [string, number][] }) => (
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h4>
        <div className="space-y-1">
          {data.map(([key, count]) => (
            <div key={key} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
              <span className="text-gray-700 truncate pr-4">{key}</span>
              <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">{formatNumber(count)}</span>
            </div>
          ))}
          {data.length === 0 && <div className="text-sm text-gray-400 italic">No data</div>}
        </div>
      </div>
    );

    return (
      <div className="p-4 overflow-y-auto flex-1">
        <Section title="By Category" data={summary.byCategory} />
        <Section title="By Storey" data={summary.byStorey} />
        <Section title="By Discipline" data={summary.byDiscipline} />
      </div>
    );
  };

  const ElementInfoTab = () => {
    if (selectedElements.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
          <Info className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-sm">Select an element in the 3D viewer to see its properties here.</p>
        </div>
      );
    }

    if (selectedElements.length > 1) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
          <ListChecks className="w-12 h-12 mb-3 text-gray-300" />
          <h3 className="font-medium text-gray-800 mb-1">{selectedElements.length} Elements Selected</h3>
          <p className="text-sm">Clear selection or pick a single element to view detailed properties.</p>
          <div className="mt-4 flex gap-2 w-full max-w-xs flex-col">
            <button 
              onClick={() => setIsBOQModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Selection to BOQ
            </button>
          </div>
        </div>
      );
    }

    const properties = primaryElement.properties || {};

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h3 className="font-semibold text-gray-800 text-base mb-1 truncate">{primaryElement.name}</h3>
          <div className="flex items-center gap-2 text-xs mb-3">
             <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">{primaryElement.category}</span>
             <span className="text-gray-500 font-mono truncate" title={primaryElement.guid}>{primaryElement.guid}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Layers className="w-4 h-4 text-gray-400" />
            <span>Hosted on: <span className="font-medium text-gray-800">{primaryElement.storey || 'Unknown'}</span></span>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Properties</h4>
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 font-medium w-1/2">Name</th>
                  <th className="px-3 py-2 font-medium w-1/2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(properties).map(([key, value]) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600 font-medium truncate max-w-[120px]" title={key}>{key}</td>
                    <td className="px-3 py-2 text-gray-800 truncate max-w-[120px]" title={String(value)}>{String(value)}</td>
                  </tr>
                ))}
                {Object.keys(properties).length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-gray-400 italic">No properties available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-2 flex-shrink-0">
          <button 
            onClick={() => setIsBOQModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add to BOQ
          </button>
          <button className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors">
            <CheckCircle className="w-4 h-4" /> Create Task
          </button>
        </div>
      </div>
    );
  };

  const SnapshotsTab = () => {
    return (
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="mb-6 flex-shrink-0">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Save Current View</h4>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. Section 3.1" 
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()}
              className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button 
              onClick={handleSaveSnapshot}
              disabled={!newSnapshotName.trim()}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex-shrink-0">Saved Snapshots</h4>
        
        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {snapshots.map(snapshot => (
            <div key={snapshot.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-gray-800 truncate">{snapshot.name}</p>
                <p className="text-xs text-gray-500">{new Date(snapshot.created_at || '').toLocaleDateString()} • {snapshot.selection_state.length} selected</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => loadSnapshot(snapshot.id)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" 
                  title="Load View"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteSnapshot(snapshot.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete Snapshot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {snapshots.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400 italic border-2 border-dashed border-gray-100 rounded-lg">
              No snapshots saved yet.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col shadow-sm">
      
      {/* Tabs */}
      <div className="flex items-center p-2 gap-1 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-1.5 px-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeTab === 'info' ? 'bg-white shadow-sm text-blue-600 border border-gray-200/60' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          <Info className="w-4 h-4" /> Info
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-1.5 px-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeTab === 'summary' ? 'bg-white shadow-sm text-blue-600 border border-gray-200/60' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          <BarChart2 className="w-4 h-4" /> Summary
        </button>
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`flex-1 py-1.5 px-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeTab === 'snapshots' ? 'bg-white shadow-sm text-blue-600 border border-gray-200/60' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          <Camera className="w-4 h-4" /> Views
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && <ElementInfoTab />}
      {activeTab === 'summary' && <SummaryTab />}
      {activeTab === 'snapshots' && <SnapshotsTab />}

      {/* Global Quick Actions (Visible across tabs depending on design, placing at bottom of summary/snapshots just in case, but prompt says "all tabs visible") */}
      {activeTab !== 'info' && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2 flex-shrink-0">
          <button 
            onClick={handleExportJson}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>
        </div>
      )}

      <BIMAddToBOQModal 
        isOpen={isBOQModalOpen} 
        selectedElements={selectedElements} 
        onConfirm={(byggdelar) => {
          if (addParts) addParts(byggdelar);
          setIsBOQModalOpen(false);
        }} 
        onCancel={() => setIsBOQModalOpen(false)} 
      />
    </div>
  );
}
