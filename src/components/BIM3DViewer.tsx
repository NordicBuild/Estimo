import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { BIMScene } from '../bim/3d/BIMScene';
import { useBIMStore, getVisibleElements } from '../stores/useBIMStore';
import { Loader2, AlertTriangle } from 'lucide-react';

export interface BIM3DViewerHandle {
  frameSelection: () => void;
  frameAll: () => void;
  resetView: () => void;
}

interface BIM3DViewerProps {
  modelId?: string;
  modelUrl?: string; // Optional URL if different from modelId
}

export const BIM3DViewer = forwardRef<BIM3DViewerHandle, BIM3DViewerProps>(
  ({ modelId, modelUrl }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<BIMScene | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Store state
    const elements = useBIMStore((state) => state.elements);
    const filters = useBIMStore((state) => state.filters);
    const visibleElements = useMemo(() => getVisibleElements(elements, filters), [elements, filters]);
    const selectedElementIds = useBIMStore((state) => state.selectedElementIds);
    const clipping = useBIMStore((state) => state.clipping);
    const colorMode = useBIMStore((state) => state.colorMode);
    const selectElement = useBIMStore((state) => state.selectElement);
    const deselectAll = useBIMStore((state) => state.deselectAll);
    const setElements = useBIMStore((state) => state.setElements);

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      frameSelection: () => {
        sceneRef.current?.frameSelection();
      },
      frameAll: () => {
        sceneRef.current?.frameAll();
      },
      resetView: () => {
        sceneRef.current?.frameAll();
      }
    }));

    // Initialize Scene
    useEffect(() => {
      if (!canvasRef.current) return;

      try {
        const scene = new BIMScene(canvasRef.current, {
          backgroundColor: 0xf9fafb, // Tailwind gray-50
          performance: 'high',
        });
        
        scene.onPick((elementId) => {
          if (elementId) {
            // Check if multi-select modifier is held (could extend with event parameter)
            // For now, toggle the specific element
            selectElement(elementId, true);
          } else {
            deselectAll();
          }
        });

        sceneRef.current = scene;
        setError(null);
      } catch (err: any) {
        console.error("Failed to initialize BIMScene:", err);
        setError("WebGL is not supported or failed to initialize.");
      }

      return () => {
        sceneRef.current?.dispose();
        sceneRef.current = null;
      };
    }, [selectElement, deselectAll]);

    // Load Model
    useEffect(() => {
      if (!sceneRef.current) return;
      if (!modelId && !modelUrl) return;

      let isCancelled = false;
      const loadModel = async () => {
        setLoading(true);
        setError(null);
        try {
          const url = modelUrl || (modelId ? `/models/${modelId}.glb` : undefined);
          if (!url) return;
          const loadedElements = await sceneRef.current?.loadGLB(url);
          if (!isCancelled) {
            setLoading(false);
            if (loadedElements) setElements(loadedElements);
            sceneRef.current?.frameAll();
          }
        } catch (err: any) {
          if (!isCancelled) {
            console.error("Failed to load model:", err);
            setError(`Failed to load model: ${err.message || 'Unknown error'}`);
            setLoading(false);
          }
        }
      };

      loadModel();

      return () => {
        isCancelled = true;
      };
    }, [modelId, modelUrl, setElements]);

    // Sync Selection
    useEffect(() => {
      if (!sceneRef.current) return;
      
      sceneRef.current.deselectAll();
      selectedElementIds.forEach(id => {
        sceneRef.current?.selectElement(id);
      });
    }, [selectedElementIds]);

    // Sync Visibility
    useEffect(() => {
      if (!sceneRef.current || elements.length === 0) return;

      const visibleIds = new Set(visibleElements.map(e => e.id || e.guid));
      
      elements.forEach(el => {
        const elementId = el.id || el.guid;
        const isVisible = visibleIds.has(elementId);
        sceneRef.current?.setElementVisibility(elementId, isVisible);
      });
    }, [elements, visibleElements]);

    // Sync Clipping
    useEffect(() => {
      if (!sceneRef.current) return;
      
      if (clipping.enabled) {
        sceneRef.current.setClippingPlanes(clipping.axisX, clipping.axisY, clipping.axisZ);
      } else {
        // Reset clipping planes if disabled by setting them to full range (0-100)
        sceneRef.current.setClippingPlanes([0, 100], [0, 100], [0, 100]);
      }
    }, [clipping]);

    // Sync Color Mode
    useEffect(() => {
      if (!sceneRef.current) return;
      sceneRef.current.setColorMode(colorMode);
    }, [colorMode]);

    return (
      <div className="relative w-full h-full bg-gray-50 overflow-hidden">
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 p-4 text-center z-10 bg-white bg-opacity-90">
            <AlertTriangle className="w-10 h-10 mb-2" />
            <p className="font-medium">{error}</p>
          </div>
        )}
        
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 z-10 bg-white bg-opacity-70 pointer-events-none">
            <Loader2 className="w-10 h-10 animate-spin mb-2 text-blue-500" />
            <p className="font-medium animate-pulse">Loading 3D Model...</p>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ touchAction: 'none' }} // Prevent scrolling while rotating
        />
      </div>
    );
  }
);

BIM3DViewer.displayName = 'BIM3DViewer';
