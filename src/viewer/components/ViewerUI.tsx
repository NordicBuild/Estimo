import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { IFCVManager } from '../IFCVManager';
import { MeasurementData } from '../utils/MeasurementTool';
import { AreaVolumeData } from '../utils/AreaVolumeTool';
import { Byggdel } from '../../data';
import { InspectorPortal } from '../../ui';
import { calculateDefaultMoments } from '../../calculationHelpers';

interface ViewerUIProps {
  file: File;
  onSelect?: (elementInfo: any) => void;
  onTakeoff?: (takeoffData: any) => void;
  addParts?: (parts: Omit<Byggdel, 'id'>[]) => void;
}

export function ViewerUI({ file, onSelect, onTakeoff, addParts }: ViewerUIProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<IFCVManager | null>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any>(null);
  const [fps, setFps] = useState(0);
  const [categories, setCategories] = useState<{ [key: string]: boolean }>({});
  const [elementsByCategory, setElementsByCategory] = useState<Record<string, any[]>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [selectedElementID, setSelectedElementID] = useState<number | null>(null);
  const [isolatedObject, setIsolatedObject] = useState<number | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureMode, setMeasureMode] = useState<'distance' | 'area' | 'volume' | 'angle'>('distance');
  const [isAreaVolMeasuring, setIsAreaVolMeasuring] = useState(false);
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [areaMeasurements, setAreaMeasurements] = useState<AreaVolumeData[]>([]);

  const [measurementGroups, setMeasurementGroups] = useState([
    { id: "default", name: "Standard (Alla mängder)", color: "#ef4444", visible: true },
    { id: "vvs", name: "VVS", color: "#3b82f6", visible: true },
    { id: "el", name: "Elinstallation", color: "#eab308", visible: true },
    { id: "konstruktion", name: "Konstruktion", color: "#22c55e", visible: true },
  ]);
  const [activeGroupId, setActiveGroupId] = useState<string>("default");
  const [activeRightTab, setActiveRightTab] = useState<'properties' | 'measurements'>('properties');

  useEffect(() => {
     if (properties && activeRightTab !== 'properties') {
         setActiveRightTab('properties');
     } else if (!properties && measurements.length > 0 && activeRightTab !== 'measurements') {
         setActiveRightTab('measurements');
     }
  }, [properties, measurements.length]);
  
  const labelsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const areaLabelsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const measurementsRef = useRef<MeasurementData[]>([]);
  const areaMeasurementsRef = useRef<AreaVolumeData[]>([]);

  useEffect(() => {
     measurementsRef.current = measurements;
  }, [measurements]);

  useEffect(() => {
     areaMeasurementsRef.current = areaMeasurements;
  }, [areaMeasurements]);

  useEffect(() => {
     if (managerRef.current) {
        managerRef.current.measureTool.activeGroupId = activeGroupId;
        managerRef.current.measureTool.activeColor = measurementGroups.find(g => g.id === activeGroupId)?.color || '#ef4444';
     }
  }, [activeGroupId, measurementGroups]);

  const handleSmartTakeoff = async () => {
      if (managerRef.current && properties?.expressID !== undefined) {
          const { extractQuantityInfo } = await import('../utils/QuantityTakeoff');
          const takeoffResults = await extractQuantityInfo(managerRef.current, properties.expressID);
          if (takeoffResults && takeoffResults.length > 0 && onTakeoff) {
              onTakeoff(takeoffResults);
          } else {
              alert('Kunde inte identifiera tillräckligt med data eller så fanns inga matchande element.');
          }
      }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const manager = new IFCVManager(containerRef.current);
    managerRef.current = manager;

    // ... manager setup ...

    manager.measureTool.onMeasurementsUpdated = (data) => {
        setMeasurements(data);
    };

    manager.areaVolumeTool.onMeasurementsUpdated = (data) => {
        setAreaMeasurements(data);
    };

    manager.onSelect = async (expressIDs: number[]) => {
        if (expressIDs.length > 0) {
            // Display properties for the last selected item
            const lastExpressID = expressIDs[expressIDs.length - 1];
            setSelectedElementID(lastExpressID);
            const props = manager.loader.getProperties(lastExpressID);
            const psets = await manager.loader.getPropertySets(lastExpressID);
            
            const info = {
                expressID: lastExpressID,
                name: props?.Name?.value || props?.ObjectType?.value || 'Unknown',
                type: props?.type,
                properties: props,
                psets
            };
            setProperties(info);
            
            if (onSelect) {
               onSelect({ [manager.loader['currentModelID'] || 0]: expressIDs });
            }
        } else {
            setSelectedElementID(null);
            setProperties(null);
            if (onSelect) {
               onSelect({});
            }
        }
    };

    const load = async () => {
       setLoading(true);
       try {
           await manager.loadFile(file);
           
           // Gather categories and elements
           const cats: { [key: string]: boolean } = {};
           const elByCat: Record<string, any[]> = {};

           for (const [id, el] of manager.loader.elements.entries()) {
               if (el.typeName && el.typeName !== 'Unknown') {
                   cats[el.typeName] = true;
                   if (!elByCat[el.typeName]) elByCat[el.typeName] = [];
                   elByCat[el.typeName].push({ expressID: el.expressID, name: el.name });
               }
           }
           
           // Sort elements inside each category alphabetically
           for (const key in elByCat) {
               elByCat[key].sort((a, b) => a.name.localeCompare(b.name));
           }

           setCategories(cats);
           setElementsByCategory(elByCat);
       } catch (err) {
           console.error("Error loading IFC file in custom viewer", err);
       } finally {
           setLoading(false);
       }
    };

    load();

    // FPS Counter basic implementation
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const updateFPS = () => {
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
            setFps(Math.round((frameCount * 1000) / (now - lastTime)));
            frameCount = 0;
            lastTime = now;
        }
        animId = requestAnimationFrame(updateFPS);
        
        // Update measurement labels projection
        if (managerRef.current && containerRef.current) {
            const camera = managerRef.current.core.camera;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            measurementsRef.current.forEach(m => {
                const el = labelsRef.current[m.id];
                if (el) {
                    const vector = m.midPoint.clone();
                    vector.project(camera);
                    if (vector.z > 1) {
                        el.style.display = 'none';
                        return;
                    }
                    el.style.display = 'block';
                    const x = (vector.x * 0.5 + 0.5) * width;
                    const y = (vector.y * -0.5 + 0.5) * height;
                    el.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                }
            });

            areaMeasurementsRef.current.forEach(m => {
                const el = areaLabelsRef.current[m.id];
                if (el) {
                    const vector = m.position.clone();
                    vector.project(camera);
                    if (vector.z > 1) {
                        el.style.display = 'none';
                        return;
                    }
                    el.style.display = 'block';
                    const x = (vector.x * 0.5 + 0.5) * width;
                    const y = (vector.y * -0.5 + 0.5) * height;
                    el.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                }
            });
        }
    };
    updateFPS();

    return () => {
       cancelAnimationFrame(animId);
       manager.dispose();
       managerRef.current = null;
    };
  }, [file]);

    const toggleCategory = (typeName: string) => {
        const newState = !categories[typeName];
        setCategories(prev => ({ ...prev, [typeName]: newState }));
        
        if (managerRef.current && isolatedObject === null) {
            for (const [id, el] of managerRef.current.loader.elements.entries()) {
                if (el.typeName === typeName && el.mesh) {
                    el.mesh.visible = newState;
                }
            }
        }
    };

    const toggleIsolate = () => {
       if (!managerRef.current || !properties) return;
       const manager = managerRef.current;
       const targetId = properties.expressID;

       if (isolatedObject === targetId) {
          // Unisolate
          setIsolatedObject(null);
          for (const [id, el] of manager.loader.elements.entries()) {
             if (el.mesh && el.typeName) {
                el.mesh.visible = categories[el.typeName] !== false;
             }
          }
       } else {
          // Isolate
          setIsolatedObject(targetId);
          for (const [id, el] of manager.loader.elements.entries()) {
             if (el.mesh) {
                el.mesh.visible = (id === targetId);
             }
          }
          const selectedGroup = manager.loader.elements.get(targetId)?.mesh;
          const box = new THREE.Box3().setFromObject(selectedGroup || manager.loader.modelGroup);
          if (!box.isEmpty()) manager.core.fitToModel(box);
       }
    };

    const toggleCategoryExpand = (e: React.MouseEvent, typeName: string) => {
        e.stopPropagation();
        setExpandedCats(prev => ({ ...prev, [typeName]: !prev[typeName] }));
    };

    const handleElementClick = (expressID: number) => {
        if (!managerRef.current) return;
        managerRef.current.selectElementByExpressID(expressID, false);
        const group = managerRef.current.loader.elements.get(expressID)?.mesh;
        if (group) {
            const box = new THREE.Box3().setFromObject(group);
            if (!box.isEmpty()) managerRef.current.core.fitToModel(box);
        }
    };

    const toggleMeasuring = (mode: 'distance' | 'area' | 'volume' | 'angle') => {
        if (!managerRef.current) return;
        
        if (isMeasuring && measureMode === mode) {
            setIsMeasuring(false);
            managerRef.current.measureTool.toggleMeasuring(false);
        } else {
            setIsMeasuring(true);
            setMeasureMode(mode);
            setIsAreaVolMeasuring(false);
            managerRef.current.areaVolumeTool.toggleMeasuring(false);
            managerRef.current.measureTool.toggleMeasuring(true, mode);
        }
    };

    const toggleAreaVolMeasuring = () => {
        if (!managerRef.current) return;
        const active = !isAreaVolMeasuring;
        setIsAreaVolMeasuring(active);
        if (active) {
           setIsMeasuring(false);
           managerRef.current.measureTool.toggleMeasuring(false);
        }
        managerRef.current.areaVolumeTool.toggleMeasuring(active);
    };

    const clearMeasurements = () => {
        if (!managerRef.current) return;
        managerRef.current.measureTool.clearAll();
        managerRef.current.areaVolumeTool.clearAll();
    };

    const handleSendVolumeToCalc = (m: MeasurementData) => {
        if (!addParts || !m.volume || !m.area) return;
        const depth = m.volume / m.area;
        const type = '27.1_PlattaMark'; // Uses area as Q and depth as H
        const dims = { 
            length: Math.sqrt(m.area),
            width: Math.sqrt(m.area),
            area: m.area, 
            height: depth, 
            perimeter: m.perimeter, 
            volume: m.volume,
            qty: m.area // for 27.1_PlattaMark, quantity (Q) represents area
        };
        const part: Omit<Byggdel, 'id'> = {
            name: `Uppmätt Volym (${m.volume.toFixed(1)} m³)`,
            type: type,
            qty: m.area,
            antal: 1,
            unit: "m3",
            comment: `BIM Mätning (Djup: ${depth.toFixed(2)}m)`,
            dimensions: dims,
            moments: calculateDefaultMoments(type, dims),
            active: true
        };
        addParts([part]);
        alert("Skickades till kalkylen!");
    };

  return (
    <div className="relative w-full h-full flex overflow-hidden">
        {Object.keys(categories).length > 0 && (
            <div className="w-64 h-full bg-[#222] border-r border-[#333] text-white flex flex-col shrink-0">
                <div className="p-4 border-b border-[#333] bg-[#2a2a2a] sticky top-0 z-10 shrink-0">
                    <h3 className="font-bold text-sm">Kategorier</h3>
                </div>
                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                    {Object.entries(categories).sort().map(([cat, isVisible]) => (
                        <div key={cat} className="mb-1">
                            <div className="flex items-center gap-2 group cursor-pointer hover:bg-[#333] p-1.5 rounded" onClick={(e) => toggleCategoryExpand(e, cat)}>
                                <button className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-300">
                                    <i className={`fa-solid fa-chevron-${expandedCats[cat] ? 'down' : 'right'} text-[10px]`}></i>
                                </button>
                                <label className="flex items-center gap-2 cursor-pointer text-xs flex-1" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        type="checkbox" 
                                        checked={isVisible} 
                                        onChange={() => toggleCategory(cat)} 
                                        className="accent-[var(--blue)] w-3 h-3 group-hover:scale-110 transition-transform"
                                    />
                                    <span className={isVisible ? 'text-gray-200 font-semibold' : 'text-gray-500 font-semibold'}>{cat}</span>
                                    <span className="text-[10px] text-gray-500 ml-auto bg-[#1a1a1a] px-1.5 py-0.5 rounded-full">{elementsByCategory[cat]?.length || 0}</span>
                                </label>
                            </div>
                            
                            {expandedCats[cat] && isVisible && elementsByCategory[cat] && (
                                <div className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-[#444] pl-2">
                                    {elementsByCategory[cat].map(el => {
                                        const isSelected = selectedElementID === el.expressID;
                                        return (
                                            <div 
                                                key={el.expressID} 
                                                className={`text-[11px] truncate cursor-pointer px-2 py-1 rounded transition-colors ${isSelected ? 'bg-[var(--blue)] text-white' : 'text-gray-400 hover:bg-[#3a3a3a] hover:text-gray-200'}`}
                                                onClick={() => handleElementClick(el.expressID)}
                                                title={el.name}
                                            >
                                                <i className="fa-regular fa-file-code mr-1.5 opacity-50"></i>
                                                {el.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {/* Mätgrupper Section */}
                <div className="p-4 border-t border-[#333] bg-[#222]">
                    <h3 className="font-bold text-sm mb-2 text-white">Mätgrupper</h3>
                    <div className="flex items-center gap-2 bg-[#1a1a1a] p-1.5 rounded-md border border-[#333]">
                      <div className="w-3 h-3 rounded shadow-sm" style={{ backgroundColor: measurementGroups.find(g => g.id === activeGroupId)?.color || '#ccc' }}></div>
                      <select
                        className="flex-1 w-full text-xs font-medium bg-transparent border-none focus:ring-0 text-gray-200 cursor-pointer p-0"
                        value={activeGroupId}
                        onChange={(e) => setActiveGroupId(e.target.value)}
                      >
                        {measurementGroups.map((g) => (
                          <option key={g.id} value={g.id} className="bg-[#222]">{g.name}</option>
                        ))}
                      </select>
                    </div>
                </div>
            </div>
        )}

        <div ref={containerRef} className="flex-1 h-full bg-[#1a1a1a] relative">
            {loading && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50 text-white flex-col">
                  <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-4"></i>
                  <span className="font-bold">Genererar geometri...</span>
               </div>
            )}
            
            <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-md text-xs font-mono z-10 border border-white/10 shadow-lg">
                <i className="fa-solid fa-gauge mr-2 opacity-70"></i>{fps} FPS
            </div>

            {/* A simple toolbar at the top right */}
            <div className="absolute top-4 right-4 flex gap-2 z-10 items-center">
                <div className="bg-black/60 text-[var(--text2)] text-xs px-3 py-2 rounded-md border border-white/10 hidden md:block">
                   <span className="text-[var(--text)] font-semibold">Tips:</span> Ctrl/Cmd-klick för att välja flera objekt.
                </div>
                
                {/* Measurement Tools */}
                <div className="flex bg-black/60 rounded-md border border-white/10 overflow-hidden">
                    <button 
                        className={`px-3 py-2 text-sm transition-colors ${isMeasuring && measureMode === 'distance' ? 'bg-[var(--blue)] text-white' : 'text-white hover:bg-black/80'}`}
                        onClick={() => toggleMeasuring('distance')}
                        title="Mät avstånd (Klicka på två punkter)"
                    >
                        <i className="fa-solid fa-ruler"></i>
                    </button>
                    <button 
                        className={`px-3 py-2 text-sm transition-colors border-l border-white/10 ${isMeasuring && measureMode === 'area' ? 'bg-[var(--blue)] text-white' : 'text-white hover:bg-black/80'}`}
                        onClick={() => toggleMeasuring('area')}
                        title="Mät area (Rita polygon, högerklicka för att avsluta)"
                    >
                        <i className="fa-solid fa-draw-polygon"></i>
                    </button>
                    <button 
                        className={`px-3 py-2 text-sm transition-colors border-l border-white/10 ${isMeasuring && measureMode === 'volume' ? 'bg-[var(--blue)] text-white' : 'text-white hover:bg-black/80'}`}
                        onClick={() => toggleMeasuring('volume')}
                        title="Mät volym (Rita polygon och ange djup)"
                    >
                        <i className="fa-solid fa-cube"></i>
                    </button>
                    <button 
                        className={`px-3 py-2 text-sm transition-colors border-l border-white/10 ${isMeasuring && measureMode === 'angle' ? 'bg-[var(--blue)] text-white' : 'text-white hover:bg-black/80'}`}
                        onClick={() => toggleMeasuring('angle')}
                        title="Mät vinkel (Klicka tre punkter)"
                    >
                        <i className="fa-solid fa-angle-left"></i>
                    </button>
                    <button 
                        className={`px-3 py-2 text-sm transition-colors border-l border-white/10 ${isAreaVolMeasuring ? 'bg-[var(--blue)] text-white' : 'text-white hover:bg-black/80'}`}
                        onClick={toggleAreaVolMeasuring}
                        title="Hämta yta för area/volym (Klicka på element)"
                    >
                        <i className="fa-solid fa-hand-pointer"></i>
                    </button>
                    {(measurements.length > 0 || areaMeasurements.length > 0) && (
                        <button 
                            className="px-3 py-2 text-sm text-red-400 hover:bg-black/80 transition-colors border-l border-white/10"
                            onClick={clearMeasurements}
                            title="Rensa mätningar"
                        >
                            <i className="fa-solid fa-trash-can"></i>
                        </button>
                    )}
                </div>

                <button 
                  className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-md transition-colors border border-white/10"
                  onClick={() => {
                     if (managerRef.current) {
                        const box = new THREE.Box3().setFromObject(managerRef.current.loader.modelGroup);
                        if (!box.isEmpty()) managerRef.current.core.fitToModel(box);
                     }
                  }}
                  title="Zoom Extents"
                >
                    <i className="fa-solid fa-expand"></i>
                </button>
            </div>

            {/* Measurement Labels Overlay */}
            {measurements.map(m => (
                <div
                    key={m.id}
                    ref={el => { labelsRef.current[m.id] = el; }}
                    className="absolute top-0 left-0 bg-black/80 text-white px-2 py-1 rounded text-xs border border-white/20 shadow pointer-events-none select-none z-20 font-mono"
                    style={{ willChange: 'transform' }}
                >
                    {m.type === 'distance' && m.distance !== undefined && `${m.distance.toFixed(3)} m`}
                    {m.type === 'area' && m.area !== undefined && (
                        <div>
                            <div>{m.area.toFixed(2)} m²</div>
                            {m.perimeter !== undefined && <div className="text-[10px] text-gray-400">Omkrets: {m.perimeter.toFixed(2)} m</div>}
                        </div>
                    )}
                    {m.type === 'volume' && m.volume !== undefined && (
                        <div>
                            <div>{m.volume.toFixed(2)} m³</div>
                            {m.area !== undefined && <div className="text-[10px] text-gray-400 mb-1">Area: {m.area.toFixed(2)} m²</div>}
                            {addParts && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendVolumeToCalc(m);
                                    }}
                                    className="mt-1 px-2 py-1 bg-[var(--blue)] hover:brightness-110 text-white text-[10px] rounded pointer-events-auto shadow-sm w-full transition-all flex items-center justify-center gap-1"
                                >
                                    <i className="fa-solid fa-arrow-right-to-bracket"></i> Skicka till kalkyl
                                </button>
                            )}
                        </div>
                    )}
                    {m.type === 'angle' && m.angle !== undefined && `${m.angle.toFixed(1)}°`}
                </div>
            ))}

            {/* Area/Volume Labels Overlay */}
            {areaMeasurements.map(m => (
                <div
                    key={m.id}
                    ref={el => { areaLabelsRef.current[m.id] = el; }}
                    className="absolute top-0 left-0 bg-[#0066cc]/90 text-white px-3 py-2 rounded-md text-xs border border-white/30 shadow-lg pointer-events-none select-none z-20 font-mono whitespace-nowrap"
                    style={{ willChange: 'transform' }}
                >
                    <div className="font-bold mb-1 border-b border-white/20 pb-1">Element {m.expressID}</div>
                    <div>Area: {m.area > 0 ? `${m.area.toFixed(2)} m²` : 'Okänd'}</div>
                    <div>Volym: {m.volume > 0 ? `${m.volume.toFixed(2)} m³` : 'Okänd'}</div>
                </div>
            ))}
        </div>

        {(properties || measurements.length > 0) && (
          <InspectorPortal>
            <div className="w-full h-full bg-[#222] text-white overflow-hidden flex flex-col shrink-0">
                <div className="flex border-b border-[#333] bg-[#2a2a2a] shrink-0 text-sm">
                    {properties && (
                        <button 
                            className={`flex-1 py-3 font-semibold ${activeRightTab === 'properties' ? 'border-b-2 border-[var(--blue)] text-white' : 'text-gray-400 hover:text-gray-200'}`} 
                            style={{borderColor: activeRightTab === 'properties' ? 'var(--blue)' : 'transparent'}}
                            onClick={() => setActiveRightTab('properties')}
                        >
                            Egenskaper
                        </button>
                    )}
                    {(measurements.length > 0) && (
                        <button 
                            className={`flex-1 py-3 font-semibold ${activeRightTab === 'measurements' ? 'border-b-2 border-[var(--blue)] text-white' : 'text-gray-400 hover:text-gray-200'}`} 
                            style={{borderColor: activeRightTab === 'measurements' ? 'var(--blue)' : 'transparent'}}
                            onClick={() => setActiveRightTab('measurements')}
                        >
                            Mängder
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeRightTab === 'properties' && properties ? (
                        <>
                            <div className="p-4 border-b border-[#333] bg-[#2a2a2a] sticky top-0 z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-gray-400 mt-1">{properties.name}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={handleSmartTakeoff}
                                            className="px-2 py-1 text-xs rounded transition-colors bg-[var(--blue-lt)] hover:bg-[var(--blue)] text-[var(--blue-dk)] hover:text-white font-bold"
                                            title="Mängda element (Skapa kalkylposter)"
                                        >
                                            <i className="fa-solid fa-calculator"></i>
                                        </button>
                                        <button 
                                            onClick={toggleIsolate}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${isolatedObject === properties.expressID ? 'bg-[var(--blue)] text-white' : 'bg-[#444] hover:bg-[#555] text-gray-200'}`}
                                            title="Isolera valt objekt"
                                        >
                                            <i className={`fa-solid ${isolatedObject === properties.expressID ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const blob = new Blob([JSON.stringify(properties, null, 2)], { type: 'application/json' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `ifc_props_${properties.expressID}.json`;
                                                a.click();
                                                URL.revokeObjectURL(url);
                                            }}
                                            className="px-2 py-1 text-xs rounded transition-colors bg-[#444] hover:bg-[#555] text-gray-200"
                                            title="Exportera till JSON"
                                        >
                                            <i className="fa-solid fa-download"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 text-xs font-mono">
                                <div className="mb-4">
                                    <strong className="text-[var(--blue-lt)] block mb-1">Globalt ID:</strong>
                                    <span className="text-gray-300">{properties.properties?.GlobalId?.value || 'N/A'}</span>
                                </div>
                                {properties.psets?.map((pset: any, idx: number) => (
                                    <div key={idx} className="mb-4 bg-[#2a2a2a] p-2 rounded">
                                        <strong className="text-[var(--blue-lt)] block mb-2">{pset.Name?.value || 'Pset'}</strong>
                                        <table className="w-full">
                                            <tbody>
                                              {(pset.HasProperties || pset.Quantities || []).map((prop: any, pIdx: number) => (
                                                  <tr key={pIdx} className="border-b border-[#333] last:border-0">
                                                      <td className="py-1 text-gray-400">{prop.Name?.value}</td>
                                                      <td className="py-1 text-right text-gray-200">
                                                          {prop.NominalValue?.value || prop.VolumeValue?.value || prop.AreaValue?.value || prop.LengthValue?.value || prop.MassValue?.value || prop.WeightValue?.value || '-'}
                                                      </td>
                                                  </tr>
                                              ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="p-4">
                            <ul className="space-y-4">
                                {measurementGroups.map((group) => {
                                    const groupMeasurements = measurements.filter((m) => m.groupId === group.id || (!m.groupId && group.id === 'default'));
                                    if (groupMeasurements.length === 0) return null;

                                    const summary = groupMeasurements.reduce((acc, m) => {
                                        const unit = m.type === "area" ? "m²" : m.type === "volume" ? "m³" : m.type === "angle" ? "°" : "m";
                                        const key = m.type;
                                        if (!acc[key]) acc[key] = { type: m.type, total: 0, unit, items: [] };
                                        acc[key].items.push(m);
                                        const val = m.type === 'distance' ? m.distance : m.type === 'area' ? m.area : m.type === 'volume' ? m.volume : m.angle;
                                        acc[key].total += val || 0;
                                        return acc;
                                    }, {} as Record<string, { type: string; total: number; unit: string; items: MeasurementData[] }>);

                                    return (
                                        <li key={group.id} className="bg-[#2a2a2a] rounded-lg border border-[#333] overflow-hidden shadow-sm">
                                            <div className="bg-[#1a1a1a] p-2 flex items-center justify-between border-b border-[#333]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: group.color }}></div>
                                                    <span className="font-bold text-sm text-gray-200">{group.name}</span>
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium">{groupMeasurements.length} st</span>
                                            </div>
                                            <div className="p-2 space-y-3">
                                                {Object.values(summary).map(sum => (
                                                    <div key={sum.type} className="space-y-1">
                                                        <div className="flex justify-between items-center text-xs font-semibold text-gray-400 uppercase mb-1">
                                                            <span>{sum.type === 'area' ? 'Yta' : sum.type === 'volume' ? 'Volym' : sum.type === 'angle' ? 'Vinkel' : 'Längd'}</span>
                                                            <span className="text-gray-200 bg-[#333] px-1.5 py-0.5 rounded">{sum.total.toFixed(2)} {sum.unit}</span>
                                                        </div>
                                                        <ul className="space-y-1 pl-1 border-l-2 border-[#444] ml-1">
                                                            {sum.items.map(m => {
                                                                const val = m.type === 'distance' ? m.distance : m.type === 'area' ? m.area : m.type === 'volume' ? m.volume : m.angle;
                                                                return (
                                                                    <li key={m.id} className="flex justify-between items-center p-1.5 rounded hover:bg-[#333] transition-colors group">
                                                                        <div className="flex items-center gap-2">
                                                                          <span className="text-xs text-gray-400 font-medium font-mono">#{m.id.substring(m.id.length - 4)}</span>
                                                                          <span className="text-xs font-medium text-gray-300">{(val || 0).toFixed(2)} {sum.unit}</span>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => {
                                                                                if (managerRef.current) {
                                                                                    managerRef.current.measureTool.removeMeasurement(m.id);
                                                                                }
                                                                            }}
                                                                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-400/20 px-1.5 py-0.5 rounded transition-all"
                                                                            title="Ta bort"
                                                                        >
                                                                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                                                                        </button>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
          </InspectorPortal>
        )}
    </div>
  );
}
