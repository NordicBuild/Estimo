import React, { useMemo, useState, useRef } from 'react';
import { useBIMStore, getVisibleElements } from '../stores/useBIMStore';
import { Search, Box, Layers, Scissors, Filter, ChevronDown, ChevronRight, X, Square, CheckSquare, Upload } from 'lucide-react';

export function BIMLeftPanel() {
  const elements = useBIMStore((state) => state.elements);
  const filters = useBIMStore((state) => state.filters);
  const visibleElements = useMemo(() => getVisibleElements(elements, filters), [elements, filters]);
  const toggleCategory = useBIMStore((state) => state.toggleCategory);
  const toggleStorey = useBIMStore((state) => state.toggleStorey);
  const toggleDiscipline = useBIMStore((state) => state.toggleDiscipline);
  const clearFilters = useBIMStore((state) => state.clearFilters);
  const setSearchText = useBIMStore((state) => state.setSearchText);

  const clipping = useBIMStore((state) => state.clipping);
  const setClipping = useBIMStore((state) => state.setClipping);
  const setClippingEnabled = useBIMStore((state) => state.setClippingEnabled);
  
  const modelName = useBIMStore((state) => state.modelName);
  const setModelName = useBIMStore((state) => state.setModelName);
  const setModelUrl = useBIMStore((state) => state.setModelUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract unique categories, storeys, disciplines
  const categories = useMemo(() => Array.from(new Set(elements.map(e => e.category).filter(Boolean))).sort(), [elements]);
  const storeys = useMemo(() => Array.from(new Set(elements.map(e => e.storey).filter(Boolean))).sort(), [elements]);
  const disciplines = useMemo(() => Array.from(new Set(elements.map(e => e.discipline).filter(Boolean))).sort(), [elements]);

  const [expandedSection, setExpandedSection] = useState<'categories' | 'storeys' | 'disciplines' | null>('categories');

  const handleSliderChange = (axis: 'axisX' | 'axisY' | 'axisZ', idx: 0 | 1, value: number) => {
    const newAxis = [...clipping[axis]] as [number, number];
    newAxis[idx] = value;
    
    // Ensure min <= max
    if (idx === 0 && newAxis[0] > newAxis[1]) newAxis[0] = newAxis[1];
    if (idx === 1 && newAxis[1] < newAxis[0]) newAxis[1] = newAxis[0];

    const args: [[number, number], [number, number], [number, number]] = [
      axis === 'axisX' ? newAxis : clipping.axisX,
      axis === 'axisY' ? newAxis : clipping.axisY,
      axis === 'axisZ' ? newAxis : clipping.axisZ,
    ];
    setClipping(...args);
  };

  const ExpandableSection = ({ title, id, count, children }: { title: string, id: any, count: number, children: React.ReactNode }) => (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-sm text-gray-700 flex items-center gap-2">
          {title} <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{count}</span>
        </span>
        {expandedSection === id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {expandedSection === id && (
        <div className="p-3 pt-0 space-y-2">
          {children}
        </div>
      )}
    </div>
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      setModelName(file.name);
    }
  };

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col shadow-sm">
      
      {/* 1. Model Selector & Stats */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Model</label>
        <select className="w-full bg-white border border-gray-300 rounded-md text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 mb-3" disabled>
          <option value="current">{modelName}</option>
        </select>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-1.5 px-3 mb-3 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" /> Ladda upp GLB/GLTF
        </button>
        <input 
          type="file" 
          accept=".glb,.gltf" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
        
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100 font-medium">{elements.length} elements</span>
          <span className="bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{storeys.length} storeys</span>
          <span className="bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{disciplines.length} disciplines</span>
        </div>
      </div>

      {/* 2. Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search elements... (Type to search)"
            value={filters.searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          />
          {filters.searchText && (
            <button 
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 3. Filters */}
        <div className="p-4 pb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filters
          </span>
          <div className="flex items-center gap-2">
             <span className="text-xs font-medium text-gray-500">
               {visibleElements.length} / {elements.length} visible
             </span>
             {(filters.categories.size > 0 || filters.storeys.size > 0 || filters.disciplines.size > 0) && (
               <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Clear</button>
             )}
          </div>
        </div>

        <div className="border-y border-gray-200">
          {categories.length > 0 && (
            <ExpandableSection title="Categories" id="categories" count={categories.length}>
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                  <div className="text-gray-400 group-hover:text-blue-500 flex-shrink-0" onClick={() => toggleCategory(cat)}>
                    {filters.categories.has(cat) ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4" />}
                  </div>
                  <span className="truncate" onClick={() => toggleCategory(cat)}>{cat}</span>
                </label>
              ))}
            </ExpandableSection>
          )}

          {storeys.length > 0 && (
            <ExpandableSection title="Storeys" id="storeys" count={storeys.length}>
              {storeys.map(storey => (
                <label key={storey} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                  <div className="text-gray-400 group-hover:text-blue-500 flex-shrink-0" onClick={() => toggleStorey(storey)}>
                    {filters.storeys.has(storey) ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4" />}
                  </div>
                  <span className="truncate" onClick={() => toggleStorey(storey)}>{storey}</span>
                </label>
              ))}
            </ExpandableSection>
          )}

          {disciplines.length > 0 && (
            <ExpandableSection title="Disciplines" id="disciplines" count={disciplines.length}>
              {disciplines.map(disc => (
                <label key={disc} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                  <div className="text-gray-400 group-hover:text-blue-500 flex-shrink-0" onClick={() => toggleDiscipline(disc)}>
                    {filters.disciplines.has(disc) ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4" />}
                  </div>
                  <span className="truncate" onClick={() => toggleDiscipline(disc)}>{disc}</span>
                </label>
              ))}
            </ExpandableSection>
          )}
        </div>

        {/* 4. Clipping */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
               <Scissors className="w-3.5 h-3.5" /> Section Box
             </span>
             <label className="flex items-center gap-2 text-sm cursor-pointer">
               <span className="text-gray-600">Enable</span>
               <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={clipping.enabled} onChange={(e) => setClippingEnabled(e.target.checked)} />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </div>
             </label>
          </div>

          <div className={`space-y-4 ${!clipping.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* X Axis */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>X Axis (Red)</span>
                <span>{Math.round(clipping.axisX[0])}% - {Math.round(clipping.axisX[1])}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="100" value={clipping.axisX[0]} onChange={(e) => handleSliderChange('axisX', 0, Number(e.target.value))} className="w-1/2 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <input type="range" min="0" max="100" value={clipping.axisX[1]} onChange={(e) => handleSliderChange('axisX', 1, Number(e.target.value))} className="w-1/2 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>
            
            {/* Y Axis */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Y Axis (Green)</span>
                <span>{Math.round(clipping.axisY[0])}% - {Math.round(clipping.axisY[1])}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="100" value={clipping.axisY[0]} onChange={(e) => handleSliderChange('axisY', 0, Number(e.target.value))} className="w-1/2 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <input type="range" min="0" max="100" value={clipping.axisY[1]} onChange={(e) => handleSliderChange('axisY', 1, Number(e.target.value))} className="w-1/2 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>

            {/* Z Axis */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Z Axis (Blue)</span>
                <span>{Math.round(clipping.axisZ[0])}% - {Math.round(clipping.axisZ[1])}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="100" value={clipping.axisZ[0]} onChange={(e) => handleSliderChange('axisZ', 0, Number(e.target.value))} className="w-1/2 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <input type="range" min="0" max="100" value={clipping.axisZ[1]} onChange={(e) => handleSliderChange('axisZ', 1, Number(e.target.value))} className="w-1/2 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>

            <button 
              onClick={() => setClipping([0, 100], [0, 100], [0, 100])}
              className="w-full mt-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Reset Planes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
