import React, { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Byggdel, INITIAL_TIDSFAKTORER } from "../data";
import { calculateDefaultMoments } from "../calculationHelpers";

// Use CDN for worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type Point = { x: number; y: number };
type Measurement = {
  id: string;
  tool: string;
  name?: string;
  byggdelType?: string;
  height?: number;
  multiplier?: number;
  points: Point[];
  color: string;
  value?: number; // Calculated length or area based on tool
  page: number;
  text?: string;
  depth?: number; // For volumes
  opacity?: number;
};

export function PdfMeasurementTab({
  addParts,
}: {
  addParts?: (parts: Omit<Byggdel, "id">[]) => void;
}) {
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
  const [scale, setScale] = useState(1);
  const [isScaleSet, setIsScaleSet] = useState(false);
  const [showScaleWarning, setShowScaleWarning] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue?: string;
    isAlert?: boolean;
    onConfirm: (val: string) => void;
    onCancel?: () => void;
  } | null>(null);

  const handleSetScale = (newScale: number) => {
    setScale(newScale);
    setIsScaleSet(true);
    setShowScaleWarning(false);

    // Recalculate existing measurements with the new scale
    setMeasurements((prev) =>
      prev.map((m) => {
        if (m.tool === "count" || m.tool === "text") return m;

        let newValue = 0;
        if (m.tool === "area" || m.tool === "volume" || m.tool === "cloud") {
          let area = 0;
          for (let i = 0; i < m.points.length; i++) {
            const p1 = m.points[i];
            const p2 = m.points[(i + 1) % m.points.length];
            area += p1.x * p2.y - p2.x * p1.y;
          }
          newValue = Math.abs(area / 2) * (newScale * newScale);
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
            newValue = dist * newScale;
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
          newValue = length * newScale;
        } else if (m.tool === "rectangle") {
          if (m.points.length >= 2) {
            newValue =
              Math.abs(m.points[1].x - m.points[0].x) *
              newScale *
              Math.abs(m.points[1].y - m.points[0].y) *
              newScale;
          }
        }
        return { ...m, value: newValue };
      }),
    );
  };

  const handleToolSelect = (tool: typeof currentTool) => {
    if (
      !isScaleSet &&
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
  const [isDrawingPencil, setIsDrawingPencil] = useState(false);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
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
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Allow scroll when not pressing Ctrl, or always zoom? AutoCAD always zooms with wheel.
      e.preventDefault();
      const zoomSensitivity = 1.25;
      const isZoomIn = e.deltaY < 0;
      const zoomFactor = isZoomIn ? zoomSensitivity : 1 / zoomSensitivity;

      setZoom((prevZoom) => {
        let newZoom = prevZoom * zoomFactor;
        newZoom = Math.max(0.1, Math.min(25.0, newZoom));
        const scaleChange = newZoom / prevZoom;

        const contentWrapper = container.querySelector(
          ".pdf-content-wrapper",
        ) as HTMLElement;

        requestAnimationFrame(() => {
          if (contentWrapper) {
            const wrapperRect = contentWrapper.getBoundingClientRect();
            // Calculate mouse position relative to the scaled content
            const pointerXRelativeToContent = e.clientX - wrapperRect.left;
            const pointerYRelativeToContent = e.clientY - wrapperRect.top;

            const dx = pointerXRelativeToContent * (scaleChange - 1);
            const dy = pointerYRelativeToContent * (scaleChange - 1);

            container.scrollLeft += dx;
            container.scrollTop += dy;
          }
        });

        return newZoom;
      });
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

  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle mouse button or Pan tool
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
    } else if (currentTool === "pan") {
      setIsPanning(true);
    }

    if (e.button === 1 || currentTool === "pan") {
      if (containerRef.current) {
        dragStart.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: containerRef.current.scrollLeft,
          scrollTop: containerRef.current.scrollTop,
        };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && containerRef.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      containerRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
      containerRef.current.scrollTop = dragStart.current.scrollTop - dy;
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setPageNum(1);
      setZoom(1.0);
      setMeasurements([]);
      setCurrentPoints([]);
    } catch (err) {
      console.error("Error loading PDF", err);
      alert("Kunde inte ladda PDFen");
    }
  };

  const renderPage = async (
    doc: pdfjsLib.PDFDocumentProxy,
    num: number,
    currentZoom: number,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const page = await doc.getPage(num);
    const viewport = page.getViewport({ scale: currentZoom });

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    setCanvasSize({ width: viewport.width, height: viewport.height });

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };
    try {
      await page.render(renderContext).promise;
    } catch (err) {
      console.log("Cancelled render");
    }
  };

  // Debounced rendering to avoid stutter while zooming
  useEffect(() => {
    if (pdfDoc) {
      const timeout = setTimeout(() => {
        renderPage(pdfDoc, pageNum, zoom);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [pageNum, zoom, pdfDoc]);

  const getSnappedPosition = (px: number, py: number) => {
    if (!isSnappingEnabled) return { x: px, y: py };

    const snapThreshold = snapDistance / zoom;
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

    e.currentTarget.setPointerCapture(e.pointerId);
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    let x = (e.clientX - rect.left) / zoom;
    let y = (e.clientY - rect.top) / zoom;

    if (!["text", "count", "pencil", "pan", "select"].includes(currentTool)) {
      const snapped = getSnappedPosition(x, y);
      x = snapped.point.x;
      y = snapped.point.y;
    }

    if (currentTool === "count") {
      const newMeasurement: Measurement = {
        id: Date.now().toString(),
        tool: currentTool,
        name: activeMeasurementName || undefined,
        byggdelType: activeMeasurementType,
        height:
          typeof activeMeasurementHeight === "number"
            ? activeMeasurementHeight
            : undefined,
        multiplier: activeMeasurementMultiplier,
        points: [{ x, y }],
        color: "#ff2a2a",
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
                tool: currentTool,
                name: activeMeasurementName || undefined,
                byggdelType: activeMeasurementType,
                height:
                  typeof activeMeasurementHeight === "number"
                    ? activeMeasurementHeight
                    : undefined,
                multiplier: activeMeasurementMultiplier,
                points: [{ x, y }],
                color: "#ff2a2a",
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
          setDialogConfig({
            isOpen: true,
            title: "Kalibrera Skala",
            message: "Mata in den verkliga längden i meter (t.ex. 10.5):",
            defaultValue: "",
            onConfirm: (input) => {
              if (input && !isNaN(Number(input.replace(",", ".")))) {
                const val = Number(input.replace(",", "."));
                const newScale = val / pxDistance;
                handleSetScale(newScale);
                setDialogConfig({
                  isOpen: true,
                  isAlert: true,
                  title: "Kalibrering slutförd",
                  message: `Ritningen är kalibrerad! Skala: 1px = ${newScale.toFixed(6)}m`,
                  onConfirm: () => {
                    setDialogConfig(null);
                  },
                });
              } else {
                setDialogConfig(null);
              }
              setCurrentPoints([]);
              handleToolSelect("select");
            },
            onCancel: () => {
              setCurrentPoints([]);
              handleToolSelect("select");
              setDialogConfig(null);
            },
          });
          return;
        }

        const realDistance = pxDistance * scale;

        let val = realDistance;
        if (currentTool === "rectangle") {
          val = Math.abs(p2.x - p1.x) * scale * Math.abs(p2.y - p1.y) * scale;
        }

        const newMeasurement: Measurement = {
          id: Date.now().toString(),
          tool: currentTool,
          name: activeMeasurementName || undefined,
          byggdelType: activeMeasurementType,
          height:
            typeof activeMeasurementHeight === "number"
              ? activeMeasurementHeight
              : undefined,
          multiplier: activeMeasurementMultiplier,
          points: [p1, p2],
          color: "#2a5aff",
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
      let x = (e.clientX - rect.left) / zoom;
      let y = (e.clientY - rect.top) / zoom;

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
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom,
          },
        ]);
      }
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (currentTool === "pencil" && isDrawingPencil) {
      setIsDrawingPencil(false);
      const newMeasurement: Measurement = {
        id: Date.now().toString(),
        tool: currentTool,
        name: activeMeasurementName || undefined,
        byggdelType: activeMeasurementType,
        height:
          typeof activeMeasurementHeight === "number"
            ? activeMeasurementHeight
            : undefined,
        multiplier: activeMeasurementMultiplier,
        points: [...currentPoints],
        color: "#ff2a2a",
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

      const finishMeasurement = (finalValue: number, finalDepth: number) => {
        const newMeasurement: Measurement = {
          id: Date.now().toString(),
          tool: currentTool,
          name: activeMeasurementName || undefined,
          byggdelType: activeMeasurementType,
          height:
            typeof activeMeasurementHeight === "number"
              ? activeMeasurementHeight
              : undefined,
          multiplier: activeMeasurementMultiplier,
          points: [...currentPoints],
          color: "#2a5aff",
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
        value = Math.abs(area / 2) * (scale * scale);

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
        value = length * scale;
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
      let type = m.byggdelType || "72.1_Allman_Ritningsmatning";
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
            : Math.sqrt(m.value || 0),
        width: 0.2, // default guess
        height: m.height || 3.0,
        area:
          m.tool === "area"
            ? m.value || 0
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
        comment: `Exporterad från PDF${m.height ? ` (Höjd/Djup: ${m.height}m)` : ""}`,
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
  const getStrokeWidth = (basePx: number) => basePx / zoom;

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
      <div className="flex flex-wrap items-center p-1.5 gap-y-1.5 gap-x-1 border-b border-gray-300 bg-white shrink-0 min-h-[48px] shadow-sm z-20 relative text-xs">
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
            onClick={() => setZoom((z) => Math.max(0.1, z / 1.2))}
            className="p-1 hover:bg-gray-100 rounded text-gray-700"
          >
            <span className="material-symbols-outlined text-[18px]">
              zoom_out
            </span>
          </button>
          <span className="font-mono w-12 text-center text-gray-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(25, z * 1.2))}
            className="p-1 hover:bg-gray-100 rounded text-gray-700"
          >
            <span className="material-symbols-outlined text-[18px]">
              zoom_in
            </span>
          </button>
          <button
            onClick={() => setZoom(1.0)}
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
            icon="cloud"
          />
          <ToolButton
            active={currentTool === "line"}
            onClick={() => handleToolSelect("line")}
            icon="north_east"
          />
          <ToolButton
            active={currentTool === "text"}
            onClick={() => handleToolSelect("text")}
            icon="title"
          />
          <ToolButton
            active={currentTool === "rectangle"}
            onClick={() => handleToolSelect("rectangle")}
            icon="crop_square"
          />
          <ToolButton
            active={currentTool === "pencil"}
            onClick={() => handleToolSelect("pencil")}
            icon="draw"
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
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 ml-1 bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-1.5 font-medium pr-2.5"
          >
            <span className="material-symbols-outlined text-[16px]">
              upload_file
            </span>{" "}
            Ladda upp
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {/* Main Canvas Area */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-auto bg-[#e5e7eb] relative p-8 cursor-crosshair`}
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
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined">description</span>{" "}
                Välj PDF-fil
              </button>
            </div>
          )}
          <div
            className={`pdf-content-wrapper relative inline-block shadow-xl mx-auto ${currentTool === "pan" && !isPanning ? "cursor-grab" : ""} ${isPanning ? "cursor-grabbing" : ""}`}
            style={{
              width: canvasSize.width || "auto",
              height: canvasSize.height || "auto",
            }}
          >
            <canvas
              className={`bg-white ${pdfDoc ? "block" : "hidden"}`}
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
                className="absolute inset-0 z-10 touch-none"
                width={canvasSize.width}
                height={canvasSize.height}
              >
                <g transform={`scale(${zoom})`}>
                  {/* Draw existing measurements */}
                  {measurements
                    .filter((m) => m.page === pageNum)
                    .map((m) => {
                      const color = m.color;

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
                          <g transform={`translate(${center.x}, ${center.y})`}>
                            <rect
                              x="-35"
                              y="-12"
                              width="70"
                              height="24"
                              rx="4"
                              fill="white"
                              fillOpacity="0.85"
                              stroke={m.color}
                              strokeWidth={getStrokeWidth(1)}
                            />
                            <text
                              x="0"
                              y="4"
                              textAnchor="middle"
                              fill="#1f2937"
                              fontSize={getStrokeWidth(12)}
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              {m.value?.toFixed(2)}
                              {unit}
                            </text>
                          </g>
                        );
                      };

                      if (m.tool === "count") {
                        return (
                          <g
                            key={m.id}
                            transform={`translate(${m.points[0].x},${m.points[0].y})`}
                          >
                            <circle
                              cx="0"
                              cy="0"
                              r={getStrokeWidth(12)}
                              fill={color}
                              fillOpacity="0.8"
                            />
                            <circle
                              cx="0"
                              cy="0"
                              r={getStrokeWidth(12)}
                              fill="none"
                              stroke="#fff"
                              strokeWidth={getStrokeWidth(2)}
                            />
                            <text
                              x="0"
                              y={getStrokeWidth(4)}
                              textAnchor="middle"
                              fill="white"
                              fontSize={getStrokeWidth(12)}
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              1
                            </text>
                          </g>
                        );
                      }
                      if (m.tool === "text") {
                        return (
                          <text
                            key={m.id}
                            x={m.points[0].x}
                            y={m.points[0].y}
                            fill={color}
                            fontSize={getStrokeWidth(18)}
                            fontWeight="bold"
                            fontFamily="sans-serif"
                            style={{ textShadow: "2px 2px 0 #fff" }}
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
                            key={m.id}
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            fill={color}
                            fillOpacity={m.opacity ?? 0.15}
                            stroke={color}
                            strokeWidth={getStrokeWidth(2)}
                          />
                        );
                      }
                      if (
                        m.tool === "line" ||
                        m.tool === "distance" ||
                        m.tool === "calibrate"
                      ) {
                        return (
                          <g key={m.id}>
                            <line
                              x1={m.points[0].x}
                              y1={m.points[0].y}
                              x2={m.points[1].x}
                              y2={m.points[1].y}
                              stroke={color}
                              strokeWidth={getStrokeWidth(3)}
                              strokeLinecap="round"
                            />
                            <circle
                              cx={m.points[0].x}
                              cy={m.points[0].y}
                              r={getStrokeWidth(4)}
                              fill="#fff"
                              stroke={color}
                              strokeWidth={getStrokeWidth(2)}
                            />
                            <circle
                              cx={m.points[1].x}
                              cy={m.points[1].y}
                              r={getStrokeWidth(4)}
                              fill="#fff"
                              stroke={color}
                              strokeWidth={getStrokeWidth(2)}
                            />
                            {drawMeasurementLabel()}
                          </g>
                        );
                      }
                      if (
                        [
                          "polyline",
                          "area",
                          "volume",
                          "cloud",
                          "pencil",
                        ].includes(m.tool)
                      ) {
                        const pointsStr = m.points
                          .map((p) => `${p.x},${p.y}`)
                          .join(" ");
                        if (m.tool === "area" || m.tool === "volume") {
                          return (
                            <g key={m.id}>
                              <polygon
                                points={pointsStr}
                                fill={color}
                                fillOpacity={m.opacity ?? 0.3}
                                stroke={color}
                                strokeWidth={getStrokeWidth(2)}
                                strokeLinejoin="round"
                              />
                              {drawMeasurementLabel()}
                            </g>
                          );
                        }
                        if (m.tool === "cloud") {
                          // Drawing a simplified cloud as a polygon for now
                          return (
                            <polygon
                              key={m.id}
                              points={pointsStr}
                              fill={color}
                              fillOpacity={(m.opacity ?? 0.3) * 0.5}
                              stroke={color}
                              strokeWidth={getStrokeWidth(3)}
                              strokeLinejoin="round"
                              strokeDasharray={`${getStrokeWidth(10)}, ${getStrokeWidth(5)}`}
                            />
                          );
                        }
                        return (
                          <g key={m.id}>
                            <polyline
                              points={pointsStr}
                              fill="none"
                              stroke={color}
                              strokeWidth={getStrokeWidth(3)}
                              strokeLinejoin="round"
                            />
                            {drawMeasurementLabel()}
                          </g>
                        );
                      }
                      return null;
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
                          strokeWidth={getStrokeWidth(2)}
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
                          strokeWidth={getStrokeWidth(2)}
                          strokeDasharray={`${getStrokeWidth(6)}, ${getStrokeWidth(4)}`}
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
                            currentTool === "volume" ||
                            currentTool === "rectangle"
                              ? "#2a5aff"
                              : "none"
                          }
                          fillOpacity={0.3}
                          stroke="#2a5aff"
                          strokeWidth={getStrokeWidth(2)}
                          strokeDasharray={
                            isDrawingPencil
                              ? "none"
                              : `${getStrokeWidth(6)}, ${getStrokeWidth(4)}`
                          }
                          strokeLinejoin="round"
                        />
                      ) : null}

                      {!isDrawingPencil &&
                        currentPoints.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={getStrokeWidth(5)}
                            fill="#fff"
                            stroke="#2a5aff"
                            strokeWidth={getStrokeWidth(2)}
                          />
                        ))}
                      {/* Active floating indicator for the mouse position */}
                      {!isDrawingPencil &&
                        currentTool !== "count" &&
                        currentTool !== "text" && (
                          <circle
                            cx={mousePos.x}
                            cy={mousePos.y}
                            r={getStrokeWidth(5)}
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
                        r={getStrokeWidth(5)}
                        fill="#2a5aff"
                        opacity="0.5"
                      />
                    )}
                  {snappedPoint && (
                    <g pointerEvents="none">
                      <circle
                        cx={snappedPoint.x}
                        cy={snappedPoint.y}
                        r={getStrokeWidth(8)}
                        fill="none"
                        stroke="#ff00ff"
                        strokeWidth={getStrokeWidth(2)}
                      />
                      <line
                        x1={snappedPoint.x - getStrokeWidth(12)}
                        y1={snappedPoint.y}
                        x2={snappedPoint.x + getStrokeWidth(12)}
                        y2={snappedPoint.y}
                        stroke="#ff00ff"
                        strokeWidth={getStrokeWidth(1.5)}
                      />
                      <line
                        x1={snappedPoint.x}
                        y1={snappedPoint.y - getStrokeWidth(12)}
                        x2={snappedPoint.x}
                        y2={snappedPoint.y + getStrokeWidth(12)}
                        stroke="#ff00ff"
                        strokeWidth={getStrokeWidth(1.5)}
                      />
                    </g>
                  )}
                </g>
              </svg>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-64 lg:w-72 border-l border-gray-200 bg-white flex flex-col shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
          {pdfDoc && (
            <>
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">
                    straighten
                  </span>{" "}
                  Skala
                </h3>
                <div className="flex justify-between items-center bg-blue-50 text-blue-800 p-2 rounded-md border border-blue-100 mb-2">
                  <span className="font-medium text-xs">Aktuell Skala</span>
                  <span className="font-mono font-bold text-xs">
                    1px = {scale.toFixed(4)}m
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleSetScale(0.1)}
                    className="py-1 text-[10px] font-medium border border-gray-200 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    1:10
                  </button>
                  <button
                    onClick={() => handleSetScale(0.05)}
                    className="py-1 text-[10px] font-medium border border-gray-200 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    1:20
                  </button>
                  <button
                    onClick={() => handleSetScale(0.04)}
                    className="py-1 text-[10px] font-medium border border-gray-200 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    1:25
                  </button>
                  <button
                    onClick={() => handleSetScale(0.02)}
                    className="py-1 text-[10px] font-medium border border-gray-200 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    1:50
                  </button>
                </div>
              </div>

              <div className="p-3 border-b border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">
                    folder_copy
                  </span>{" "}
                  Lager
                </h3>
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-md border border-gray-200">
                  <div className="w-3 h-3 rounded shadow-sm bg-[#2a5aff]"></div>
                  <select className="flex-1 w-full text-xs font-medium bg-transparent border-none focus:ring-0 text-gray-700 cursor-pointer p-0">
                    <option>Standard (Alla mängder)</option>
                    <option>VVS</option>
                    <option>Elinstallation</option>
                    <option>Konstruktion</option>
                  </select>
                </div>
              </div>

              <div className="flex p-2 bg-gray-50 border-b border-gray-200">
                <button
                  onClick={() => setActiveSidebarTab("ledger")}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-md mx-1 transition-colors ${activeSidebarTab === "ledger" ? "bg-white text-gray-800 shadow-sm border border-gray-200" : "text-gray-500 border border-transparent hover:bg-gray-100"}`}
                >
                  Mängdförteckning
                </button>
                <button
                  onClick={() => setActiveSidebarTab("properties")}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-md mx-1 transition-colors ${activeSidebarTab === "properties" ? "bg-white text-gray-800 shadow-sm border border-gray-200" : "text-gray-500 border border-transparent hover:bg-gray-100"}`}
                >
                  Egenskaper
                </button>
              </div>
            </>
          )}

          <div className="p-3 flex-1 overflow-y-auto bg-gray-50">
            {activeSidebarTab === "ledger" ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm font-bold text-gray-800">
                    Mätningar{" "}
                    <span className="text-gray-500 text-xs font-medium">
                      ({measurements.filter((m) => m.page === pageNum).length}{" "}
                      objekt)
                    </span>
                  </div>
                </div>

                {measurements.filter((m) => m.page === pageNum).length === 0 ? (
                  <div className="text-sm text-gray-500 text-center my-10 px-4 bg-white py-6 rounded-lg border border-dashed border-gray-300">
                    Inga mätningar på denna sida (Sida {pageNum}). Välj ett
                    verktyg i verktygsfältet för att börja.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {Object.values(
                      measurements
                        .filter((m) => m.page === pageNum)
                        .reduce(
                          (acc, m) => {
                            const name =
                              m.name ||
                              (m.tool === "distance" || m.tool === "line"
                                ? "Avstånd " + m.id.substring(m.id.length - 4)
                                : m.tool === "area"
                                  ? "Yta " + m.id.substring(m.id.length - 4)
                                  : m.tool === "volume"
                                    ? "Volym " + m.id.substring(m.id.length - 4)
                                    : m.tool === "count"
                                      ? "Antal " +
                                        m.id.substring(m.id.length - 4)
                                      : m.tool === "text"
                                        ? "Notering " +
                                          m.id.substring(m.id.length - 4)
                                        : `Mätning (${m.tool})`);
                            const key = m.tool + "|" + name;
                            if (!acc[key]) {
                              acc[key] = {
                                name,
                                tool: m.tool,
                                total: 0,
                                items: [],
                              };
                            }
                            acc[key].items.push(m);
                            acc[key].total +=
                              (m.tool === "count" ? 1 : m.value || 0) *
                              (m.multiplier || 1);
                            return acc;
                          },
                          {} as Record<
                            string,
                            {
                              name: string;
                              tool: string;
                              total: number;
                              items: Measurement[];
                            }
                          >,
                        ),
                    ).map((group) => (
                      <li
                        key={group.name + group.tool}
                        className="text-sm bg-white p-3 rounded-lg flex flex-col gap-2 border border-gray-200 shadow-sm"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded flex items-center justify-center ${group.tool === "count" ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"}`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {group.tool === "area"
                                  ? "pentagon"
                                  : group.tool === "volume"
                                    ? "view_in_ar"
                                    : group.tool === "distance"
                                      ? "vertical_align_center"
                                      : group.tool === "count"
                                        ? "tag"
                                        : group.tool === "text"
                                          ? "title"
                                          : "timeline"}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              {group.name}
                            </span>
                          </div>
                          {group.tool !== "text" && (
                            <div className="text-sm font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                              {group.tool === "count"
                                ? group.total
                                : group.total.toFixed(2)}
                              <span className="text-gray-500 font-medium ml-1 text-xs">
                                {group.tool === "area"
                                  ? "m²"
                                  : group.tool === "volume"
                                    ? "m³"
                                    : group.tool === "count"
                                      ? "st"
                                      : "m"}
                              </span>
                            </div>
                          )}
                        </div>
                        <ul className="space-y-1">
                          {group.items.map((m) => (
                            <li
                              key={m.id}
                              onClick={() => {
                                setSelectedMeasurementId(m.id);
                                setActiveSidebarTab("properties");
                              }}
                              className={`flex justify-between items-center p-1.5 rounded cursor-pointer transition-colors ${selectedMeasurementId === m.id ? "bg-blue-50 ring-1 ring-blue-400" : "hover:bg-gray-50"}`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: m.color,
                                    opacity: m.opacity ?? 1,
                                  }}
                                ></div>
                                <span className="text-xs text-gray-500 font-medium">
                                  #{m.id.substring(m.id.length - 4)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {m.multiplier && m.multiplier > 1 && (
                                  <span className="text-xs text-gray-400 font-medium px-1 bg-gray-100 rounded">
                                    {m.multiplier}x
                                  </span>
                                )}
                                {m.value !== undefined &&
                                  m.tool !== "text" &&
                                  m.tool !== "count" && (
                                    <span className="text-xs text-gray-600 font-medium">
                                      {(m.value * (m.multiplier || 1)).toFixed(
                                        2,
                                      )}
                                    </span>
                                  )}
                                {m.tool === "text" && (
                                  <span className="text-xs text-gray-600 font-medium truncate max-w-[80px]">
                                    {m.text}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMeasurements(
                                      measurements.filter((x) => x.id !== m.id),
                                    );
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50 flex items-center justify-center"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    close
                                  </span>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
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
                          onClick={() => {
                            setMeasurements(
                              measurements.filter(
                                (x) => x.id !== selectedMeasurementId,
                              ),
                            );
                            setSelectedMeasurementId(null);
                            setActiveSidebarTab("ledger");
                          }}
                          className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-100 flex justify-center items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>{" "}
                          Ta bort mätning
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
            )}
          </div>

          {pdfDoc && (
            <div className="p-5 flex flex-col gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
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
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${active ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200" : "text-gray-600 hover:bg-gray-100 border border-transparent"}`}
      title={label}
    >
      <span
        className={`material-symbols-outlined ${active ? "text-blue-600" : "text-gray-500"} text-[18px]`}
      >
        {icon}
      </span>
      {label && (
        <span className={`text-xs ${active ? "font-semibold" : "font-medium"}`}>
          {label}
        </span>
      )}
    </button>
  );
}
