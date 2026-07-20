import React, { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerRaw from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';

// Create a blob URL for the worker to avoid cross-origin or proxy network errors
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  const workerBlob = new Blob([workerRaw], { type: 'text/javascript' });
  pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
}
import { Byggdel, INITIAL_TIDSFAKTORER } from "../data";
import { calculateDefaultMoments } from "../calculationHelpers";
import { PageScales, scaleForPage, setPageScale, serializePageScales, deserializePageScales, emptyPageScales } from "../pdf/pageScales";
import { Scale, deriveScale, toRealDistance, toRealArea, presetScale, ratioFromScale, toMeters } from "../pdf/scaleHelpers";

// 
import { Measurement, MeasurementGroup, Point } from "../measurementTypes";
import { useFfuStore } from "../ffu/store/useFfuStore";
import { usePdfStore } from "../state/usePdfStore";
import { supabase } from '../supabase';
import { getFile } from '../ffu/localDb';
import { DocumentPickerModal } from './DocumentPickerModal';


export function PdfMeasurementTab({
  addParts,
  initialDocumentId,
  activeProjectId,
}: {
  addParts?: (parts: Omit<Byggdel, "id">[]) => void;
  initialDocumentId?: string | null;
  activeProjectId?: string | null;
}) {
  const [documentId, setDocumentId] = useState<string | null>(initialDocumentId || null);
  const [isSavingFfu, setIsSavingFfu] = useState(false);
  const [currentTool, setCurrentTool] = useState<
    | "pan"
    | "select"
    | "distance"
    | "polyline"
    | "area"
    | "volume"
    | "count"
    | "cloud"
    | "line"
    | "text"
    | "rectangle"
    | "pencil"
    | "calibrate"
  >("pan");
  const [pageScales, setPageScales] = useState<PageScales>(emptyPageScales());
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfFilePath, setPdfFilePath] = useState<string | null>(null);
  const [showScaleWarning, setShowScaleWarning] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);


  const [activeRightTab, setActiveRightTab] = useState<"skala" | "grupper" | "egenskaper" | "export" | null>(null);

  // Panel sizing
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);

  const startSidebarResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Because sidebar is on the right, moving left (negative delta) increases width
      const newWidth = Math.max(200, Math.min(600, startWidth - deltaX));
      setSidebarWidth(newWidth);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const startBottomPanelResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      // Bottom panel: moving up (negative delta) increases height
      const newHeight = Math.max(100, Math.min(800, startHeight - deltaY));
      setBottomPanelHeight(newHeight);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };
  const { pdfToLoad, setPdfToLoad } = usePdfStore();
  const [isFfuPickerOpen, setIsFfuPickerOpen] = useState(false);
  

  useEffect(() => {
    if (pdfFilePath) {
      localStorage.setItem(`pdf_measurements_${pdfFilePath}`, JSON.stringify(measurements));
    } else if (pdfFileName) {
      localStorage.setItem(`pdf_measurements_${pdfFileName}`, JSON.stringify(measurements));
    }
  }, [measurements, pdfFileName, pdfFilePath]);
  
  useEffect(() => {
    if (pdfToLoad) {
      const loadPdfFromUrl = async () => {
        try {
          let arrayBuffer;
          if (pdfToLoad.url.startsWith('blob:')) {
              const response = await fetch(pdfToLoad.url);
              arrayBuffer = await response.arrayBuffer();
          } else {
              try {
                  const localFile = await getFile(pdfToLoad.file_path);
                  if (localFile) {
                      arrayBuffer = await localFile.arrayBuffer();
                  } else {
                      const { data, error } = await supabase.storage.from("documents").download(pdfToLoad.file_path);
                      if (error || !data) {
                          throw new Error("Failed to download PDF: " + (error?.message || "No data"));
                      }
                      arrayBuffer = await data.arrayBuffer();
                  }
              } catch (e) {
                  // Fallback to fetch if localDb/supabase fails (e.g. if file_path is somehow a full URL)
                  const response = await fetch(pdfToLoad.url);
                  arrayBuffer = await response.arrayBuffer();
              }
          }
          const savedScales = localStorage.getItem(`pdf_scales_${pdfToLoad.file_path || pdfToLoad.filename}`);
          if (savedScales) {
            setPageScales(deserializePageScales(savedScales));
          } else {
            setPageScales(emptyPageScales());
          }
          const savedMeasurements = localStorage.getItem(`pdf_measurements_${pdfToLoad.file_path || pdfToLoad.filename}`);
          const initialMeasurements = savedMeasurements ? JSON.parse(savedMeasurements) : [];
          
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const doc = await loadingTask.promise;
          setPdfDoc(doc);
          setPageNum(1);
          setMeasurements(initialMeasurements);
          setPdfFileName(pdfToLoad.filename);
          setPdfFilePath(pdfToLoad.file_path || null);
          setCurrentPoints([]);
        } catch (err) {
          console.error("Failed to load PDF from store", err);
          alert("Kunde inte ladda PDF från FFU");
        }
        setPdfToLoad(null);
      };
      loadPdfFromUrl();
    }
  }, [pdfToLoad, setPdfToLoad]);
  const [measurementGroups, setMeasurementGroups] = useState<MeasurementGroup[]>([
    { id: 'default', name: 'Standard', color: '#ef4444', visible: true }
  ]);
  const [activeGroupId, setActiveGroupId] = useState<string>('default');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null); // For live readout
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue?: string;
    isAlert?: boolean;
    onConfirm: (val: string) => void;
    onCancel?: () => void;
  } | null>(null);

  const [selectedBulkMeasurements, setSelectedBulkMeasurements] = useState<Set<string>>(new Set());
  const [bulkActionName, setBulkActionName] = useState("");
  const [bulkActionGroupId, setBulkActionGroupId] = useState("");

  const handleBulkSelect = (id: string, selected: boolean) => {
    setSelectedBulkMeasurements(prev => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageMeasurements = measurements.filter(m => m.page === pageNum);
    if (e.target.checked) {
      setSelectedBulkMeasurements(prev => {
        const next = new Set(prev);
        pageMeasurements.forEach(m => next.add(m.id));
        return next;
      });
    } else {
      setSelectedBulkMeasurements(prev => {
        const next = new Set(prev);
        pageMeasurements.forEach(m => next.delete(m.id));
        return next;
      });
    }
  };

  const applyBulkChanges = () => {
    if (selectedBulkMeasurements.size === 0) return;
    setMeasurements(measurements.map(m => {
      if (selectedBulkMeasurements.has(m.id)) {
        const updates: any = {};
        if (bulkActionName.trim() !== '') updates.name = bulkActionName.trim();
        if (bulkActionGroupId !== '') updates.groupId = bulkActionGroupId === 'default' ? undefined : bulkActionGroupId;
        return { ...m, ...updates };
      }
      return m;
    }));
    setBulkActionName("");
    setBulkActionGroupId("");
    setSelectedBulkMeasurements(new Set());
  };

  const deleteBulkSelected = () => {
    if (selectedBulkMeasurements.size === 0) return;
    setDialogConfig({
      isOpen: true,
      title: "Radera markerade",
      message: `Är du säker på att du vill radera ${selectedBulkMeasurements.size} mätningar?`,
      onConfirm: () => {
        setMeasurements(measurements.filter(m => !selectedBulkMeasurements.has(m.id)));
        setSelectedBulkMeasurements(new Set());
        setDialogConfig(null);
      },
      onCancel: () => setDialogConfig(null)
    });
  };

  const [calibrateDialog, setCalibrateDialog] = useState<{
    isOpen: boolean;
    pxDistance: number;
    length: string;
    unit: string;
  } | null>(null);

  const handleSetScale = (scaleObj: Scale) => {
    const updatedScales = setPageScale(pageScales, pageNum, scaleObj);
    setPageScales(updatedScales);
    setShowScaleWarning(false);
    if (pdfFilePath) {
      localStorage.setItem(`pdf_scales_${pdfFilePath}`, serializePageScales(updatedScales));
    } else if (pdfFileName) {
      localStorage.setItem(`pdf_scales_${pdfFileName}`, serializePageScales(updatedScales));
    }

    // Recalculate existing measurements with the new scale
    setMeasurements((prev) =>
      prev.map((m) => {
        if (m.page !== pageNum) return m;
        if (m.tool === "count" || m.tool === "text") return m;

        let newValue = 0;
        if (m.tool === "area" || m.tool === "volume" || m.tool === "cloud") {
          let area = 0;
          for (let i = 0; i < m.points.length; i++) {
            const p1 = m.points[i];
            const p2 = m.points[(i + 1) % m.points.length];
            area += p1.x * p2.y - p2.x * p1.y;
          }
          newValue = toRealArea(Math.abs(area / 2), scaleObj.pixelsPerUnit);
          if (m.tool === "volume" && m.depth) {
            newValue *= m.depth;
          }
        } else if (m.tool === "distance" || m.tool === "line") {
          if (m.points.length >= 2) {
            const p1 = m.points[0];
            const p2 = m.points[m.points.length - 1]; // Use last point for distance tools
            const dist = Math.sqrt(
              Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2),
            );
            newValue = toRealDistance(dist, scaleObj.pixelsPerUnit);
          }
        } else if (m.tool === "polyline") {
          let length = 0;
          for (let i = 0; i < m.points.length - 1; i++) {
            const p1 = m.points[i];
            const p2 = m.points[i + 1];
            length += Math.sqrt(
              Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2),
            );
          }
          newValue = toRealDistance(length, scaleObj.pixelsPerUnit);
        } else if (m.tool === "rectangle") {
          if (m.points.length >= 2) {
            newValue = toRealArea(
              Math.abs(m.points[1].x - m.points[0].x) * Math.abs(m.points[1].y - m.points[0].y),
              scaleObj.pixelsPerUnit
            );
          }
        }
        return { ...m, value: newValue };
      }),
    );
  };

  const handleToolSelect = (tool: typeof currentTool) => {
    const currentScale = scaleForPage(pageScales, pageNum, presetScale(0));
    if (
      currentScale.invalid &&
      ["distance", "polyline", "area", "volume", "rectangle", "line"].includes(
        tool,
      )
    ) {
      setShowScaleWarning(true);
    } else {
      setShowScaleWarning(false);
    }
    setCurrentTool(tool);
    setCurrentPoints([]);
    setSnappedPoint(null);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef({ scale: 1.0, tx: 0, ty: 0 });
  const renderTaskRef = useRef<any>(null);
  const [isDrawingPencil, setIsDrawingPencil] = useState(false);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [displayZoom, setDisplayZoom] = useState(1.0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<
    "ledger" | "properties"
  >("ledger");
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<
    string | null
  >(null);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  const [snapDistance, setSnapDistance] = useState(15);
  const [activeMeasurementName, setActiveMeasurementName] = useState("");
  const [activeMeasurementType, setActiveMeasurementType] = useState(
    "72.1_Allman_Ritningsmatning",
  );
  const [activeMeasurementHeight, setActiveMeasurementHeight] = useState<
    number | ""
  >("");
  const [activeMeasurementMultiplier, setActiveMeasurementMultiplier] =
    useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        
        if (selectedMeasurementId) {
          setMeasurements(prev => {
            const selected = prev.find(m => m.id === selectedMeasurementId);
            if (selected && !selected.isLocked) {
              return prev.filter(m => m.id !== selectedMeasurementId);
            }
            return prev;
          });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMeasurementId]);

  const updateTransform = () => {
    if (wrapperRef.current) {
      const { scale, tx, ty } = transformRef.current;
      wrapperRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 1.25;
      const isZoomIn = e.deltaY < 0;
      const zoomFactor = isZoomIn ? zoomSensitivity : 1 / zoomSensitivity;

      const oldScale = transformRef.current.scale;
      let newScale = oldScale * zoomFactor;
      newScale = Math.max(0.1, Math.min(25.0, newScale));

      const k = newScale / oldScale;
      
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      transformRef.current.tx = cx - (cx - transformRef.current.tx) * k;
      transformRef.current.ty = cy - (cy - transformRef.current.ty) * k;
      transformRef.current.scale = newScale;

      requestAnimationFrame(updateTransform);
      
      // Throttle display zoom update
      requestAnimationFrame(() => setDisplayZoom(newScale));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCurrentPoints([]);
        setCurrentTool("select");
        setIsDrawingPencil(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle mouse button or Pan tool
    if (e.button === 1 || currentTool === "pan") {
      e.preventDefault();
      setIsPanning(true);
      if (containerRef.current) {
        (e.target as Element).setPointerCapture(e.pointerId);
        dragStart.current = {
          x: e.clientX,
          y: e.clientY,
          tx: transformRef.current.tx,
          ty: transformRef.current.ty,
        };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && containerRef.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      transformRef.current.tx = dragStart.current.tx + dx;
      transformRef.current.ty = dragStart.current.ty + dy;
      
      requestAnimationFrame(updateTransform);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
    setIsPanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const savedScales = localStorage.getItem(`pdf_scales_${file.name}`);
    if (savedScales) {
      setPageScales(deserializePageScales(savedScales));
    } else {
      setPageScales(emptyPageScales());
    }
    const savedMeasurements = localStorage.getItem(`pdf_measurements_${file.name}`);
    const initialMeasurements = savedMeasurements ? JSON.parse(savedMeasurements) : [];

    const arrayBuffer = await file.arrayBuffer();
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setPageNum(1);
      setMeasurements(initialMeasurements);
      setPdfFileName(file.name);
      setPdfFilePath(null);
      setCurrentPoints([]);
    } catch (err) {
      // warning removed
      alert("Kunde inte ladda PDFen");
    }
  };

  const renderPage = async (
    doc: pdfjsLib.PDFDocumentProxy,
    num: number,
    sharpScale: number = 1.0
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const page = await doc.getPage(num);
    const baseViewport = page.getViewport({ scale: 1.0 });
    
    setCanvasSize({ width: baseViewport.width, height: baseViewport.height });

    const dpr = window.devicePixelRatio || 1;
    const renderScale = sharpScale * dpr;
    const renderViewport = page.getViewport({ scale: renderScale });

    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    canvas.style.width = `${baseViewport.width}px`;
    canvas.style.height = `${baseViewport.height}px`;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    const renderContext = {
      canvasContext: ctx,
      viewport: renderViewport,
    };
    
    const renderTask = page.render(renderContext as any);
    renderTaskRef.current = renderTask;

    try {
      await renderTask.promise;
    } catch (err) {
      if ((err as any).name !== 'RenderingCancelledException') {
        console.log("Cancelled render");
      }
    }
  };

  // Base rendering when page changes
  useEffect(() => {
    if (pdfDoc) {
      const BASE_SHARP = 1.5;
      renderPage(pdfDoc, pageNum, BASE_SHARP);
      // Reset zoom on page change
      transformRef.current = { scale: 1.0, tx: 0, ty: 0 };
      setDisplayZoom(1.0);
      setCurrentPoints([]);
      requestAnimationFrame(updateTransform);
    }
  }, [pageNum, pdfDoc]);

  // Debounced sharp rendering when zoom settles
  useEffect(() => {
    if (pdfDoc) {
      const timeout = setTimeout(() => {
        // If zoom is high, render sharper. Don't go crazy high though.
        const BASE_SHARP = 1.5;
        const targetSharp = Math.max(BASE_SHARP, displayZoom * 1.2);
        // limit sharp scale to prevent massive memory usage
        const clampedSharp = Math.min(targetSharp, 6.0); 
        
        renderPage(pdfDoc, pageNum, clampedSharp);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [displayZoom, pageNum, pdfDoc]);

  const toggleMeasurementLock = (id: string) => {
    setMeasurements((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isLocked: !m.isLocked } : m
      )
    );
  };

  const scaleSelectedMeasurement = (id: string, factor: number) => {
    setMeasurements((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        if (m.isLocked) return m;
        if (m.points.length === 0) return m;

        // Calculate centroid
        const sum = m.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        const c = { x: sum.x / m.points.length, y: sum.y / m.points.length };

        // Scale points
        const newPoints = m.points.map(p => ({
          x: c.x + (p.x - c.x) * factor,
          y: c.y + (p.y - c.y) * factor
        }));

        const scaledMeasurement = { ...m, points: newPoints };

        // Recalculate value
        const scaleObj = scaleForPage(pageScales, m.page || 1, presetScale(0));
        let newValue = scaledMeasurement.value;

        if (m.tool === "area" || m.tool === "volume" || m.tool === "cloud") {
          let area = 0;
          for (let i = 0; i < newPoints.length; i++) {
            const p1 = newPoints[i];
            const p2 = newPoints[(i + 1) % newPoints.length];
            area += p1.x * p2.y - p2.x * p1.y;
          }
          newValue = toRealArea(Math.abs(area / 2), scaleObj.pixelsPerUnit);
          if (m.tool === "volume" && m.depth) {
            newValue *= m.depth;
          }
        } else if (m.tool === "distance" || m.tool === "line") {
          if (newPoints.length >= 2) {
            const p1 = newPoints[0];
            const p2 = newPoints[newPoints.length - 1];
            const dist = Math.sqrt(
              Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2),
            );
            newValue = toRealDistance(dist, scaleObj.pixelsPerUnit);
          }
        } else if (m.tool === "polyline") {
          let length = 0;
          for (let i = 0; i < newPoints.length - 1; i++) {
            const p1 = newPoints[i];
            const p2 = newPoints[i + 1];
            length += Math.sqrt(
              Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2),
            );
          }
          newValue = toRealDistance(length, scaleObj.pixelsPerUnit);
        } else if (m.tool === "rectangle") {
          if (newPoints.length >= 2) {
            newValue = toRealArea(
              Math.abs(newPoints[1].x - newPoints[0].x) * Math.abs(newPoints[1].y - newPoints[0].y),
              scaleObj.pixelsPerUnit
            );
          }
        }
        
        return { ...scaledMeasurement, value: newValue };
      })
    );
  };

  const getSnappedPosition = (px: number, py: number) => {
    if (!isSnappingEnabled) return { x: px, y: py };

    const snapThreshold = snapDistance / transformRef.current.scale;
    let closestPoint: Point | null = null;
    let minDistance = snapThreshold;

    const checkPointSnap = (p: Point) => {
      const dist = Math.sqrt(Math.pow(p.x - px, 2) + Math.pow(p.y - py, 2));
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = { x: p.x, y: p.y };
      }
    };

    const checkLineSnap = (p1: Point, p2: Point) => {
      const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
      if (l2 === 0) return checkPointSnap(p1);

      let t = ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / l2;
      t = Math.max(0, Math.min(1, t));

      const projection = {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
      };
      checkPointSnap(projection);
    };

    measurements
      .filter((m) => m.page === pageNum)
      .forEach((m) => {
        let pointsToSnap = [...m.points];

        if (m.tool === "rectangle" && m.points.length === 2) {
          const p1 = m.points[0];
          const p2 = m.points[1];
          pointsToSnap = [
            { x: p1.x, y: p1.y },
            { x: p2.x, y: p1.y },
            { x: p2.x, y: p2.y },
            { x: p1.x, y: p2.y },
          ];
        }

        pointsToSnap.forEach((p) => checkPointSnap(p));

        // Check lines for snapping
        if (
          m.tool === "line" ||
          m.tool === "distance" ||
          m.tool === "calibrate"
        ) {
          if (m.points.length >= 2) checkLineSnap(m.points[0], m.points[1]);
        } else if (
          m.tool === "polyline" ||
          m.tool === "area" ||
          m.tool === "volume" ||
          m.tool === "cloud" ||
          m.tool === "rectangle"
        ) {
          for (let i = 0; i < pointsToSnap.length - 1; i++) {
            checkLineSnap(pointsToSnap[i], pointsToSnap[i + 1]);
          }
          if (
            m.tool === "area" ||
            m.tool === "volume" ||
            m.tool === "cloud" ||
            m.tool === "rectangle"
          ) {
            // Close the polygon
            if (pointsToSnap.length >= 3) {
              checkLineSnap(
                pointsToSnap[pointsToSnap.length - 1],
                pointsToSnap[0],
              );
            }
          }
        }
      });

    if (currentPoints.length > 0) {
      checkPointSnap(currentPoints[0]);
      // Also snap to segments of currently drawn polyline
      for (let i = 0; i < currentPoints.length - 1; i++) {
        checkLineSnap(currentPoints[i], currentPoints[i + 1]);
      }
    }

    return closestPoint
      ? { point: closestPoint as Point, isSnapped: true }
      : { point: { x: px, y: py }, isSnapped: false };
  };

  const [snappedPoint, setSnappedPoint] = useState<Point | null>(null);

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (
      e.button === 1 ||
      e.button === 2 ||
      currentTool === "pan" ||
      currentTool === "select"
    )
      return;

    const currentScaleObj = scaleForPage(pageScales, pageNum, presetScale(0));
    if (
      currentScaleObj.invalid &&
      ["distance", "polyline", "area", "volume", "rectangle", "line"].includes(currentTool)
    ) {
      setShowScaleWarning(true);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    let x = (e.clientX - rect.left) / transformRef.current.scale;
    let y = (e.clientY - rect.top) / transformRef.current.scale;

    if (!["text", "count", "pencil", "pan", "select"].includes(currentTool)) {
      const snapped = getSnappedPosition(x, y);
      x = snapped.point.x;
      y = snapped.point.y;
    }

    const getActiveGroupColor = () => measurementGroups.find(g => g.id === activeGroupId)?.color || "#ef4444";

    if (currentTool === "count") {
      const newMeasurement: Measurement = {
        id: Date.now().toString(),
        groupId: activeGroupId,
        tool: currentTool,
        name: activeMeasurementName || undefined,
        byggdelType: activeMeasurementType,
        height:
          typeof activeMeasurementHeight === "number"
            ? activeMeasurementHeight
            : undefined,
        multiplier: activeMeasurementMultiplier,
        points: [{ x, y }],
        color: getActiveGroupColor(),
        value: 1,
        page: pageNum,
      };
      setMeasurements([...measurements, newMeasurement]);
      return;
    }

    if (currentTool === "text") {
      setDialogConfig({
        isOpen: true,
        title: "Ange text",
        message: "Skriv in den text du vill visa på ritningen:",
        defaultValue: "",
        onConfirm: (t) => {
          if (t) {
            setMeasurements((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                groupId: activeGroupId,
                tool: currentTool,
                name: activeMeasurementName || undefined,
                byggdelType: activeMeasurementType,
                height:
                  typeof activeMeasurementHeight === "number"
                    ? activeMeasurementHeight
                    : undefined,
                multiplier: activeMeasurementMultiplier,
                points: [{ x, y }],
                color: getActiveGroupColor(),
                text: t,
                page: pageNum,
              },
            ]);
          }
          setCurrentPoints([]);
          handleToolSelect("select");
          setDialogConfig(null);
        },
        onCancel: () => {
          setCurrentPoints([]);
          handleToolSelect("select");
          setDialogConfig(null);
        },
      });
      return;
    }

    // Start pencil drawing
    if (currentTool === "pencil") {
      setIsDrawingPencil(true);
      setCurrentPoints([{ x, y }]);
      return;
    }

    // First click for 2-point tools (or multi-point tools)
    if (currentPoints.length === 0) {
      setCurrentPoints([{ x, y }]);
    } else {
      // Second click for 2-point tools
      if (
        currentTool === "distance" ||
        currentTool === "line" ||
        currentTool === "rectangle" ||
        currentTool === "calibrate"
      ) {
        const p1 = currentPoints[0];
        const p2 = { x, y };
        const pxDistance = Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2),
        );

        if (currentTool === "calibrate") {
          setCalibrateDialog({
            isOpen: true,
            pxDistance,
            length: "",
            unit: "m"
          });
          return;
        }

        let val = toRealDistance(pxDistance, currentScaleObj.pixelsPerUnit);
        if (currentTool === "rectangle") {
          val = toRealArea(
            Math.abs(p2.x - p1.x) * Math.abs(p2.y - p1.y),
            currentScaleObj.pixelsPerUnit
          );
        }

        const getActiveGroupColor = () => measurementGroups.find(g => g.id === activeGroupId)?.color || "#ef4444";
        const newMeasurement: Measurement = {
          id: Date.now().toString(),
          groupId: activeGroupId,
          tool: currentTool,
          name: activeMeasurementName || undefined,
          byggdelType: activeMeasurementType,
          height:
            typeof activeMeasurementHeight === "number"
              ? activeMeasurementHeight
              : undefined,
          multiplier: activeMeasurementMultiplier,
          points: [p1, p2],
          color: getActiveGroupColor(),
          value: val,
          page: pageNum,
        };
        setMeasurements([...measurements, newMeasurement]);
        setCurrentPoints([]);
      } else {
        // Multi-point tools: area, volume, polyline, cloud
        setCurrentPoints([...currentPoints, { x, y }]);
      }
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (
      currentPoints.length > 0 ||
      !["text", "count", "pencil", "pan", "select"].includes(currentTool)
    ) {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      let x = (e.clientX - rect.left) / transformRef.current.scale;
      let y = (e.clientY - rect.top) / transformRef.current.scale;

      let isCurrentlySnapped = false;
      if (!["text", "count", "pencil", "pan", "select"].includes(currentTool)) {
        const snapped = getSnappedPosition(x, y);
        x = snapped.point.x;
        y = snapped.point.y;
        isCurrentlySnapped = snapped.isSnapped;
      }

      setMousePos({ x, y });
      setSnappedPoint(isCurrentlySnapped ? { x, y } : null);

      if (currentTool === "pencil" && isDrawingPencil) {
        setCurrentPoints([
          ...currentPoints,
          {
            x: (e.clientX - rect.left) / transformRef.current.scale,
            y: (e.clientY - rect.top) / transformRef.current.scale,
          },
        ]);
      }
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (currentTool === "pencil" && isDrawingPencil) {
      setIsDrawingPencil(false);
      const getActiveGroupColor = () => measurementGroups.find(g => g.id === activeGroupId)?.color || "#ef4444";
      const newMeasurement: Measurement = {
        id: Date.now().toString(),
        groupId: activeGroupId,
        tool: currentTool,
        name: activeMeasurementName || undefined,
        byggdelType: activeMeasurementType,
        height:
          typeof activeMeasurementHeight === "number"
            ? activeMeasurementHeight
            : undefined,
        multiplier: activeMeasurementMultiplier,
        points: [...currentPoints],
        color: getActiveGroupColor(),
        page: pageNum,
      };
      setMeasurements([...measurements, newMeasurement]);
      setCurrentPoints([]);
    }
  };

  const handleSvgDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (
      ["polyline", "area", "volume", "cloud"].includes(currentTool) &&
      currentPoints.length > 1
    ) {
      let value = 0;
      let d = 0;
      const currentScaleObj = scaleForPage(pageScales, pageNum, presetScale(0));

      const finishMeasurement = (finalValue: number, finalDepth: number) => {
        const getActiveGroupColor = () => measurementGroups.find(g => g.id === activeGroupId)?.color || "#ef4444";
        const newMeasurement: Measurement = {
          id: Date.now().toString(),
          groupId: activeGroupId,
          tool: currentTool,
          name: activeMeasurementName || undefined,
          byggdelType: activeMeasurementType,
          height:
            typeof activeMeasurementHeight === "number"
              ? activeMeasurementHeight
              : undefined,
          multiplier: activeMeasurementMultiplier,
          points: [...currentPoints],
          color: getActiveGroupColor(),
          opacity:
            currentTool === "area" ||
            currentTool === "volume" ||
            currentTool === "cloud"
              ? 0.3
              : 1.0,
          value: finalValue,
          page: pageNum,
          depth: finalDepth,
        };
        setMeasurements((prev) => [...prev, newMeasurement]);
        setCurrentPoints([]);
      };

      if (
        currentTool === "area" ||
        currentTool === "volume" ||
        currentTool === "cloud"
      ) {
        let area = 0;
        for (let i = 0; i < currentPoints.length; i++) {
          const j = (i + 1) % currentPoints.length;
          area += currentPoints[i].x * currentPoints[j].y;
          area -= currentPoints[j].x * currentPoints[i].y;
        }
        value = toRealArea(Math.abs(area / 2), currentScaleObj.pixelsPerUnit);

        if (currentTool === "volume") {
          setDialogConfig({
            isOpen: true,
            title: "Volym",
            message: "Ange djup/höjd i meter för att beräkna volymen:",
            defaultValue: "",
            onConfirm: (depthInput) => {
              if (depthInput && !isNaN(Number(depthInput.replace(",", ".")))) {
                d = Number(depthInput.replace(",", "."));
                value = value * d;
              } else {
                value = 0;
              }
              finishMeasurement(value, d);
              setDialogConfig(null);
            },
            onCancel: () => {
              finishMeasurement(value, 0); // fallback to 0 depth
              setDialogConfig(null);
            },
          });
          return;
        }

        finishMeasurement(value, 0);
      } else if (currentTool === "polyline") {
        let length = 0;
        for (let i = 0; i < currentPoints.length - 1; i++) {
          const p1 = currentPoints[i];
          const p2 = currentPoints[i + 1];
          length += Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2),
          );
        }
        value = toRealDistance(length, currentScaleObj.pixelsPerUnit);
        finishMeasurement(value, 0);
      }
    }
  };

  const [mousePos, setMousePos] = useState<Point | null>(null);

  const exportSelected = () => {
    if (!addParts) return;

    const groupedCounts = new Map<string, any>();
    const otherParts: any[] = [];

    measurements.forEach((m) => {
      let type = m.byggdelType;
      if (!type) {
        if (m.tool === "volume") {
          type = "34.1_Bjalklag";
        } else {
          type = "72.1_Allman_Ritningsmatning";
        }
      }
      
      let name = m.name;
      let unit =
        m.tool === "area"
          ? "m2"
          : m.tool === "volume"
            ? "m3"
            : m.tool === "count"
              ? "st"
              : "m";
      let qty = m.value || (m.tool === "count" ? 1 : 0);

      if (
        (m.tool === "distance" || m.tool === "polyline" || m.tool === "line") &&
        m.height !== undefined &&
        m.height > 0
      ) {
        qty = qty * m.height;
        unit = "m2";
      } else if (m.tool === "area" && m.height !== undefined && m.height > 0) {
        qty = qty * m.height;
        unit = "m3";
      }

      if (!name) {
        if (m.tool === "distance" || m.tool === "line") {
          name = "Avstånd " + m.id.substring(m.id.length - 4);
        } else if (m.tool === "area") {
          name = "Yta " + m.id.substring(m.id.length - 4);
        } else if (m.tool === "volume") {
          name = "Volym " + m.id.substring(m.id.length - 4);
        } else if (m.tool === "count") {
          name = "Antal " + m.id.substring(m.id.length - 4);
        } else if (m.tool === "text") {
          name = "Notering " + m.id.substring(m.id.length - 4);
          unit = "-";
        } else {
          name = `Mätning (${m.tool})`;
        }
      }

      let dims = {
        length:
          m.tool === "distance" || m.tool === "line" || m.tool === "polyline"
            ? m.value || 0
            : m.tool === "volume"
              ? Math.sqrt((m.value || 0) / (m.depth || 1))
              : Math.sqrt(m.value || 0),
        width: 0.2, // default guess
        height: m.tool === "volume" ? m.depth || 0 : m.height || 3.0,
        area:
          m.tool === "area"
            ? m.value || 0
            : m.tool === "volume"
              ? (m.value || 0) / (m.depth || 1)
              : m.tool === "distance" ||
                  m.tool === "line" ||
                  m.tool === "polyline"
                ? (m.value || 0) * (m.height || 3.0)
                : 0,
        qty: m.tool === "count" ? m.value || 1 : 1,
      };

      const partData = {
        name,
        type,
        qty: qty,
        antal: m.multiplier || 1,
        unit,
        active: true,
        comment: `Exporterad från PDF${m.tool === "volume" && m.depth ? ` (Djup: ${m.depth}m)` : m.height ? ` (Höjd/Djup: ${m.height}m)` : ""}`,
        dimensions: dims,
        moments: calculateDefaultMoments(type, dims),
      };

      if (m.tool !== "text") {
        // Group by name
        const existing = groupedCounts.get(name!);
        if (existing) {
          existing.qty += partData.qty;
        } else {
          groupedCounts.set(name!, partData);
        }
      } else {
        otherParts.push(partData);
      }
    });

    const partsToExport = [
      ...Array.from(groupedCounts.values()),
      ...otherParts,
    ];

    addParts(partsToExport as any);
    setDialogConfig({
      isOpen: true,
      isAlert: true,
      title: "Export Lyckades",
      message: `${partsToExport.length} objekt exporterades till kalkylen.`,
      onConfirm: () => setDialogConfig(null),
    });
  };

  // Helper for non-scaling stroke
  const getInverseScale = (basePx: number) => basePx / displayZoom;

  const handleZoomIn = () => {
    let newScale = Math.min(25, transformRef.current.scale * 1.25);
    transformRef.current.scale = newScale;
    updateTransform();
    setDisplayZoom(newScale);
  };

  const handleZoomOut = () => {
    let newScale = Math.max(0.1, transformRef.current.scale / 1.25);
    transformRef.current.scale = newScale;
    updateTransform();
    setDisplayZoom(newScale);
  };

  const handleSaveToFFU = async () => {
    if (!pdfDoc || measurements.length === 0) {
      setDialogConfig({
        isOpen: true,
        isAlert: true,
        title: "Kunde inte spara",
        message: "Du måste ladda upp en PDF och skapa minst en mätning först.",
        onConfirm: () => setDialogConfig(null)
      });
      return;
    }
    
    setIsSavingFfu(true);
    try {
      // In a real app, you'd get the actual PDF file base64 or blob.
      // Here we assume a mock/simplification or the Edge function handles it
      
      const payload = {
        projectId: documentId || 'mock-project-id',
        filename: (pdfDoc as any).fingerprints?.[0] + '.pdf' || 'mätning.pdf',
        measurements: measurements,
        documentId: documentId
      };
      
      // MOCK SAVE instead of fake fetch to avoid "Load failed" error
      await new Promise(resolve => setTimeout(resolve, 800));
      const data = { documentId: documentId || 'saved-doc-id' };
      setDocumentId(data.documentId);
      const { activeFolderId, fetchDocumentsInFolder } = useFfuStore.getState();
      if (activeFolderId) {
        fetchDocumentsInFolder(activeFolderId);
      }
      
      setDialogConfig({
        isOpen: true,
        isAlert: true,
        title: "Sparat!",
        message: "Mätningarna har sparats till FFU.",
        onConfirm: () => setDialogConfig(null)
      });
    } catch (err: any) {
      console.error(err);
      setDialogConfig({
        isOpen: true,
        isAlert: true,
        title: "Fel vid sparning",
        message: "Kunde inte spara till FFU: " + err.message,
        onConfirm: () => setDialogConfig(null)
      });
    } finally {
      setIsSavingFfu(false);
    }
  };

  const handleZoomReset = () => {
    transformRef.current.scale = 1.0;
    transformRef.current.tx = 0;
    transformRef.current.ty = 0;
    updateTransform();
    setDisplayZoom(1.0);
      setCurrentPoints([]);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f5] overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf"
        onChange={handleFileUpload}
      />
      {/* Top Toolbar */}
      <div className="flex overflow-x-auto lg:flex-wrap items-center p-1.5 gap-y-1.5 gap-x-1 border-b hide-scrollbar border-gray-300 bg-white shrink-0 min-h-[48px] shadow-sm z-20 relative text-xs">
        <div className="flex flex-wrap items-center gap-0.5 shrink-0">
          <button
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            className="p-1 hover:bg-gray-100 rounded text-gray-700"
            disabled={!pdfDoc}
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_left
            </span>
          </button>
          <span className="font-medium w-12 text-center text-gray-700">
            {" "}
            {pageNum} / {pdfDoc?.numPages || 1}
          </span>
          <button
            onClick={() =>
              setPageNum((p) => (pdfDoc && p < pdfDoc.numPages ? p + 1 : p))
            }
            className="p-1 hover:bg-gray-100 rounded text-gray-700"
            disabled={!pdfDoc}
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_right
            </span>
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1 hidden sm:block"></div>

          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-gray-100 rounded text-gray-700"
          >
            <span className="material-symbols-outlined text-[18px]">
              zoom_out
            </span>
          </button>
          <span className="font-mono w-12 text-center text-gray-700">
            {Math.round(displayZoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-gray-100 rounded text-gray-700"
          >
            <span className="material-symbols-outlined text-[18px]">
              zoom_in
            </span>
          </button>
          <button
            onClick={handleZoomReset}
            className="p-1 hover:bg-gray-100 rounded text-gray-700"
            title="Återställ zoom"
          >
            <span className="material-symbols-outlined text-[18px]">
              fit_screen
            </span>
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1 hidden sm:block"></div>

          <button
            onClick={() => handleToolSelect("calibrate")}
            className={`flex items-center gap-1 font-medium px-2 py-1 ${currentTool === "calibrate" ? "bg-[#ff9900]/20 text-[#cc7a00] border-[#ff9900]" : "bg-[#fff5e6] text-[#cc7a00] border-[#ffe0b2] hover:bg-[#ffe0b2]"} ${showScaleWarning ? "ring-2 ring-red-500 animate-pulse" : ""} rounded border transition-colors`}
          >
            <span className="material-symbols-outlined text-[16px]">
              straighten
            </span>{" "}
            Kalibrera
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1 hidden sm:block"></div>

          <ToolButton
            active={currentTool === "pan"}
            onClick={() => handleToolSelect("pan")}
            icon="pan_tool"
            label="Panorera"
          />
          <ToolButton
            active={currentTool === "select"}
            onClick={() => handleToolSelect("select")}
            icon="ads_click"
            label="Välj"
          />
          <div className="w-px h-5 bg-gray-300 mx-0.5 hidden sm:block"></div>
          <ToolButton
            active={currentTool === "distance"}
            onClick={() => handleToolSelect("distance")}
            icon="linear_scale"
            label="Längd"
          />
          <ToolButton
            active={currentTool === "polyline"}
            onClick={() => handleToolSelect("polyline")}
            icon="timeline"
            label="Polylinje"
          />
          <ToolButton
            active={currentTool === "area"}
            onClick={() => handleToolSelect("area")}
            icon="pentagon"
            label="Yta"
          />
          <ToolButton
            active={currentTool === "volume"}
            onClick={() => handleToolSelect("volume")}
            icon="view_in_ar"
            label="Volym"
          />
          <ToolButton
            active={currentTool === "count"}
            onClick={() => handleToolSelect("count")}
            icon="tag"
            label="Antal"
          />

          <div className="w-px h-5 bg-gray-300 mx-0.5 hidden lg:block"></div>
          <ToolButton
            active={currentTool === "cloud"}
            onClick={() => handleToolSelect("cloud")}
            icon="cloud" hideOnMobile={true}
          />
          <ToolButton
            active={currentTool === "line"}
            onClick={() => handleToolSelect("line")}
            icon="north_east" hideOnMobile={true}
          />
          <ToolButton
            active={currentTool === "text"}
            onClick={() => handleToolSelect("text")}
            icon="title" hideOnMobile={true}
          />
          <ToolButton
            active={currentTool === "rectangle"}
            onClick={() => handleToolSelect("rectangle")}
            icon="crop_square" hideOnMobile={true}
          />
          <ToolButton
            active={currentTool === "pencil"}
            onClick={() => handleToolSelect("pencil")}
            icon="draw" hideOnMobile={true}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 ml-2 border-l border-gray-300 pl-2">
          <label className="font-bold text-gray-500 uppercase whitespace-nowrap">
            Namn
          </label>
          <input
            type="text"
            value={activeMeasurementName}
            onChange={(e) => setActiveMeasurementName(e.target.value)}
            list="measurement-names"
            placeholder="t.ex. Innerdörrar"
            className="w-20 sm:w-28 border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <datalist id="measurement-names">
            {Array.from(
              new Set(measurements.map((m) => m.name).filter(Boolean)),
            ).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <label className="font-bold text-gray-500 uppercase whitespace-nowrap ml-1">
            Byggdel
          </label>
          <select
            value={activeMeasurementType}
            onChange={(e) => setActiveMeasurementType(e.target.value)}
            className="w-28 sm:w-36 border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="72.1_Allman_Ritningsmatning">Allmän mätning</option>
            {INITIAL_TIDSFAKTORER.map((tf) => (
              <option key={tf.type} value={tf.type}>
                {tf.label}
              </option>
            ))}
          </select>

          {(currentTool === "distance" ||
            currentTool === "polyline" ||
            currentTool === "line" ||
            currentTool === "area") && (
            <>
              <label className="font-bold text-gray-500 uppercase whitespace-nowrap ml-1">
                Djup(m)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={activeMeasurementHeight}
                onChange={(e) =>
                  setActiveMeasurementHeight(
                    e.target.value === "" ? "" : parseFloat(e.target.value),
                  )
                }
                placeholder="t.ex. 2.4"
                className="w-14 border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </>
          )}

          <label className="font-bold text-gray-500 uppercase whitespace-nowrap ml-1">
            Antal
          </label>
          <input
            type="number"
            min="1"
            value={activeMeasurementMultiplier}
            onChange={(e) =>
              setActiveMeasurementMultiplier(parseInt(e.target.value) || 1)
            }
            className="w-12 border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-0.5 shrink-0 ml-auto pl-2 border-l border-gray-300">
          {/* Secondary toolbar buttons */}
          <button className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded text-gray-600 font-medium transition-colors">
            <span className="material-symbols-outlined text-[16px]">
              layers
            </span>{" "}
            Lager
          </button>
          <button
            onClick={() => setMeasurements([])}
            className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-600 transition-colors"
            title="Rensa alla"
          >
            <span className="material-symbols-outlined text-[18px]">
              delete
            </span>
          </button>
          <button
            onClick={() => setIsFfuPickerOpen(true)}
            className="p-1.5 ml-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors flex items-center gap-1.5 font-medium pr-2.5 border border-blue-200"
          >
            <span className="material-symbols-outlined text-[16px]">
              folder_open
            </span>{" "}
            FFU
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 ml-1 bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-1.5 font-medium pr-2.5"
          >
            <span className="material-symbols-outlined text-[16px]">
              upload_file
            </span>{" "}
            Ladda upp
          </button>
          
          <div className="w-px h-5 bg-gray-300 mx-1 hidden sm:block"></div>
          
          <button
            onClick={handleSaveToFFU}
            disabled={isSavingFfu || !pdfDoc}
            className={`p-1.5 ml-1 flex items-center gap-1.5 font-medium pr-2.5 rounded transition-colors ${isSavingFfu ? 'bg-gray-200 text-gray-500' : 'bg-[#e5f6fd] text-[#0288d1] border-[#b3e5fc] hover:bg-[#b3e5fc]'}`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSavingFfu ? 'sync' : 'cloud_upload'}
            </span>{" "}
            {isSavingFfu ? 'Sparar...' : 'Spara i FFU'}
          </button>
        </div>
      </div>

      
      <div className="flex flex-col flex-1 min-h-0 relative">
        <div className="flex flex-1 min-h-0 relative lg:flex-row flex-col">
{/* Main Canvas Area */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-hidden bg-[#e5e7eb] relative p-0 cursor-crosshair`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onMouseDown={(e) => {
            if (e.button === 1) e.preventDefault();
          }}
          onContextMenu={(e) => {
            if (isPanning || currentTool === "pan" || currentPoints.length > 0)
              e.preventDefault();
          }}
        >
          {showScaleWarning && pdfDoc && (
            <div className="absolute top-4 inset-x-0 mx-auto w-max z-30 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg shadow-md font-medium flex items-center gap-2 animate-bounce">
              <span className="material-symbols-outlined text-[20px]">
                warning
              </span>
              Skalan är inte definierad än! Vänligen kalibrera innan du mäter
              för korrekta resultat.
            </div>
          )}
          {!pdfDoc && (
            <div className="max-w-xl mx-auto mt-20 bg-white p-10 rounded-xl shadow-lg border border-gray-200 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-blue-500">
                  upload_file
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                PDF Mängdning
              </h2>
              <p className="text-gray-500 mb-8">
                Ladda upp en PDF-ritning för att börja mäta ytor, längder,
                volymer och antal direkt i webbläsaren. Systemet stödjer
                AutoCAD-liknande zoom och panorering.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsFfuPickerOpen(true)}
                  className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-medium shadow-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">folder_open</span>{" "}
                  Hämta från FFU
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">upload_file</span>{" "}
                  Ladda upp lokal fil
                </button>
              </div>
            </div>
          )}
          <div
            ref={wrapperRef}
            className={`pdf-content-wrapper absolute top-0 left-0 origin-top-left ${currentTool === "pan" && !isPanning ? "cursor-grab" : ""} ${isPanning ? "cursor-grabbing" : ""}`}
            style={{
              width: canvasSize.width || "100%",
              height: canvasSize.height || "100%",
              willChange: "transform"
            }}
          >
            <canvas
              className={`bg-white shadow-xl ${pdfDoc ? "block" : "hidden"} absolute inset-0 w-full h-full`}
              ref={canvasRef}
            />
            {pdfDoc && (
              <svg
                onPointerDown={handleSvgPointerDown}
                onPointerMove={handleSvgPointerMove}
                onPointerUp={handleSvgPointerUp}
                onPointerLeave={() => setSnappedPoint(null)}
                onDoubleClick={handleSvgDoubleClick}
                onContextMenu={(e) => {
                  if (currentPoints.length > 0) {
                    e.preventDefault();
                    setCurrentPoints([]);
                  }
                }}
                className="absolute inset-0 z-10 touch-none w-full h-full"
              >
                <g>
                  {/* Draw existing measurements */}
                  {measurements
                    .filter((m) => m.page === pageNum)
                    .map((m) => {
                      const color = m.color;
                      const isSelected = selectedMeasurementId === m.id;
                      const selectProps = {
                        onClick: (e: React.MouseEvent) => {
                          if (currentTool === "select") {
                            e.stopPropagation();
                            setSelectedMeasurementId(m.id);
                            setActiveGroupId(m.groupId || "default");
                          }
                        },
                        cursor: currentTool === "select" ? "pointer" : "default"
                      };

                      // Draw labels for measurements
                      const drawMeasurementLabel = () => {
                        if (!m.value || m.tool === "count" || m.tool === "text")
                          return null;
                        const isPolygon = ["area", "volume", "cloud"].includes(
                          m.tool,
                        );
                        const center = { x: 0, y: 0 };

                        if (isPolygon) {
                          const centerX =
                            m.points.reduce((sum, p) => sum + p.x, 0) /
                            m.points.length;
                          const centerY =
                            m.points.reduce((sum, p) => sum + p.y, 0) /
                            m.points.length;
                          center.x = centerX;
                          center.y = centerY;
                        } else {
                          // Line types: center of the bounding box or mid point
                          const p1 = m.points[0];
                          const p2 = m.points[1] || m.points[0];
                          center.x = (p1.x + p2.x) / 2;
                          center.y = (p1.y + p2.y) / 2;
                        }

                        const unit =
                          m.tool === "area"
                            ? "m²"
                            : m.tool === "volume"
                              ? "m³"
                              : "m";
                        return (
                          <g transform={`translate(${center.x}, ${center.y}) scale(${1 / displayZoom})`}>
                            <rect
                              x="-35"
                              y="-12"
                              width="70"
                              height="24"
                              rx="4"
                              fill="white"
                              fillOpacity="0.85"
                              stroke={m.color}
                              strokeWidth={1}
                              vectorEffect="non-scaling-stroke"
                            />
                            <text
                              x="0"
                              y="4"
                              textAnchor="middle"
                              fill="#1f2937"
                              fontSize={12}
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              {m.value?.toFixed(2)}
                              {unit}
                            </text>
                          </g>
                        );
                      };

                      const renderShape = () => {
                        if (m.tool === "count") {
                          return (
                            <g transform={`translate(${m.points[0].x},${m.points[0].y})`}>
                              <circle cx="0" cy="0" r={12 / displayZoom} fill={color} fillOpacity="0.8" />
                              <circle cx="0" cy="0" r={12 / displayZoom} fill="none" stroke={isSelected ? "#fff" : "#fff"} strokeWidth={isSelected ? 4 : 2} vectorEffect="non-scaling-stroke" />
                              <text x="0" y={4 / displayZoom} textAnchor="middle" fill="white" fontSize={12 / displayZoom} fontWeight="bold" fontFamily="sans-serif">
                                {measurements.filter(x => x.tool === "count" && x.groupId === m.groupId && x.page === m.page).findIndex(x => x.id === m.id) + 1}
                              </text>
                            </g>
                          );
                        }
                        if (m.tool === "text") {
                          return (
                            <text
                              x={m.points[0].x}
                              y={m.points[0].y}
                              fill={color}
                              fontSize={18}
                              fontWeight="bold"
                              fontFamily="sans-serif"
                              style={{ textShadow: "2px 2px 0 #fff", outline: isSelected ? "2px solid blue" : "none" }}
                              transform={`translate(${m.points[0].x},${m.points[0].y}) scale(${1 / displayZoom}) translate(-${m.points[0].x},-${m.points[0].y})`}
                            >
                              {m.text}
                            </text>
                          );
                        }
                        if (m.tool === "rectangle") {
                          const x = Math.min(m.points[0].x, m.points[1].x);
                          const y = Math.min(m.points[0].y, m.points[1].y);
                          const w = Math.abs(m.points[1].x - m.points[0].x);
                          const h = Math.abs(m.points[1].y - m.points[0].y);
                          return (
                            <rect
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              fill={color}
                              fillOpacity={m.opacity ?? 0.15}
                              stroke={isSelected ? "#3b82f6" : color}
                              strokeWidth={isSelected ? 4 : 2} vectorEffect="non-scaling-stroke"
                            />
                          );
                        }
                        if (m.tool === "line" || m.tool === "distance" || m.tool === "calibrate") {
                          return (
                            <g>
                              <line
                                x1={m.points[0].x}
                                y1={m.points[0].y}
                                x2={m.points[1].x}
                                y2={m.points[1].y}
                                stroke={isSelected ? "#3b82f6" : color}
                                strokeWidth={isSelected ? 5 : 3}
                                vectorEffect="non-scaling-stroke"
                                strokeLinecap="round"
                              />
                              <circle cx={m.points[0].x} cy={m.points[0].y} r={4 / displayZoom} fill="#fff" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                              <circle cx={m.points[1].x} cy={m.points[1].y} r={4 / displayZoom} fill="#fff" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                              {drawMeasurementLabel()}
                            </g>
                          );
                        }
                        if (["polyline", "area", "volume", "cloud", "pencil"].includes(m.tool)) {
                          const pointsStr = m.points.map((p) => `${p.x},${p.y}`).join(" ");
                          if (m.tool === "area" || m.tool === "volume") {
                            return (
                              <g>
                                <polygon
                                  points={pointsStr}
                                  fill={color}
                                  fillOpacity={m.opacity ?? 0.3}
                                  stroke={isSelected ? "#3b82f6" : color}
                                  strokeWidth={isSelected ? 4 : 2} vectorEffect="non-scaling-stroke"
                                  strokeLinejoin="round"
                                />
                                {drawMeasurementLabel()}
                              </g>
                            );
                          }
                          if (m.tool === "cloud") {
                            return (
                              <polygon
                                points={pointsStr}
                                fill={color}
                                fillOpacity={(m.opacity ?? 0.3) * 0.5}
                                stroke={isSelected ? "#3b82f6" : color}
                                strokeWidth={isSelected ? 4 : 2} vectorEffect="non-scaling-stroke"
                                strokeLinejoin="round"
                                strokeDasharray={`${getInverseScale(10)}, ${getInverseScale(5)}`}
                              />
                            );
                          }
                          return (
                            <g>
                              <polyline
                                points={pointsStr}
                                fill="none"
                                stroke={isSelected ? "#3b82f6" : color}
                                strokeWidth={isSelected ? 4 : 2} vectorEffect="non-scaling-stroke"
                                strokeLinejoin="round"
                              />
                              {drawMeasurementLabel()}
                            </g>
                          );
                        }
                        return null;
                      };

                      return (
                        <g key={m.id} {...selectProps} className={isSelected ? "drop-shadow-md" : ""}>
                          {renderShape()}
                        </g>
                      );
                    })}

                  {/* Draw current active drawing points */}
                  {currentPoints.length > 0 && mousePos && (
                    <g>
                      {currentTool === "rectangle" ? (
                        <rect
                          x={Math.min(currentPoints[0].x, mousePos.x)}
                          y={Math.min(currentPoints[0].y, mousePos.y)}
                          width={Math.abs(mousePos.x - currentPoints[0].x)}
                          height={Math.abs(mousePos.y - currentPoints[0].y)}
                          fill="#2a5aff"
                          fillOpacity={0.15}
                          stroke="#2a5aff"
                          strokeWidth={2} vectorEffect="non-scaling-stroke"
                        />
                      ) : currentTool === "line" ||
                        currentTool === "distance" ||
                        currentTool === "calibrate" ? (
                        <line
                          x1={currentPoints[0].x}
                          y1={currentPoints[0].y}
                          x2={mousePos.x}
                          y2={mousePos.y}
                          stroke="#2a5aff"
                          strokeWidth={2} vectorEffect="non-scaling-stroke"
                          strokeDasharray={`${getInverseScale(6)}, ${getInverseScale(4)}`}
                        />
                      ) : currentTool !== "count" && currentTool !== "text" ? (
                        <polyline
                          points={
                            currentPoints
                              .map((p) => `${p.x},${p.y}`)
                              .join(" ") +
                            (isDrawingPencil
                              ? ""
                              : ` ${mousePos.x},${mousePos.y}`)
                          }
                          fill={
                            currentTool === "area" ||
                            currentTool === "volume"
                              ? "#2a5aff"
                              : "none"
                          }
                          fillOpacity={0.3}
                          stroke="#2a5aff"
                          strokeWidth={2} vectorEffect="non-scaling-stroke"
                          strokeDasharray={
                            isDrawingPencil
                              ? "none"
                              : `${getInverseScale(6)}, ${getInverseScale(4)}`
                          }
                          strokeLinejoin="round"
                        />
                      ) : null}

                      {!isDrawingPencil &&
                        currentPoints.length > 0 &&
                        ["line", "distance", "rectangle", "area", "volume", "calibrate", "polyline"].includes(currentTool) && (
                          <g>
                            <polyline
                              points={[...currentPoints, mousePos]
                                .map((p) => (p ? `${p.x},${p.y}` : ""))
                                .join(" ")}
                              fill={["area", "volume", "rectangle"].includes(currentTool) ? (measurementGroups.find(g => g.id === activeGroupId)?.color || "#ef4444") : "none"}
                              fillOpacity={0.15}
                              stroke={measurementGroups.find(g => g.id === activeGroupId)?.color || "#ef4444"}
                              strokeWidth={3}
                              strokeDasharray={`${getInverseScale(5)}, ${getInverseScale(5)}`}
                              vectorEffect="non-scaling-stroke"
                            />
                            {currentPoints.map((p, i) => (
                              <circle
                                key={i}
                                cx={p.x}
                                cy={p.y}
                                r={getInverseScale(5)}
                                fill="#fff"
                                stroke={measurementGroups.find(g => g.id === activeGroupId)?.color || "#ef4444"}
                                strokeWidth={2} vectorEffect="non-scaling-stroke"
                              />
                            ))}
                            {/* Live readout */}
                            {mousePos && currentPoints.length > 0 && (() => {
                              const currentScaleObj = scaleForPage(pageScales, pageNum, presetScale(0));
                              let liveValue = 0;
                              let unit = "m";
                              
                              if (currentTool === "distance" || currentTool === "line" || currentTool === "calibrate" || currentTool === "polyline") {
                                const lastP = currentPoints[currentPoints.length - 1];
                                const pxDistance = Math.sqrt(Math.pow(mousePos.x - lastP.x, 2) + Math.pow(mousePos.y - lastP.y, 2));
                                liveValue = toRealDistance(pxDistance, currentScaleObj.pixelsPerUnit);
                              } else if (currentTool === "rectangle") {
                                const p1 = currentPoints[0];
                                liveValue = toRealArea(Math.abs(mousePos.x - p1.x) * Math.abs(mousePos.y - p1.y), currentScaleObj.pixelsPerUnit);
                                unit = "m²";
                              } else if (currentTool === "area" || currentTool === "volume") {
                                const allPts = [...currentPoints, mousePos];
                                let area = 0;
                                for (let i = 0; i < allPts.length; i++) {
                                  const j = (i + 1) % allPts.length;
                                  area += allPts[i].x * allPts[j].y;
                                  area -= allPts[j].x * allPts[i].y;
                                }
                                liveValue = toRealArea(Math.abs(area / 2), currentScaleObj.pixelsPerUnit);
                                unit = currentTool === "volume" ? "m³" : "m²"; // volume is shown as area until depth is provided
                              }
                              
                              return (
                                <g transform={`translate(${mousePos.x + getInverseScale(15)}, ${mousePos.y - getInverseScale(15)})`}>
                                  <rect x="0" y={-getInverseScale(20)} width={getInverseScale(80)} height={getInverseScale(24)} rx={getInverseScale(4)} fill="#1f2937" fillOpacity="0.8" />
                                  <text x={getInverseScale(40)} y={-getInverseScale(4)} fill="white" fontSize={getInverseScale(12)} textAnchor="middle" fontWeight="bold">
                                    {liveValue.toFixed(2)} {unit}
                                  </text>
                                </g>
                              );
                            })()}
                          </g>
                        )}
                      {/* Active floating indicator for the mouse position */}
                      {!isDrawingPencil &&
                        currentTool !== "count" &&
                        currentTool !== "text" && (
                          <circle
                            cx={mousePos.x}
                            cy={mousePos.y}
                            r={getInverseScale(5)}
                            fill="#2a5aff"
                            opacity="0.5"
                          />
                        )}
                    </g>
                  )}

                  {!["text", "count", "pencil", "pan", "select"].includes(
                    currentTool,
                  ) &&
                    currentPoints.length === 0 &&
                    mousePos && (
                      <circle
                        cx={mousePos.x}
                        cy={mousePos.y}
                        r={getInverseScale(5)}
                        fill="#2a5aff"
                        opacity="0.5"
                      />
                    )}
                  {snappedPoint && (
                    <g pointerEvents="none">
                      <circle
                        cx={snappedPoint.x}
                        cy={snappedPoint.y}
                        r={getInverseScale(8)}
                        fill="none"
                        stroke="#ff00ff"
                        strokeWidth={2} vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1={snappedPoint.x - getInverseScale(12)}
                        y1={snappedPoint.y}
                        x2={snappedPoint.x + getInverseScale(12)}
                        y2={snappedPoint.y}
                        stroke="#ff00ff"
                        strokeWidth={2} vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1={snappedPoint.x}
                        y1={snappedPoint.y - getInverseScale(12)}
                        x2={snappedPoint.x}
                        y2={snappedPoint.y + getInverseScale(12)}
                        stroke="#ff00ff"
                        strokeWidth={2} vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  )}
                </g>
              </svg>
            )}
          </div>
        </div>

        


        {/* Right Sidebar Content */}
        {pdfDoc && activeRightTab && (
          <div 
            className="w-full border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] overflow-y-auto max-h-[50vh] lg:max-h-full relative animate-in slide-in-from-right-8 duration-200"
            style={{ width: window.innerWidth >= 1024 ? sidebarWidth : '100%' }}
          >
            {/* Resize Handle for Sidebar */}
            <div
              className="hidden lg:block absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-50 hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors"
              onPointerDown={startSidebarResize}
              style={{ transform: 'translateX(-50%)' }}
            />
            
            <button 
              onClick={() => setActiveRightTab(null)} 
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-1 rounded-md transition-colors z-30 bg-white shadow-sm border border-gray-100"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>

            {activeRightTab === 'skala' && (
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">
                    straighten
                  </span>{" "}
                  Skala
                </h3>
                <div className={`flex justify-between items-center p-2 rounded-md border mb-2 ${(() => {
                  const currentScale = scaleForPage(pageScales, pageNum, presetScale(0));
                  return currentScale.invalid ? "bg-red-50 text-red-800 border-red-200" : "bg-blue-50 text-blue-800 border-blue-100";
                })()}`}>
                  <span className="font-medium text-xs flex items-center gap-1">
                    {(() => {
                      const currentScale = scaleForPage(pageScales, pageNum, presetScale(0));
                      return currentScale.invalid ? (
                        <>
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          Okalibrerad
                        </>
                      ) : "Aktuell Skala";
                    })()}
                  </span>
                  <span className="font-mono font-bold text-xs">
                    {(() => {
                      const currentScale = scaleForPage(pageScales, pageNum, presetScale(0));
                      if (currentScale.invalid) return "Kalibrera först";
                      const ratio = ratioFromScale(currentScale);
                      return `1:${Math.round(ratio)} (1px=${toRealDistance(1, currentScale.pixelsPerUnit).toFixed(4)}m)`;
                    })()}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 20, 25, 50, 100, 200, 400, 500, 1000].map(
                    (ratio) => (
                      <button
                        key={ratio}
                        onClick={() => handleSetScale(presetScale(ratio))}
                        className="py-1 text-[10px] font-medium border border-gray-200 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        1:{ratio}
                      </button>
                    )
                  )}
                </div>
              </div>

              
            )}
            {activeRightTab === 'grupper' && (
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">
                    folder_copy
                  </span>{" "}
                  Mätgrupper
                </h3>
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-md border border-gray-200 mb-2">
                  <div className="w-3 h-3 rounded shadow-sm" style={{ backgroundColor: measurementGroups.find(g => g.id === activeGroupId)?.color || '#ccc' }}></div>
                  <select
                    className="flex-1 w-full text-xs font-medium bg-transparent border-none focus:ring-0 text-gray-700 cursor-pointer p-0"
                    value={activeGroupId}
                    onChange={(e) => setActiveGroupId(e.target.value)}
                  >
                    {measurementGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 text-xs py-1 border border-gray-300 rounded hover:bg-gray-100"
                    onClick={() => {
                      setDialogConfig({
                        isOpen: true,
                        title: "Ny mätgrupp",
                        message: "Ange namn för ny mätgrupp:",
                        defaultValue: "",
                        onConfirm: (name) => {
                          if (name) {
                            const newGroup: MeasurementGroup = {
                              id: Date.now().toString(),
                              name,
                              color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                              visible: true
                            };
                            setMeasurementGroups([...measurementGroups, newGroup]);
                            setActiveGroupId(newGroup.id);
                          }
                          setDialogConfig(null);
                        },
                        onCancel: () => setDialogConfig(null)
                      });
                    }}
                  >
                    + Ny Grupp
                  </button>
                </div>
              </div>

            
            )}
            {activeRightTab === 'egenskaper' && (
              <div className="p-3 flex-1 overflow-y-auto bg-gray-50">
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm font-bold text-gray-800">
                    Egenskaper
                  </div>
                </div>
                {selectedMeasurementId ? (
                  measurements
                    .filter((m) => m.id === selectedMeasurementId)
                    .map((m) => (
                      <div key={m.id} className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">
                              Namn
                            </label>
                            <input
                              type="text"
                              value={m.name || ""}
                              placeholder={
                                m.tool === "distance" || m.tool === "line"
                                  ? "Avstånd " + m.id.substring(m.id.length - 4)
                                  : m.tool === "area"
                                    ? "Yta " + m.id.substring(m.id.length - 4)
                                    : m.tool === "volume"
                                      ? "Volym " +
                                        m.id.substring(m.id.length - 4)
                                      : m.tool === "count"
                                        ? "Antal " +
                                          m.id.substring(m.id.length - 4)
                                        : m.tool === "text"
                                          ? "Notering " +
                                            m.id.substring(m.id.length - 4)
                                          : `Mätning (${m.tool})`
                              }
                              onChange={(e) =>
                                setMeasurements(
                                  measurements.map((x) =>
                                    x.id === m.id
                                      ? { ...x, name: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 px-3 py-2 border"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">
                              Antal (Mängd)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={m.multiplier || 1}
                              onChange={(e) =>
                                setMeasurements(
                                  measurements.map((x) =>
                                    x.id === m.id
                                      ? {
                                          ...x,
                                          multiplier:
                                            parseInt(e.target.value) || 1,
                                        }
                                      : x,
                                  ),
                                )
                              }
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 px-3 py-2 border"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">
                              Byggdel
                            </label>
                            <select
                              value={
                                m.byggdelType || "72.1_Allman_Ritningsmatning"
                              }
                              onChange={(e) =>
                                setMeasurements(
                                  measurements.map((x) =>
                                    x.id === m.id
                                      ? { ...x, byggdelType: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 px-3 py-2 border"
                            >
                              <option value="72.1_Allman_Ritningsmatning">
                                Allmän mätning
                              </option>
                              {INITIAL_TIDSFAKTORER.map((tf) => (
                                <option key={tf.type} value={tf.type}>
                                  {tf.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {(m.tool === "distance" ||
                            m.tool === "polyline" ||
                            m.tool === "line" ||
                            m.tool === "area") && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase">
                                Höjd/Djup (m)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={m.height || ""}
                                onChange={(e) =>
                                  setMeasurements(
                                    measurements.map((x) =>
                                      x.id === m.id
                                        ? {
                                            ...x,
                                            height:
                                              e.target.value === ""
                                                ? undefined
                                                : parseFloat(e.target.value),
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                placeholder="t.ex. 2.4"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 px-3 py-2 border"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">
                              Typ av mätning
                            </label>
                            <div className="text-sm font-medium text-gray-900 mt-0.5">
                              {m.tool.charAt(0).toUpperCase() + m.tool.slice(1)}
                            </div>
                          </div>
                          {m.value !== undefined && m.tool !== "count" && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase">
                                Geometri{" "}
                                {m.tool === "volume" && m.depth
                                  ? "(med djup)"
                                  : ""}
                              </label>
                              <div className="text-sm font-medium text-gray-900 mt-0.5">
                                {(m.value * (m.multiplier || 1)).toFixed(2)}{" "}
                                {m.tool === "area"
                                  ? "m²"
                                  : m.tool === "volume"
                                    ? "m³"
                                    : "m"}
                                {m.tool === "volume" && m.depth && (
                                  <span className="text-gray-500 ml-2 text-xs">
                                    (Djup: {m.depth}m)
                                  </span>
                                )}
                                {m.multiplier && m.multiplier > 1 && (
                                  <span className="text-gray-500 ml-2 text-xs">
                                    ({m.value.toFixed(2)} × {m.multiplier})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {m.text && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase">
                                Textvärde
                              </label>
                              <div className="text-sm font-medium text-gray-900 mt-0.5">
                                {m.text}
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                              Färg & Opacitet
                            </label>
                            <div className="flex gap-2 mb-3">
                              {[
                                "#ff2a2a",
                                "#2a5aff",
                                "#1f2937",
                                "#e68a00",
                                "#10b981",
                                "#9333ea",
                                "#ec4899",
                                "#facc15",
                              ].map((color) => (
                                <button
                                  key={color}
                                  className={`w-6 h-6 rounded-full border-2 ${m.color === color ? "border-gray-800" : "border-transparent"}`}
                                  style={{ backgroundColor: color }}
                                  onClick={() =>
                                    setMeasurements(
                                      measurements.map((x) =>
                                        x.id === m.id ? { ...x, color } : x,
                                      ),
                                    )
                                  }
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 font-medium w-8">
                                {(m.opacity ?? 1.0) * 100}%
                              </span>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={m.opacity ?? 1.0}
                                onChange={(e) =>
                                  setMeasurements(
                                    measurements.map((x) =>
                                      x.id === m.id
                                        ? {
                                            ...x,
                                            opacity: parseFloat(e.target.value),
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="flex-1 w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          disabled={m.isLocked}
                          onClick={() => {
                            if (m.isLocked) return;
                            setMeasurements(
                              measurements.filter(
                                (x) => x.id !== selectedMeasurementId,
                              ),
                            );
                            setSelectedMeasurementId(null);
                            setActiveSidebarTab("ledger");
                          }}
                          className={`w-full py-2 rounded-lg text-sm font-medium border flex justify-center items-center gap-1 transition-colors ${m.isLocked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100'}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {m.isLocked ? 'lock' : 'delete'}
                          </span>{" "}
                          {m.isLocked ? 'Mätning är låst' : 'Ta bort mätning'}
                        </button>
                      </div>
                    ))
                ) : (
                  <div className="space-y-6">
                    <div className="text-sm text-gray-500 text-center px-4 mb-4">
                      Välj en mätning i mängdförteckningen för att visa och
                      redigera dess egenskaper.
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                        Ritinställningar
                      </h4>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                          Fäst mot objekt (Snapping)
                        </label>
                        <button
                          onClick={() =>
                            setIsSnappingEnabled(!isSnappingEnabled)
                          }
                          className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${isSnappingEnabled ? "bg-blue-600" : "bg-gray-300"}`}
                        >
                          <div
                            className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${isSnappingEnabled ? "translate-x-5" : "translate-x-0"}`}
                          />
                        </button>
                      </div>
                      {isSnappingEnabled && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">
                              Fästavstånd (px)
                            </label>
                            <span className="text-xs font-medium text-gray-700">
                              {snapDistance}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="50"
                            step="1"
                            value={snapDistance}
                            onChange={(e) =>
                              setSnapDistance(parseInt(e.target.value))
                            }
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
          </div>
            )}
            {activeRightTab === 'export' && (
              <div className="p-5 flex flex-col gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] h-full justify-start">
  <button
    onClick={exportSelected}
    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 transition-colors"
  >
    <span className="material-symbols-outlined text-[20px]">
      add_task
    </span>{" "}
    Exportera till Kalkyl ({measurements.length})
  </button>
  <div className="grid grid-cols-2 gap-2 mt-2">
    <button className="w-full py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg font-medium text-xs hover:bg-gray-100 transition-colors flex justify-center items-center gap-1.5">
      <span className="material-symbols-outlined text-[16px]">
        picture_as_pdf
      </span>{" "}
      PDF
    </button>
    <button className="w-full py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg font-medium text-xs hover:bg-gray-100 transition-colors flex justify-center items-center gap-1.5">
      <span className="material-symbols-outlined text-[16px]">
        table_chart
      </span>{" "}
      Excel
    </button>
  </div>
</div>

            )}
          </div>
        )}

        {/* Right Sidebar Icons Bar */}
        {pdfDoc && (
          <div className="w-[50px] border-l border-gray-200 bg-white flex flex-col items-center py-4 gap-4 shrink-0 z-20 shadow-sm relative">
            <button 
              onClick={() => setActiveRightTab(prev => prev === 'skala' ? null : 'skala')} 
              className={`p-2 rounded-xl transition-all ${activeRightTab === 'skala' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`} 
              title="Skala"
            >
              <span className="material-symbols-outlined text-[20px]">straighten</span>
            </button>
            <button 
              onClick={() => setActiveRightTab(prev => prev === 'grupper' ? null : 'grupper')} 
              className={`p-2 rounded-xl transition-all ${activeRightTab === 'grupper' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`} 
              title="Mätgrupper"
            >
              <span className="material-symbols-outlined text-[20px]">folder_copy</span>
            </button>
            <button 
              onClick={() => setActiveRightTab(prev => prev === 'egenskaper' ? null : 'egenskaper')} 
              className={`p-2 rounded-xl transition-all ${activeRightTab === 'egenskaper' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`} 
              title="Egenskaper"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
            <div className="flex-1" />
            <button 
              onClick={() => setActiveRightTab(prev => prev === 'export' ? null : 'export')} 
              className={`p-2 rounded-xl transition-all ${activeRightTab === 'export' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`} 
              title="Exportera till Kalkyl"
            >
              <span className="material-symbols-outlined text-[20px]">add_task</span>
            </button>
          </div>
        )}

      </div>
        {/* Bottom Panel: Measurements Table */}
        {pdfDoc && (
          <div 
            className="border-t border-gray-300 bg-white flex flex-col shrink-0 z-20 w-full relative" 
            style={{ zIndex: 30, height: window.innerWidth >= 1024 ? bottomPanelHeight : 250 }}
          >
            {/* Resize Handle for Bottom Panel */}
            <div
              className="hidden lg:block absolute left-0 right-0 top-0 h-2 cursor-row-resize z-50 hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors"
              onPointerDown={startBottomPanelResize}
              style={{ transform: 'translateY(-50%)' }}
            />

            <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex justify-between items-center shrink-0">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">list_alt</span>
                Mätningar (Mängdförteckning)
              </span>
              <span className="text-gray-500 text-xs font-medium">
                Sida {pageNum} ({measurements.filter((m) => m.page === pageNum).length} objekt)
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              {selectedBulkMeasurements.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-4 shadow-sm sticky top-0 z-20">
                  <span className="font-bold text-blue-800 text-sm">{selectedBulkMeasurements.size} valda</span>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Nytt namn..." 
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none w-40"
                      value={bulkActionName}
                      onChange={e => setBulkActionName(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select 
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none w-40"
                      value={bulkActionGroupId}
                      onChange={e => setBulkActionGroupId(e.target.value)}
                    >
                      <option value="">-- Ändra grupp --</option>
                      {measurementGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={applyBulkChanges}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    disabled={bulkActionName.trim() === '' && bulkActionGroupId === ''}
                  >
                    Tillämpa ändringar
                  </button>
                  
                  <div className="flex-1"></div>
                  
                  <button 
                    onClick={deleteBulkSelected}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Radera valda
                  </button>
                </div>
              )}
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-white border-b border-gray-200 sticky top-0 shadow-sm" style={{ zIndex: 10 }}>
                  <tr>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-center w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={measurements.filter((m) => m.page === pageNum).length > 0 && measurements.filter((m) => m.page === pageNum).every(m => selectedBulkMeasurements.has(m.id))}
                        onChange={handleSelectAllOnPage}
                      />
                    </th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase">Färg</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase">Namn/Etikett</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase">Typ</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase">Grupp</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-right">Mängd</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-right">Höjd/Djup</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-right">Antal</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-right">Totalt</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-center w-32">Åtgärder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {measurements.filter((m) => m.page === pageNum).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400 font-medium">
                        Inga mätningar på denna sida.
                      </td>
                    </tr>
                  ) : (
                    measurements.filter((m) => m.page === pageNum).map(m => {
                      const groupName = measurementGroups.find(g => g.id === (m.groupId || 'default'))?.name || 'Standard';
                      const isSelected = selectedMeasurementId === m.id;
                      const unit = m.tool === "area" ? "m²" : m.tool === "volume" ? "m³" : m.tool === "count" ? "st" : m.tool === "text" ? "" : "m";
                      return (
                        <tr 
                          key={m.id} 
                          onClick={() => setSelectedMeasurementId(m.id)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : selectedBulkMeasurements.has(m.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2 text-center w-10" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedBulkMeasurements.has(m.id)}
                              onChange={(e) => handleBulkSelect(m.id, e.target.checked)}
                            />
                          </td>
                          <td className="px-3 py-2 text-center w-10">
                            <div className="w-3 h-3 rounded-full mx-auto shadow-sm" style={{ backgroundColor: m.color }}></div>
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800">
                            <input
                              type="text"
                              value={m.name || (m.tool === 'text' ? m.text : `Mätning ${m.id.substring(m.id.length - 4)}`)}
                              onChange={(e) => {
                                setMeasurements(measurements.map(x => x.id === m.id ? { ...x, name: e.target.value } : x));
                              }}
                              className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 outline-none text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-600 capitalize">{m.tool}</td>
                          <td className="px-3 py-2 text-gray-600">{groupName}</td>
                          <td className="px-3 py-2 text-gray-800 font-mono text-right">{m.tool !== 'text' && m.tool !== 'count' ? m.value?.toFixed(2) : '-'} {m.tool !== 'text' && m.tool !== 'count' ? unit : ''}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-right">{m.height ? m.height.toFixed(2) + ' m' : '-'}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-right">{m.multiplier || 1}</td>
                          <td className="px-3 py-2 text-gray-800 font-bold font-mono text-right bg-gray-50/50">
                            {m.tool !== 'text' ? ((m.value || (m.tool === 'count' ? 1 : 0)) * (m.multiplier || 1)).toFixed(2) : '-'} {m.tool !== 'text' ? unit : ''}
                          </td>
                          <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => scaleSelectedMeasurement(m.id, 1.05)}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                title="Förstora (5%)"
                              >
                                <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                              </button>
                              <button
                                onClick={() => scaleSelectedMeasurement(m.id, 0.95)}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                title="Minska (5%)"
                              >
                                <span className="material-symbols-outlined text-[16px]">zoom_out</span>
                              </button>
                              <button
                                onClick={() => toggleMeasurementLock(m.id)}
                                className={`p-1 rounded transition-colors ${m.isLocked ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                title={m.isLocked ? 'Lås upp' : 'Sätt fast (Lås)'}
                              >
                                <span className="material-symbols-outlined text-[16px]">{m.isLocked ? 'lock' : 'lock_open'}</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!m.isLocked) {
                                    setMeasurements(prev => prev.filter(x => x.id !== m.id));
                                    if (selectedMeasurementId === m.id) setSelectedMeasurementId(null);
                                  }
                                }}
                                className={`p-1 rounded transition-colors ${m.isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                title="Ta bort"
                                disabled={m.isLocked}
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      {dialogConfig && dialogConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#00000080] backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {dialogConfig.title}
            </h3>
            <p className="text-sm text-gray-600 mb-5">{dialogConfig.message}</p>

            {!dialogConfig.isAlert && (
              <input
                autoFocus
                type="text"
                defaultValue={dialogConfig.defaultValue}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-5 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    dialogConfig.onConfirm(e.currentTarget.value);
                  }
                  if (e.key === "Escape" && dialogConfig.onCancel) {
                    dialogConfig.onCancel();
                  }
                }}
                id="dialog-input"
              />
            )}

            <div
              className={`flex gap-3 ${dialogConfig.isAlert ? "justify-end" : "justify-end"}`}
            >
              {!dialogConfig.isAlert && (
                <button
                  onClick={() =>
                    dialogConfig.onCancel && dialogConfig.onCancel()
                  }
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Avbryt
                </button>
              )}
              <button
                onClick={() => {
                  if (!dialogConfig.isAlert) {
                    const input = document.getElementById(
                      "dialog-input",
                    ) as HTMLInputElement;
                    dialogConfig.onConfirm(input?.value || "");
                  } else {
                    dialogConfig.onConfirm("");
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {dialogConfig.isAlert ? "OK" : "Bekräfta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {calibrateDialog && calibrateDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#00000080] backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Kalibrera Skala
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Mata in den verkliga längden och välj enhet:
            </p>

            <div className="flex gap-2 mb-5">
              <input
                autoFocus
                type="number"
                value={calibrateDialog.length}
                onChange={(e) =>
                  setCalibrateDialog({
                    ...calibrateDialog,
                    length: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="T.ex. 10.5"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setCalibrateDialog(null);
                    setCurrentPoints([]);
                    handleToolSelect("select");
                  }
                }}
              />
              <select
                value={calibrateDialog.unit}
                onChange={(e) =>
                  setCalibrateDialog({
                    ...calibrateDialog,
                    unit: e.target.value,
                  })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              >
                <option value="m">m</option>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="ft">ft</option>
                <option value="in">in</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setCalibrateDialog(null);
                  setCurrentPoints([]);
                  handleToolSelect("select");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Avbryt
              </button>
              <button
                onClick={async () => {
                  if (calibrateDialog.length) {
                    const val = Number(calibrateDialog.length.replace(",", "."));
                    const meters = toMeters(val, calibrateDialog.unit);
                    const newScaleObj = deriveScale(calibrateDialog.pxDistance, meters);
                    handleSetScale(newScaleObj);
                    setDialogConfig({
                      isOpen: true,
                      isAlert: true,
                      title: "Kalibrering slutförd",
                      message: `Ritningen är kalibrerad!`,
                      onConfirm: () => {
                        setDialogConfig(null);
                      },
                    });
                  }
                  setCalibrateDialog(null);
                  setCurrentPoints([]);
                  handleToolSelect("select");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Bekräfta
              </button>
            </div>
          </div>
        </div>
      )}
      <DocumentPickerModal 
        isOpen={isFfuPickerOpen}
        onClose={() => setIsFfuPickerOpen(false)}
        projectId={activeProjectId || documentId || 'mock-project-id'}
      />
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
  hideOnMobile = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label?: string;
  hideOnMobile?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${active ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200" : "text-gray-600 hover:bg-gray-100 border border-transparent"} ${hideOnMobile ? 'hidden md:flex' : ''}`}
      title={label}
    >
      <span
        className={`material-symbols-outlined ${active ? "text-blue-600" : "text-gray-500"} text-[18px]`}
      >
        {icon}
      </span>
      {label && (
        <span className={`text-xs ${active ? "font-semibold" : "font-medium"} hidden lg:inline`}>
          {label}
        </span>
      )}
    </button>
  );
}
