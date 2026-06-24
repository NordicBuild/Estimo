import React, { useRef, useState, useEffect } from 'react';

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
          {mode === '3d' ? <ThreeDSketch mType={mType} dimensions={dimensions} /> : <CanvasSketch />}
        </div>
      </div>
    </>
  );
};

const ThreeDSketch = ({ mType, dimensions = {} }: { mType: string, dimensions: any }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.5, Math.min(10, z - e.deltaY * 0.005)));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPan(p => ({ x: p.x + e.movementX / zoom, y: p.y + e.movementY / zoom }));
    }
  };
  const handlePointerUp = () => setIsDragging(false);

  // Isometric projection math
  const l = Math.max(0.1, Number(dimensions.length) || 1);
  const w = Math.max(0.1, Number(dimensions.width) || 1);
  const h = Math.max(0.1, Number(dimensions.height) || 1);
  
  const maxDim = Math.max(l, w, h);
  const scale = maxDim === 0 ? 1 : 40 / maxDim;
  
  const sl = l * scale;
  const sw = w * scale;
  const sh = h * scale;

  const dx = Math.cos(Math.PI / 6);
  const dy = Math.sin(Math.PI / 6);
  
  const iso = (x: number, y: number, z: number) => ({
    x: (x - z) * dx,
    y: (x + z) * dy - y
  });

  const poly = (...pts: {x: number, y: number}[]) => pts.map(p => `${p.x},${p.y}`).join(' ');

  const DimText = ({ p1, p2, val, label, offset = 5 }: any) => {
    if (val === undefined || val === null || val === '') return null;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    // Determine offset direction perpendicular to line
    const ox = offset * Math.cos(ang - Math.PI/2);
    const oy = offset * Math.sin(ang - Math.PI/2);
    
    return (
      <g>
        <line x1={midX} y1={midY} x2={midX + ox} y2={midY + oy} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="1,1" />
        <text x={midX + ox + (ox>0?1:-1)} y={midY + oy + (oy>0?1:-1)} fontSize="3" fill="#475569" textAnchor={ox>0?"start":"end"} dominantBaseline="middle" className="font-mono font-bold" style={{ textShadow: "0 0 2px white, 0 0 4px white" }}>
          {label}: {val}
        </text>
      </g>
    );
  };

  const getSketchContent = () => {
    // Generate base block
    const p000 = iso(0, 0, 0);       // Back bottom
    const pL00 = iso(sl, 0, 0);      // Right bottom
    const p00W = iso(0, 0, sw);      // Left bottom
    const pL0W = iso(sl, 0, sw);     // Front bottom
    
    const p0H0 = iso(0, sh, 0);      // Back top
    const pLH0 = iso(sl, sh, 0);     // Right top
    const p0HW = iso(0, sh, sw);     // Left top
    const pLHW = iso(sl, sh, sw);    // Front top

    if (mType === '24.2_Sula') {
      const shaftW = Math.max(0.1, Number(dimensions.shaftWidth) || w * 0.2) * scale;
      const opL00 = iso(sl, sh, (sw - shaftW)/2);
      const op00W = iso(0, sh, sw - (sw - shaftW)/2);
      const opL0W = iso(sl, sh, sw - (sw - shaftW)/2);
      
      const pS00 = iso(sl, sh+20, (sw - shaftW)/2);
      const pS0W = iso(0, sh+20, (sw - shaftW)/2);
      const pSHW = iso(0, sh+20, sw - (sw - shaftW)/2);
      const pSLW = iso(sl, sh+20, sw - (sw - shaftW)/2);

      return (
        <g>
          {/* Base block */}
          <polygon points={poly(p0H0, pLH0, pLHW, p0HW)} fill="#b3b7b9" /> {/* Top */}
          <polygon points={poly(p00W, p0HW, pLHW, pL0W)} fill="#8B9194" /> {/* Left */}
          <polygon points={poly(pL00, pLH0, pLHW, pL0W)} fill="#616668" /> {/* Right */}
          
          {/* Shaft block (fake height just to show representation) */}
          <polygon points={poly(pS0W, pS00, pSLW, pSHW)} fill="#c8a47e" /> {/* formwork wood top */}
          <polygon points={poly(op00W, pSHW, pSLW, opL0W)} fill="#b58d62" /> {/* wood left */}
          <polygon points={poly(opL00, pS00, pSLW, opL0W)} fill="#9c7348" /> {/* wood right */}
          
          <DimText p1={pL0W} p2={pL00} val={dimensions.width} label="B" offset={-10} />
          <DimText p1={p00W} p2={pL0W} val={dimensions.length} label="L" offset={10} />
          <DimText p1={p0HW} p2={p00W} val={dimensions.height} label="H(sula)" offset={-8} />
          <DimText p1={pS00} p2={pSLW} val={dimensions.shaftWidth} label="B(form)" offset={-5} />
        </g>
      );
    }

    return (
      <g>
        <polygon points={poly(p0H0, pLH0, pLHW, p0HW)} fill="#b3b7b9" />
        <polygon points={poly(p00W, p0HW, pLHW, pL0W)} fill="#8B9194" />
        <polygon points={poly(pL00, pLH0, pLHW, pL0W)} fill="#616668" />
        
        <DimText p1={pL0W} p2={pL00} val={dimensions.width || dimensions.wallThickness} label="B/Tj" offset={-8} />
        <DimText p1={p00W} p2={pL0W} val={dimensions.length} label="L" offset={8} />
        <DimText p1={p0HW} p2={p00W} val={dimensions.height || dimensions.slabThickness} label="H/Tj" offset={-8} />
      </g>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative touch-none select-none">
      <div className="flex gap-2 absolute top-2 right-2 z-10">
        <button onClick={() => setZoom(z => z + 0.2)} className="w-6 h-6 flex items-center justify-center bg-surface border border-outline-variant rounded shadow-sm hover:bg-surface-container-high">
          <span className="material-symbols-outlined text-[14px]">add</span>
        </button>
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="w-6 h-6 flex items-center justify-center bg-surface border border-outline-variant rounded shadow-sm hover:bg-surface-container-high">
          <span className="material-symbols-outlined text-[14px]">remove</span>
        </button>
        <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="w-6 h-6 flex items-center justify-center bg-surface border border-outline-variant rounded shadow-sm hover:bg-surface-container-high">
          <span className="material-symbols-outlined text-[14px]">filter_center_focus</span>
        </button>
      </div>
      <svg 
        ref={svgRef}
        viewBox="-50 -50 100 100" 
        className="w-full h-full drop-shadow-md text-slate-600 stroke-current overflow-visible cursor-grab active:cursor-grabbing" 
        strokeWidth="0.5" 
        strokeLinejoin="round"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
          {getSketchContent()}
        </g>
      </svg>
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
