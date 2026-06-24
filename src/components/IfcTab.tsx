import React, { useState, useRef, useEffect } from 'react';
import { Byggdel } from '../data';
import * as WebIFC from 'web-ifc';
import { ViewerUI } from '../viewer/components/ViewerUI';
import { saveIfcFile, getIfcFile } from '../ifcStorage';
import { calculateDefaultMoments } from '../calculationHelpers';

interface Props {
  addIfcByggdelar: (newParts: Omit<Byggdel, 'id'>[]) => void;
  activeProjectId: string;
}

export function IfcTab({ addIfcByggdelar, activeProjectId }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [ifcFile, setIfcFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<'data' | 'viewer'>('data');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [ifcElements, setIfcElements] = useState<{ id: string, name: string, qty: number, unit: string, type: string, ifcType: string, storey: string, originalCount: number, extractedArea: number, extractedLength: number, extractedVolume: number, extractedWeight: number, material: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStorey, setFilterStorey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawElementsRef = useRef(new Map<number, any>());

  useEffect(() => {
    if (activeProjectId) {
      getIfcFile(activeProjectId).then(file => {
        if (file) {
          setIfcFile(file);
          setUploaded(true);
          processFile(file);
        } else {
          setIfcFile(null);
          setUploaded(false);
          setIfcElements([]);
          setSelectedItems([]);
        }
      }).catch(err => {
        console.error('Failed to load IFC file from local storage', err);
      });
    }
  }, [activeProjectId]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      await new Promise(r => setTimeout(r, 100));
      await processFile(file);
      setIfcFile(file);
      if (activeProjectId) {
        saveIfcFile(activeProjectId, file).catch(console.error);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.ifc')) {
      setIsUploading(true);
      await new Promise(r => setTimeout(r, 100));
      await processFile(file);
      setIfcFile(file);
      if (activeProjectId) {
        saveIfcFile(activeProjectId, file).catch(console.error);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    let ifcApi: any = null;
    let modelID: number | null = null;
    try {
      const { getIfcApi } = await import('../viewer/core/IfcAPI');
      ifcApi = await getIfcApi();

      const data = new Uint8Array(await file.arrayBuffer());
      modelID = ifcApi.OpenModel(data);

      const typesToGet = [
        WebIFC.IFCWALL,
        WebIFC.IFCWALLSTANDARDCASE,
        WebIFC.IFCSLAB,
        WebIFC.IFCCOLUMN,
        WebIFC.IFCBEAM,
        WebIFC.IFCFOOTING,
        WebIFC.IFCSTAIR,
        WebIFC.IFCSTAIRFLIGHT,
        WebIFC.IFCROOF,
        WebIFC.IFCDOOR,
        WebIFC.IFCWINDOW,
        WebIFC.IFCRAILING,
        WebIFC.IFCCOVERING
      ];

      const elementGroups = new Map<string, { count: number, typeName: string, ifcType: string, area: number, length: number, volume: number, weight: number, material: string, storey: string }>();

      let spatialTree: any = null;
      try {
        spatialTree = await ifcApi.properties.getSpatialStructure(modelID);
      } catch (e) {
        console.warn("Could not get spatial structure", e);
      }

      const storeyMap = new Map<number, string>();
      const walk = (node: any, currentStorey: string) => {
          let storey = currentStorey;
          if (node.type?.toUpperCase() === 'IFCBUILDINGSTOREY') {
              try {
                  const props = ifcApi.GetLine(modelID, node.expressID);
                  storey = props.Name?.value || 'Okänd våning';
              } catch (e) {}
          }
          storeyMap.set(node.expressID, storey);
          if (node.children) {
              for (const child of node.children) {
                  walk(child, storey);
              }
          }
      };
      if (spatialTree) {
          walk(spatialTree, 'Okänd position');
      }

      // Read Project Units
      let lengthScale = 1;
      let areaScale = 1;
      let volumeScale = 1;

      try {
         const projectIds = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCPROJECT);
         if (projectIds.size() > 0) {
            const project = ifcApi.GetLine(modelID, projectIds.get(0));
            if (project && project.UnitsInContext) {
               const unitsAssign = ifcApi.GetLine(modelID, project.UnitsInContext.value);
               if (unitsAssign && unitsAssign.Units) {
                  for (const unitRef of unitsAssign.Units) {
                     const unit = ifcApi.GetLine(modelID, unitRef.value);
                     if (unit.UnitType && unit.UnitType.value === "LENGTHUNIT") {
                        if (unit.Prefix && unit.Prefix.value === "MILLI") lengthScale = 0.001;
                        else if (unit.Prefix && unit.Prefix.value === "CENTI") lengthScale = 0.01;
                     } else if (unit.UnitType && unit.UnitType.value === "AREAUNIT") {
                        if (unit.Prefix && unit.Prefix.value === "MILLI") areaScale = 0.000001;
                        else if (unit.Prefix && unit.Prefix.value === "CENTI") areaScale = 0.0001;
                     } else if (unit.UnitType && unit.UnitType.value === "VOLUMEUNIT") {
                        if (unit.Prefix && unit.Prefix.value === "MILLI") volumeScale = 0.000000001;
                        else if (unit.Prefix && unit.Prefix.value === "CENTI") volumeScale = 0.000001;
                     }
                  }
               }
            }
         }
      } catch (e) {
         console.warn("Could not read project units", e);
      }

      // First pass: Read properties for all elements
      const elementsData = new Map<number, any>();
      const missingGeometries = new Set<number>();

      for (const type of typesToGet) {
        const lines = ifcApi.GetLineIDsWithType(modelID, type);
        const ifcTypeName = ifcApi.GetNameFromTypeCode(type);
        
        for (let i = 0; i < lines.size(); i++) {
          const id = lines.get(i);
          try {
            const props = ifcApi.GetLine(modelID, id);
            let name = props.Name?.value;
            if (!name) name = props.ObjectType?.value;
            if (!name) name = 'Generisk';
            
            const storey = storeyMap.get(id) || 'Okänd position';

            let extractedVolume = 0;
            let extractedArea = 0;
            let extractedLength = 0;
            let extractedWeight = 0;
            let extractedMaterial = "";

            if (i % 25 === 0) await new Promise(r => setTimeout(r, 0));

            try {
               const psets = await ifcApi.properties.getPropertySets(modelID, id, true) || [];
               for (const pset of psets) {
                  const qtyArr = pset.Quantities || pset.HasProperties || [];
                  for (const q of qtyArr) {
                     const qName = q.Name?.value?.toLowerCase();
                     const qValue = q.VolumeValue?.value || q.AreaValue?.value || q.LengthValue?.value || q.NominalValue?.value || q.MassValue?.value || q.WeightValue?.value;
                     if (qName && typeof qValue === 'number') {
                         if (qName.includes('volume')) extractedVolume = qValue * volumeScale;
                         else if (qName.includes('area')) extractedArea = qValue * areaScale;
                         else if (qName.includes('length')) extractedLength = qValue * lengthScale;
                         else if (qName.includes('weight') || qName.includes('mass')) extractedWeight = qValue;
                     }
                  }
               }
            } catch (e) {}

            try {
               const mats = await ifcApi.properties.getMaterialsProperties(modelID, id, true) || [];
               for (const mat of mats) {
                  const matList = mat.Materials || mat.MaterialLayers || (mat.ForLayerSet ? mat.ForLayerSet.MaterialLayers : null);
                  if (matList && Array.isArray(matList)) {
                     const names = matList.map((m: any) => m.Material ? m.Material.Name?.value : m.Name?.value).filter(Boolean);
                     if (names.length) extractedMaterial = names.join(', ');
                  } else if (mat.Name?.value) {
                     extractedMaterial = mat.Name.value;
                  }
               }
            } catch(e) {}

            elementsData.set(id, {
                id, name, storey, ifcTypeName, extractedVolume, extractedArea, extractedLength, extractedWeight, extractedMaterial
            });

            if (extractedVolume === 0 || extractedArea === 0 || extractedLength === 0) {
                missingGeometries.add(id);
            }
          } catch (e) {
            console.warn("Kunde inte läsa ifc-linje", id, e);
          }
        }
      }

      // Second pass: Calculate geometries ONLY for elements missing properties
      const elementGeometrics = new Map<number, { area: number, volume: number, length: number }>();
      if (missingGeometries.size > 0) {
          const streamStartTime = Date.now();
          try {
            ifcApi.StreamAllMeshesWithTypes(modelID, typesToGet, (mesh: WebIFC.FlatMesh) => {
                if (!missingGeometries.has(mesh.expressID)) return; // Skip calculation
                
                // Anti-freeze: skip heavy calculations if scanning takes > 3 seconds
                if (Date.now() - streamStartTime > 3000) return;
                
                let minX = Infinity, minY = Infinity, minZ = Infinity;
                let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
                let totalVolume = 0;
                let totalArea = 0;
                
                for (let i = 0; i < mesh.geometries.size(); i++) {
                    const placedGeom = mesh.geometries.get(i);
                    const ifcGeom = ifcApi.GetGeometry(modelID, placedGeom.geometryExpressID);
                    const vertices = ifcApi.GetVertexArray(ifcGeom.GetVertexData(), ifcGeom.GetVertexDataSize());
                    const indices = ifcApi.GetIndexArray(ifcGeom.GetIndexData(), ifcGeom.GetIndexDataSize());
                    const matrix = placedGeom.flatTransformation;
                    
                    const worldVerts = new Float32Array(vertices.length / 2);
                    for (let j = 0; j < vertices.length; j += 6) {
                        const x = vertices[j];
                        const y = vertices[j+1];
                        const z = vertices[j+2];
                        
                        const wx = x * matrix[0] + y * matrix[4] + z * matrix[8] + matrix[12];
                        const wy = x * matrix[1] + y * matrix[5] + z * matrix[9] + matrix[13];
                        const wz = x * matrix[2] + y * matrix[6] + z * matrix[10] + matrix[14];
                        
                        const idx = j/2;
                        worldVerts[idx] = wx;
                        worldVerts[idx+1] = wy;
                        worldVerts[idx+2] = wz;
                        
                        if (wx < minX) minX = wx;
                        if (wy < minY) minY = wy;
                        if (wz < minZ) minZ = wz;
                        if (wx > maxX) maxX = wx;
                        if (wy > maxY) maxY = wy;
                        if (wz > maxZ) maxZ = wz;
                    }
                    
                    let localVolume = 0;
                    let localArea = 0;
                    for (let j = 0; j < indices.length; j += 3) {
                        const i0 = indices[j] * 3;
                        const i1 = indices[j+1] * 3;
                        const i2 = indices[j+2] * 3;
                        
                        const p1x = worldVerts[i0], p1y = worldVerts[i0+1], p1z = worldVerts[i0+2];
                        const p2x = worldVerts[i1], p2y = worldVerts[i1+1], p2z = worldVerts[i1+2];
                        const p3x = worldVerts[i2], p3y = worldVerts[i2+1], p3z = worldVerts[i2+2];
                        
                        const ax = p2x - p1x, ay = p2y - p1y, az = p2z - p1z;
                        const bx = p3x - p1x, by = p3y - p1y, bz = p3z - p1z;
                        const cx = ay * bz - az * by;
                        const cy = az * bx - ax * bz;
                        const cz = ax * by - ay * bx;
                        localArea += 0.5 * Math.sqrt(cx*cx + cy*cy + cz*cz);
                        
                        const v321 = p3x*p2y*p1z;
                        const v231 = p2x*p3y*p1z;
                        const v312 = p3x*p1y*p2z;
                        const v132 = p1x*p3y*p2z;
                        const v213 = p2x*p1y*p3z;
                        const v123 = p1x*p2y*p3z;
                        localVolume += (1.0/6.0)*(-v321 + v231 + v312 - v132 - v213 + v123);
                    }
                    
                    totalArea += localArea;
                    totalVolume += Math.abs(localVolume);
                    
                    if (ifcGeom && typeof (ifcGeom as any).delete === 'function') {
                        (ifcGeom as any).delete();
                    }
                }
                
                const lengthX = maxX === -Infinity ? 0 : maxX - minX;
                const lengthY = maxY === -Infinity ? 0 : maxY - minY;
                const lengthZ = maxZ === -Infinity ? 0 : maxZ - minZ;
                const boundingBoxLength = Math.max(0, lengthX, lengthY, lengthZ);
                
                elementGeometrics.set(mesh.expressID, { 
                   area: (totalArea / 2) * areaScale, 
                   volume: totalVolume * volumeScale, 
                   length: boundingBoxLength * lengthScale 
                });
            });
          } catch (geomError) {
             console.warn("Kunde inte beräkna geometrier från IFC:", geomError);
          }
      }

      for (const [id, data] of Array.from(elementsData.entries())) {
          const groupKey = `${data.ifcTypeName}_${data.name}_${data.storey}`;
          rawElementsRef.current.set(id, { ...data, groupKey });
          
          if (!elementGroups.has(groupKey)) {
            elementGroups.set(groupKey, { count: 0, typeName: data.name, ifcType: data.ifcTypeName, area: 0, length: 0, volume: 0, weight: 0, material: data.extractedMaterial, storey: data.storey });
          }
          const group = elementGroups.get(groupKey)!;
          group.count++;
          if (!group.material && data.extractedMaterial) group.material = data.extractedMaterial;

          let vol = data.extractedVolume;
          let area = data.extractedArea;
          let len = data.extractedLength;

          if (vol === 0 || area === 0 || len === 0) {
             const geomState = elementGeometrics.get(id);
             if (geomState) {
                if (vol === 0) vol = geomState.volume;
                if (area === 0) area = geomState.area;
                if (len === 0) len = geomState.length;
             }
          }

          group.volume += vol;
          group.area += area;
          group.length += len;
          group.weight += data.extractedWeight;
      }

      const elements = Array.from(elementGroups.entries()).map(([key, data]) => {
        let typeVal = '24.1_Fundament';
        if (data.ifcType.toUpperCase().includes('WALL')) typeVal = '31.2_Vagg';
        else if (data.ifcType.toUpperCase().includes('SLAB')) typeVal = '34.1_Bjalklag';
        else if (data.ifcType.toUpperCase().includes('COLUMN')) typeVal = '32.1_Pelare';
        else if (data.ifcType.toUpperCase().includes('BEAM')) typeVal = '33.1_Balk';
        else if (data.ifcType.toUpperCase().includes('FOOTING')) typeVal = '24.1_Fundament';
        else if (data.ifcType.toUpperCase().includes('STAIR')) typeVal = '35.1_Trappa';
        else if (data.ifcType.toUpperCase().includes('ROOF')) typeVal = '34.1_Bjalklag'; // or create a roof type
        // fallback to standard defaults if unknown

        // Define standard units mapping (like in data.ts)
        const typeUnits: Record<string, string> = {
          '31.2_Vagg': 'm²',
          '34.1_Bjalklag': 'm²',
          '32.1_Pelare': 'st',
          '33.1_Balk': 'm',
          '24.1_Fundament': 'st',
          '35.1_Trappa': 'm'
        };
        const unit = typeUnits[typeVal] || 'st';
        
        let qty = data.count;
        if (unit === 'm²' && data.area > 0) {
           qty = data.area;
           qty = Number(qty.toFixed(2));
        } else if (unit === 'm' && data.length > 0) {
           qty = data.length;
           qty = Number(qty.toFixed(2));
        }

        return {
          id: key,
          name: `${data.ifcType}: ${data.typeName}`,
          qty: qty,
          unit: unit === 'm²' ? 'm2' : unit, // Byggdelar currently might expect m2
          type: typeVal,
          ifcType: data.ifcType,
          storey: data.storey,
          originalCount: data.count,
          extractedArea: data.area,
          extractedLength: data.length,
          extractedVolume: data.volume,
          extractedWeight: data.weight,
          material: data.material
        };
      });

      setIfcElements(elements);
      ifcApi.CloseModel(modelID);
      
      setUploaded(true);
    } catch (err: any) {
      console.error("IFC Error details:", err);
      alert('Ett fel uppstod vid tolkning av IFC-filen.\n' + (err?.message || err));
    } finally {
      if (ifcApi && modelID !== null) {
        try { ifcApi.CloseModel(modelID); } catch(e){}
      }
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredElements = ifcElements.filter(el => 
    (!searchQuery || el.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!filterType || el.ifcType === filterType) &&
    (!filterStorey || el.storey === filterStorey)
  );

  const handleImport = () => {
    const partsToImport: Omit<Byggdel, 'id'>[] = ifcElements
      .filter(el => selectedItems.includes(el.id))
      .map(el => {
        let length = el.extractedLength || 0;
        let area = el.extractedArea || 0;
        let volume = el.extractedVolume || 0;
        
        let width = 0.2; 
        let height = 3.0; 
        
        const c = el.originalCount || 1;
        let singleLength = length / c;
        let singleArea = area / c;
        let singleVolume = volume / c;
        
        if (el.unit === 'm2' || el.unit === 'm²') {
           if (singleArea > 0 && singleVolume > 0) {
              width = singleVolume / singleArea; 
           }
        } else if (el.unit === 'm') {
           if (singleLength > 0 && singleVolume > 0) {
              width = Math.sqrt(singleVolume / singleLength); 
              height = width;
           }
        } else if (el.unit === 'st') {
           if (singleVolume > 0) {
             const guessSize = Math.cbrt(singleVolume);
             length = guessSize; width = guessSize; height = guessSize;
           }
        }

        return {
          name: el.name,
          qty: el.qty,
          antal: el.originalCount,
          unit: el.unit,
          type: el.type,
          active: true,
          collapsed: false,
          material: el.material,
          comment: `Importerad från IFC: ${el.ifcType} (${el.storey})`,
          dimensions: {
            length: Number((singleLength > 0 ? singleLength : (length > 0 ? length : 1)).toFixed(3)),
            width: Number((width > 0 ? width : 0.2).toFixed(3)),
            height: Number((height > 0 ? height : 3).toFixed(3)),
            area: Number((singleArea > 0 ? singleArea : (area > 0 ? area : 1)).toFixed(3)),
            qty: el.originalCount,
            weight: Number(((el.extractedWeight || 0) / c).toFixed(2))
          },
          moments: [
            {
              label: 'Arbetsmoment (IFC)',
              material: 'Betong C30/37',
              amount: el.qty, // or some default calculation
              timeUnit: 1,
              active: true
            }
          ]
        };
      });

    addIfcByggdelar(partsToImport);
    setSelectedItems([]);
  };

  const handleSmartTakeoffResult = (takeoffData: any[]) => {
    // takeoffData is array of { storey, typeName, elementName, count, totalVolume, totalArea, totalLength, elements }
    const partsToImport: Omit<Byggdel, 'id'>[] = takeoffData.map((data: any) => {
      // Map to correct kalkyl type based on IFC typeName
      let kalkylType = '24.1_Fundament'; // default
      if (data.typeName.includes('Wall')) kalkylType = '31.2_Vagg';
      else if (data.typeName.includes('Slab')) kalkylType = '34.1_Bjalklag';
      else if (data.typeName.includes('Column')) kalkylType = '32.1_Pelare';
      else if (data.typeName.includes('Beam')) kalkylType = '33.1_Balk';
      else if (data.typeName.includes('Stair')) kalkylType = '35.1_Trappa';
      else if (data.typeName.includes('Footing')) kalkylType = '24.1_Fundament';

      const volume = data.totalVolume;
      const area = data.totalArea;
      
      const dims = {
          length: data.totalLength || 1, // Fallbacks
          width: area && data.totalLength ? area / data.totalLength : (area ? Math.sqrt(area) : 1),
          height: area && volume ? volume / area : 1,
          area: area || 0,
          qty: data.count
      };

      const moments = calculateDefaultMoments(kalkylType, dims);

      return {
        name: data.elementName || data.typeName,
        type: kalkylType,
        group: data.storey, // Set floor as group!
        qty: data.count,
        antal: 1,
        dimensions: dims,
        comment: `Automatisk mängdning från modell. Element: ${data.elements.length} st. Total volym: ${volume.toFixed(2)} m³`,
        active: true,
        moments: moments
      };
    });

    addIfcByggdelar(partsToImport);
  };

  const handleViewerSelect = (selection: any) => {
    const selectedGroupKeys = new Set<string>();
    for (const modelId in selection) {
      const expressIDs = selection[modelId];
      if (expressIDs) {
        expressIDs.forEach((id: number) => {
          const raw = rawElementsRef.current.get(id);
          if (raw && raw.groupKey) {
            selectedGroupKeys.add(raw.groupKey);
          }
        });
      }
    }
    setSelectedItems(Array.from(selectedGroupKeys));
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 my-8">
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm mb-6 flex flex-col h-[calc(100vh-140px)]">
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface2)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-lg font-bold">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-cube text-sm"></i>
            </div>
            IFC V1 Integration
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {!uploaded ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <input 
                type="file" 
                accept=".ifc" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <div 
                className="border-2 border-dashed border-[var(--border)] rounded-xl p-12 w-full max-w-xl mx-auto hover:border-[var(--blue)] transition-colors cursor-pointer bg-[var(--surface)]"
                onClick={handleUploadClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {isUploading ? (
                  <div className="animate-pulse">
                    <i className="fa-solid fa-spinner fa-spin text-4xl text-[var(--blue)] mb-4"></i>
                    <h3 className="text-lg font-bold mb-2">Läser och tolkar IFC-fil...</h3>
                    <p className="text-[var(--text2)] text-sm">Analyserar objekt och extraherar mängder, detta kan ta en liten stund.</p>
                  </div>
                ) : (
                  <>
                    <i className="fa-solid fa-file-import text-5xl text-[var(--border)] mb-4"></i>
                    <h3 className="text-lg font-bold mb-2">Dra och släpp er IFC-fil här</h3>
                    <p className="text-[var(--text2)] text-sm mb-6">eller klicka för att bläddra (stöds format: .ifc)</p>
                    <button type="button" className="px-4 py-2 bg-[var(--blue)] text-white font-bold rounded shadow-sm hover:bg-[var(--blue-dk)] transition-colors text-sm">
                      Välj fil
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)] flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"></i>
                    <input 
                      type="text" 
                      placeholder="Sök namn..." 
                      className="pl-9 pr-3 py-1.5 border border-[var(--border)] rounded text-sm w-48 focus:border-[var(--blue)] outline-none"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      title="Sök på IFC-objektets namn"
                    />
                  </div>
                  <select 
                    className="border border-[var(--border)] rounded px-3 py-1.5 text-sm focus:border-[var(--blue)] outline-none"
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    title="Filtrera på IFC-typ (t.ex. IFCSLAB)"
                  >
                    <option value="">Alla IFC-typer</option>
                    {Array.from(new Set(ifcElements.map(el => el.ifcType))).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select 
                    className="border border-[var(--border)] rounded px-3 py-1.5 text-sm focus:border-[var(--blue)] outline-none"
                    value={filterStorey}
                    onChange={e => setFilterStorey(e.target.value)}
                    title="Filtrera på våning"
                  >
                    <option value="">Alla Våningar</option>
                    {Array.from(new Set(ifcElements.map(el => el.storey))).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <span className="text-xs text-[var(--text2)] font-semibold whitespace-nowrap ml-2">
                    {filteredElements.length} av {ifcElements.length} objekt
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewMode(viewMode === 'data' ? 'viewer' : 'data')}
                    className="px-3 py-1.5 border border-[var(--border)] text-[var(--text2)] font-bold rounded hover:bg-[var(--surface2)] transition-colors text-xs"
                  >
                    <i className={`fa-solid ${viewMode === 'data' ? 'fa-cube' : 'fa-list'} mr-2`}></i>
                    {viewMode === 'data' ? '3D Viewer' : 'Kolumnvy'}
                  </button>
                  <button 
                    onClick={() => {
                      setUploaded(false);
                      setIfcFile(null);
                    }}
                    className="px-3 py-1.5 border border-[var(--border)] text-[var(--text2)] font-bold rounded hover:bg-[var(--surface2)] transition-colors text-xs"
                  >
                    Ladda upp ny
                  </button>
                  <button 
                    onClick={handleImport}
                    disabled={selectedItems.length === 0}
                    className="px-3 py-1.5 bg-[var(--blue)] text-white font-bold rounded hover:bg-[var(--blue-dk)] transition-colors text-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-plus"></i> Skicka till kalkylen ({selectedItems.length})
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col min-h-0 relative">
                <div 
                  className="absolute inset-0 bg-[#1a1a1a]"
                  style={{ display: viewMode === 'viewer' && ifcFile ? 'block' : 'none', zIndex: 10 }}
                >
                  {ifcFile && <ViewerUI file={ifcFile} onSelect={handleViewerSelect} onTakeoff={handleSmartTakeoffResult} />}
                </div>

                <div 
                  className="absolute inset-0 overflow-x-auto bg-white"
                  style={{ display: viewMode === 'data' ? 'block' : 'none' }}
                >
                  <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                  <thead className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-[var(--border)] shadow-sm">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedItems.length > 0 && selectedItems.length === filteredElements.length}
                          onChange={(e) => {
                             if (e.target.checked) setSelectedItems(filteredElements.map(el => el.id));
                             else setSelectedItems([]);
                          }}
                        />
                      </th>
                      <th className="p-3 font-semibold text-[var(--text2)] whitespace-nowrap">Typ / Namn</th>
                      <th className="p-3 font-semibold text-[var(--text2)] whitespace-nowrap">Våning</th>
                      <th className="p-3 font-semibold text-[var(--text2)] text-right whitespace-nowrap">Antal (st)</th>
                      <th className="p-3 font-semibold text-[var(--text)] text-right whitespace-nowrap">Totalmängd</th>
                      <th className="p-3 font-semibold text-[var(--text2)] text-right whitespace-nowrap">Längd (snitt)</th>
                      <th className="p-3 font-semibold text-[var(--text2)] text-right whitespace-nowrap">Area (snitt)</th>
                      <th className="p-3 font-semibold text-[var(--text2)] text-right whitespace-nowrap">Volym (snitt)</th>
                      <th className="p-3 font-semibold text-[var(--text2)] text-right whitespace-nowrap">Vikt (snitt)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredElements.map(el => {
                      const singleL = el.originalCount > 0 ? el.extractedLength / el.originalCount : 0;
                      const singleA = el.originalCount > 0 ? el.extractedArea / el.originalCount : 0;
                      const singleV = el.originalCount > 0 ? el.extractedVolume / el.originalCount : 0;
                      const singleW = el.originalCount > 0 ? el.extractedWeight / el.originalCount : 0;
                      const isSelected = selectedItems.includes(el.id);
                      
                      return (
                        <tr 
                          key={el.id}
                          onClick={() => handleToggleItem(el.id)}
                          className={`border-b border-[var(--border)] cursor-pointer hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}
                        >
                          <td className="p-3 text-center">
                            <input type="checkbox" checked={isSelected} readOnly />
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-[var(--text)]">{el.name}</div>
                            <div className="flex gap-2 items-center mt-1">
                                <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{el.ifcType}</span>
                                {el.material && <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded truncate max-w-[100px]">{el.material}</span>}
                            </div>
                          </td>
                          <td className="p-3 text-[var(--text2)]">{el.storey}</td>
                          <td className="p-3 text-right mono">{el.originalCount}</td>
                          <td className="p-3 text-right font-bold text-[var(--blue)] mono">{el.qty.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {el.unit}</td>
                          <td className="p-3 text-right mono text-[var(--text2)]">{singleL > 0 ? `${singleL.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m` : '-'}</td>
                          <td className="p-3 text-right mono text-[var(--text2)]">{singleA > 0 ? `${singleA.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²` : '-'}</td>
                          <td className="p-3 text-right mono text-[var(--text2)]">{singleV > 0 ? `${singleV.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³` : '-'}</td>
                          <td className="p-3 text-right mono text-[var(--text2)]">{singleW > 0 ? `${singleW.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg` : '-'}</td>
                        </tr>
                      );
                    })}
                    {filteredElements.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-[var(--text3)]">
                          Inga IFC-objekt hittades för dina valda filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
