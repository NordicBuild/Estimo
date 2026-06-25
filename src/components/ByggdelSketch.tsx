import React, { useRef, useState, useEffect } from 'react';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildByggdelGeometry, ROLE_COLORS, GeoPart } from './byggdelGeometry';

export const ByggdelSketch = ({ mType, dimensions }: { mType: string, dimensions?: any }) => {
  const [mode, setMode] = useState<'3d' | 'sketch'>('3d');
  const [isExpanded, setIsExpanded] = useState(false);

  const wrapperClass = isExpanded 
    ? "fixed inset-4 z-[50] bg-surface-container-low rounded-xl shadow-2xl border border-outline-variant flex flex-col"
    : "w-full bg-surface-container-low rounded-lg border border-outline-variant overflow-hidden flex flex-col h-full min-h-[300px]";

  return (
    <>
      {isExpanded && <div className="fixed inset-0 bg-black/50 z-[40]" onClick={() => setIsExpanded(false)} />}
      <div className={wrapperClass}>
        <div className="flex border-b border-outline-variant items-center pr-2">
          <button 
            className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider ${mode === '3d' ? 'bg-surface text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => setMode('3d')}
          >
            Typskiss
          </button>
          <button 
            className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider ${mode === 'sketch' ? 'bg-surface text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => setMode('sketch')}
          >
            Friskiss
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="ml-2 p-1.5 text-on-surface hover:bg-surface-container-high rounded-md">
            <span className="material-symbols-outlined text-[18px]">{isExpanded ? 'fullscreen_exit' : 'fullscreen'}</span>
          </button>
        </div>
        
        <div className="p-4 flex-1 flex flex-col items-center justify-center relative bg-white overflow-hidden">
          {mode === '3d' ? <ByggdelViewer3D mType={mType} dimensions={dimensions} /> : <CanvasSketch />}
        </div>
      </div>
    </>
  );
};

const ByggdelViewer3D = ({ mType, dimensions = {} }: { mType: string, dimensions: any }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredPart, setHoveredPart] = useState<{ part: GeoPart, point: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f5f5);

    const camera = new THREE.PerspectiveCamera(45, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // 2. Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    // 3. Add GridHelper
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
    scene.add(gridHelper);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 5. Build Geometry
    const parts = buildByggdelGeometry(mType, dimensions);
    const meshes: THREE.Mesh[] = [];
    
    // Group to hold all parts for easier bounds calculation
    const group = new THREE.Group();
    scene.add(group);

    parts.forEach(part => {
      let geometry;
      if (part.kind === 'box') {
        geometry = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
      } else if (part.kind === 'cylinder') {
        geometry = new THREE.CylinderGeometry(part.size[0], part.size[1], part.size[2], 32);
      } else {
        geometry = new THREE.BoxGeometry(1, 1, 1);
      }

      const material = new THREE.MeshStandardMaterial({
        color: ROLE_COLORS[part.role] || 0xcccccc,
        transparent: part.role === 'fill',
        opacity: part.role === 'fill' ? 0.35 : 1.0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(part.position[0], part.position[1], part.position[2]);
      mesh.userData = { part };
      group.add(mesh);
      meshes.push(mesh);

      // Add Edges
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 }));
      mesh.add(line);
    });

    // 6. Camera Positioning
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z, 1); // Avoid 0
    // Set camera offset
    const distance = maxDim * 1.8;
    camera.position.set(center.x + distance, center.y + distance * 0.8, center.z + distance);
    controls.target.set(center.x, center.y, center.z);
    
    // Fallback if the object is extremely small or zero
    if (maxDim <= 0.1) {
      camera.position.set(2, 2, 2);
      controls.target.set(0, 0, 0);
    }
    
    controls.update();

    // 7. Raycasting for Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: PointerEvent) => {
      const rect = currentMount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh;
        const part = object.userData?.part as GeoPart | undefined;
        
        if (part) {
          setHoveredPart({ part, point: intersects[0].point });
        }
        
        // Highlight effect
        meshes.forEach(m => {
          if (m.material && 'emissive' in m.material) {
            (m.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
        });
        
        if (object.material && 'emissive' in object.material) {
          (object.material as THREE.MeshStandardMaterial).emissive.setHex(0x333333);
        }
      } else {
        setHoveredPart(null);
        meshes.forEach(m => {
          if (m.material && 'emissive' in m.material) {
            (m.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
        });
      }
    };
    currentMount.addEventListener('pointerdown', onPointerDown);

    // 8. Animation Loop
    let animationFrameId: number;
    
    // Prepare HTML labels
    const labelContainer = document.createElement('div');
    labelContainer.style.position = 'absolute';
    labelContainer.style.top = '0';
    labelContainer.style.left = '0';
    labelContainer.style.width = '100%';
    labelContainer.style.height = '100%';
    labelContainer.style.pointerEvents = 'none';
    labelContainer.style.overflow = 'hidden';
    currentMount.appendChild(labelContainer);

    const labels: { el: HTMLElement; p1: THREE.Vector3; p2: THREE.Vector3 }[] = [];
    parts.forEach(part => {
      if (part.dims) {
        part.dims.forEach(dim => {
          const el = document.createElement('div');
          el.className = 'absolute text-[10px] font-mono font-bold text-slate-700 bg-white/70 px-1 rounded';
          el.style.transform = 'translate(-50%, -50%)';
          el.innerText = `${dim.label}: ${dim.value}`;
          labelContainer.appendChild(el);
          
          const p1 = new THREE.Vector3(dim.p1[0], dim.p1[1], dim.p1[2]);
          const p2 = new THREE.Vector3(dim.p2[0], dim.p2[1], dim.p2[2]);
          // Adjust for part position
          p1.add(new THREE.Vector3(part.position[0], part.position[1], part.position[2]));
          p2.add(new THREE.Vector3(part.position[0], part.position[1], part.position[2]));
          
          labels.push({ el, p1, p2 });
        });
      }
    });

    const tempV = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      
      // Update label positions
      labels.forEach(({ el, p1, p2 }) => {
        tempV.copy(p1).lerp(p2, 0.5); // mid point
        tempV.project(camera);
        
        const x = (tempV.x * 0.5 + 0.5) * currentMount.clientWidth;
        const y = (-(tempV.y * 0.5) + 0.5) * currentMount.clientHeight;
        
        // Hide if behind camera
        if (tempV.z > 1.0) {
          el.style.display = 'none';
        } else {
          el.style.display = 'block';
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
      });
    };
    animate();

    // 9. Resize Observer
    let resizeTimer: number;
    const resizeObserver = new ResizeObserver(entries => {
      cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(() => {
        if (!entries || entries.length === 0) return;
        const { width, height } = entries[0].contentRect;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      });
    });
    resizeObserver.observe(currentMount);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(resizeTimer);
      currentMount.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      
      meshes.forEach(mesh => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      while(currentMount.firstChild) {
        currentMount.removeChild(currentMount.firstChild);
      }
    };
  }, [mType, dimensions]);

  // Project 3D point to 2D for label
  // We can just use a simple absolutely positioned div for the overlay
  // But wait, the point moves when camera moves! We need to update the overlay position continuously.
  // To keep it simple as requested ("litet överlägg"), we can just place it centered on screen or 
  // track it in state, but tracking in state per frame is bad for performance.
  // The simplest is an overlay in the corner when a part is selected.

  return (
    <div className="w-full h-full relative" ref={mountRef}>
      {hoveredPart && (
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm p-2 rounded shadow-md text-xs pointer-events-none border border-slate-200">
          <div className="font-bold text-slate-800">{hoveredPart.part.label}</div>
          {hoveredPart.part.size && (
            <div className="text-slate-600 mt-1">
              {hoveredPart.part.kind === 'box' ? (
                <>L: {hoveredPart.part.size[0].toFixed(2)} | H: {hoveredPart.part.size[1].toFixed(2)} | B: {hoveredPart.part.size[2].toFixed(2)}</>
              ) : (
                <>R: {hoveredPart.part.size[0].toFixed(2)} | H: {hoveredPart.part.size[2].toFixed(2)}</>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Fallback dimensions display when nothing is hovered, similar to old DimText */}
      {!hoveredPart && Object.keys(dimensions).length > 0 && (
        <div className="absolute bottom-2 left-2 bg-white/80 p-2 rounded shadow-sm text-xs pointer-events-none flex gap-3 text-slate-600">
           {dimensions.length && <span>L: {dimensions.length}</span>}
           {dimensions.width && <span>B: {dimensions.width}</span>}
           {dimensions.height && <span>H: {dimensions.height}</span>}
           {dimensions.thickness && <span>Tj: {dimensions.thickness}</span>}
        </div>
      )}
    </div>
  );
};

// Canvas Sketch Tool
type Shape = {
  type: 'rectangle' | 'circle' | 'line' | 'text' | 'freehand' | 'arrow';
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
  color: string;
  text?: string;
  points?: {x: number, y: number}[];
};

const CanvasSketch = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentTool, setCurrentTool] = useState<'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'freehand'>('freehand');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [currentColor, setCurrentColor] = useState('#0ea5e9'); // sky-500
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Resize canvas on mount
  useEffect(() => {
    if (containerRef.current && canvasRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
      redraw();
      
      const handleResize = () => {
        if (!containerRef.current || !canvasRef.current) return;
        const r = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = r.width;
        canvasRef.current.height = r.height;
        redraw();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    redraw();
  }, [shapes, currentShape, bgImage]);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    if (!bgImage) {
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    } else {
      // Draw background image scaled to fit or center
      const scale = Math.min(canvas.width / bgImage.width, canvas.height / bgImage.height);
      const w = bgImage.width * scale;
      const h = bgImage.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(bgImage, x, y, w, h);
    }

    // Draw saved
    shapes.forEach(shape => drawShape(ctx, shape));
    // Draw current
    if (currentShape) drawShape(ctx, currentShape);
  };

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.beginPath();
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.type === 'text' ? shape.color : (shape.color + '33');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (shape.type === 'rectangle' && shape.width && shape.height) {
      ctx.rect(shape.x, shape.y, shape.width, shape.height);
      ctx.fill();
    } else if (shape.type === 'circle' && shape.width && shape.height) {
      const radius = Math.sqrt(Math.pow(shape.width, 2) + Math.pow(shape.height, 2));
      ctx.arc(shape.x, shape.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    } else if (shape.type === 'freehand' && shape.points && shape.points.length > 0) {
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
    } else if (shape.type === 'line' && shape.x2 && shape.y2) {
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x2, shape.y2);
    } else if (shape.type === 'arrow' && shape.x2 && shape.y2) {
      // Draw dimension line/arrow
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x2, shape.y2);
      // Arrowheads
      const angle = Math.atan2(shape.y2 - shape.y, shape.x2 - shape.x);
      ctx.lineTo(shape.x2 - 10 * Math.cos(angle - Math.PI / 6), shape.y2 - 10 * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(shape.x2, shape.y2);
      ctx.lineTo(shape.x2 - 10 * Math.cos(angle + Math.PI / 6), shape.y2 - 10 * Math.sin(angle + Math.PI / 6));
    } else if (shape.type === 'text' && shape.text) {
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.shadowColor = "white";
      ctx.shadowBlur = 4;
      ctx.fillText(shape.text, shape.x, shape.y);
      ctx.shadowBlur = 0; // reset
    }
    ctx.stroke();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (document.activeElement?.tagName === 'INPUT') return; // Don't interefere if an input is open somehow
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (currentTool === 'text') {
      const text = window.prompt("Ange mått / text:");
      if (text) {
        setShapes([...shapes, { type: 'text', x, y, color: currentColor, text }]);
      }
      return;
    }

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentShape({
      type: currentTool,
      x, y, x2: x, y2: y, width: 0, height: 0,
      color: currentColor,
      points: [{x, y}]
    });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !currentShape) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (currentTool === 'freehand') {
      setCurrentShape({
        ...currentShape,
        points: [...(currentShape.points || []), {x, y}]
      });
    } else {
      setCurrentShape({
        ...currentShape,
        x2: x, y2: y,
        width: x - currentShape.x,
        height: y - currentShape.y
      });
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentShape) return;
    setIsDrawing(false);
    
    // Filter out clicks
    if (currentTool === 'freehand' && (currentShape.points?.length || 0) > 2) {
      setShapes([...shapes, currentShape]);
    } else if (['rectangle', 'circle', 'arrow', 'line'].includes(currentTool)) {
      if (Math.abs(currentShape.width || 0) > 5 || Math.abs(currentShape.height || 0) > 5 || Math.abs((currentShape.x2 || 0) - currentShape.x) > 5) {
        setShapes([...shapes, currentShape]);
      }
    }
    setCurrentShape(null);
  };

  // Paste image handler (listening on the container)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                  setBgImage(img);
                  // Ensure canvas updates after image loads
                  redraw();
                };
                img.src = url;
            }
        }
    }
  };

  useEffect(() => {
    // Add global paste event listener since the div tabIndex might be finicky
    const globalPaste = (e: ClipboardEvent) => {
      // Only process paste if we are in sketch mode (this component is mounted)
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
              const blob = items[i].getAsFile();
              if (blob) {
                  const url = URL.createObjectURL(blob);
                  const img = new Image();
                  img.onload = () => {
                    setBgImage(img);
                    redraw();
                  };
                  img.src = url;
                  e.preventDefault(); // stop browser from pasting elsewhere if needed
              }
          }
      }
    };
    document.addEventListener('paste', globalPaste);
    return () => document.removeEventListener('paste', globalPaste);
  }, []);

  return (
    <div 
      className="w-full h-full flex flex-col items-center flex-1 absolute inset-0 pt-2 bg-slate-50"
      onPaste={handlePaste} 
      tabIndex={0} 
      style={{ outline: 'none' }}
    >
      <div className="flex flex-wrap items-center gap-1 mb-2 px-2 z-10 w-full justify-center">
        {[
          { id: 'freehand', icon: 'draw', title: 'Penna' },
          { id: 'line', icon: 'horizontal_rule', title: 'Rak linje' },
          { id: 'arrow', icon: 'straighten', title: 'Måttpil' },
          { id: 'rectangle', icon: 'crop_square', title: 'Rektangel' },
          { id: 'circle', icon: 'radio_button_unchecked', title: 'Cirkel' },
          { id: 'text', icon: 'title', title: 'Lägg till text' }
        ].map(t => (
           <button 
             key={t.id}
             onClick={() => setCurrentTool(t.id as any)}
             className={`p-1.5 rounded-md transition-colors flex items-center justify-center border ${currentTool === t.id ? 'bg-primary-container text-on-primary-container border-primary shadow-sm' : 'bg-surface text-on-surface hover:bg-surface-container-high border-transparent'}`}
             title={t.title}
           >
             <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
           </button>
        ))}
        <div className="w-[1px] h-4 bg-outline-variant mx-1"></div>
        <div className="flex gap-1">
          {['#0f172a', '#0ea5e9', '#ef4444', '#22c55e', '#eab308', '#ec4899', '#ffffff'].map(c => (
            <button key={c} onClick={() => setCurrentColor(c)} className={`w-5 h-5 rounded-full border border-outline-variant ${currentColor === c ? 'ring-2 ring-primary scale-110' : ''}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="w-[1px] h-4 bg-outline-variant mx-1"></div>
        <button onClick={() => setShapes(shapes.slice(0, -1))} disabled={shapes.length === 0} className="p-1.5 rounded-md text-on-surface hover:bg-surface-container-high disabled:opacity-30" title="Ångra"><span className="material-symbols-outlined text-[16px]">undo</span></button>
        <button onClick={() => {setShapes([]); setBgImage(null);}} disabled={shapes.length === 0 && !bgImage} className="p-1.5 rounded-md hover:bg-red-50 text-error disabled:opacity-30" title="Rensa allt"><span className="material-symbols-outlined text-[16px]">delete</span></button>
      </div>

      <div className="text-[9px] text-on-surface-variant text-center mb-1 bg-surface-container/50 px-2 py-0.5 rounded-full font-medium">
        Klistra in bild (Ctrl+V). Skissa för fri hand, eller rita dimensioner.
      </div>

      <div ref={containerRef} className="flex-1 w-full relative cursor-crosshair border-t border-outline-variant rounded-b-lg overflow-hidden bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
};
