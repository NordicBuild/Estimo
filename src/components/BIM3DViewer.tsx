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
        
        scene.onPick((sceneElementId) => {
          if (sceneElementId) {
            // Check if multi-select modifier is held (could extend with event parameter)
            // For now, toggle the specific element
            
            // Map sceneElementId (e.g. "Element_123" or mesh UUID) back to database element ID
            let dbElementId = sceneElementId;
            if (sceneElementId.startsWith('Element_')) {
              const expressIdStr = sceneElementId.replace('Element_', '');
              const dbEl = useBIMStore.getState().elements.find(e => 
                String(e.properties?.ExpressID) === expressIdStr
              );
              if (dbEl) dbElementId = dbEl.id;
            } else if (sceneElementId.startsWith('Mesh_')) {
              // fallback if it matched mesh
              const expressIdStr = sceneElementId.replace('Mesh_', '');
              const dbEl = useBIMStore.getState().elements.find(e => 
                String(e.properties?.ExpressID) === expressIdStr
              );
              if (dbEl) dbElementId = dbEl.id;
            }

            selectElement(dbElementId, true);
          } else {
            deselectAll();
          }
        });

        sceneRef.current = scene;
        setError(null);
      } catch (err: any) {
        // warning removed
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
      if (!modelId && !modelUrl) {
        // If we have elements but no URL, it means geometry extraction failed or was skipped
        if (elements.length > 0) {
          setError("Geometri saknas/degraderad – properties tillgängliga i sidopanelen.");
        }
        return;
      }

      let isCancelled = false;
      const loadModel = async () => {
        setLoading(true);
        setError(null);
        try {
          const url = modelUrl || (modelId ? `/models/${modelId}.glb` : undefined);
          if (!url) {
            setLoading(false);
            if (elements.length > 0) {
              setError("Geometri saknas/degraderad – properties tillgängliga i sidopanelen.");
            }
            return;
          }
          
          const modelName = useBIMStore.getState().modelName || '';
          const isIfc = url.toLowerCase().includes('.ifc') || modelName.toLowerCase().endsWith('.ifc');
          let loadedElements: any[] = [];
          if (isIfc) {
            loadedElements = await sceneRef.current?.loadIFC(url) || [];
          } else {
            loadedElements = await sceneRef.current?.loadGLB(url) || [];
          }

          if (!isCancelled) {
            setLoading(false);
            // If the store doesn't have elements (local parsing), use the extracted ones
            if (useBIMStore.getState().elements.length === 0 && loadedElements.length > 0) {
              setElements(loadedElements);
            }
            sceneRef.current?.frameAll();
          }
        } catch (err: any) {
          if (!isCancelled) {
            // warning removed
            setError(`Failed to load model: ${err.message || 'Unknown error'}`);
            setLoading(false);
          }
        }
      };

      loadModel();

      return () => {
        isCancelled = true;
      };
    }, [modelId, modelUrl, elements.length]);

    // Sync Selection
    useEffect(() => {
      if (!sceneRef.current) return;
      
      sceneRef.current.deselectAll();
      selectedElementIds.forEach(id => {
        // Find the database element to get its ExpressID
        const dbEl = elements.find(e => e.id === id);
        if (dbEl && dbEl.properties?.ExpressID) {
           sceneRef.current?.selectElement(`Element_${dbEl.properties.ExpressID}`);
        } else {
           sceneRef.current?.selectElement(id);
        }
      });
    }, [selectedElementIds, elements]);

    // Sync Visibility
    useEffect(() => {
      if (!sceneRef.current || elements.length === 0) return;

      const visibleIds = new Set(visibleElements.map(e => e.id));
      
      elements.forEach(el => {
        const isVisible = visibleIds.has(el.id);
        if (el.properties?.ExpressID) {
          sceneRef.current?.setElementVisibility(`Element_${el.properties.ExpressID}`, isVisible);
          // also try node format if mesh was selected
          sceneRef.current?.setElementVisibility(`Mesh_${el.properties.ExpressID}`, isVisible);
        } else {
          sceneRef.current?.setElementVisibility(el.id, isVisible);
        }
      });
    }, [elements, visibleElements]);

    // Sync Clipping
    useEffect(() => {
      if (!sceneRef.current) return;
      
      sceneRef.current.setClippingEnabled(clipping.enabled);
      
      if (clipping.enabled) {
        sceneRef.current.setClippingPlanes(clipping.axisX, clipping.axisY, clipping.axisZ);
      }
    }, [clipping]);

    // Sync Color Mode
    useEffect(() => {
      if (!sceneRef.current) return;
      sceneRef.current.setColorMode(colorMode, elements);
    }, [colorMode, elements]);

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
