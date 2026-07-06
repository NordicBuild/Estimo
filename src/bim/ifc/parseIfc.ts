import * as WebIFC from 'web-ifc';
import * as THREE from 'three';
import { inferStorey, classifyDiscipline, extractProperties } from './classify';

export interface ParsedIfcElement {
  expressID: number; 
  guid: string; 
  category: string; 
  name: string;
  storey: string; 
  discipline: string; 
  properties: Record<string, any>;
}

export interface ParsedIfcModel {
  elements: ParsedIfcElement[];
  meshes: { 
    expressID: number; 
    geometry: THREE.BufferGeometry;
    color: [number, number, number, number];
  }[];
  storeys: string[]; 
  disciplines: string[];
}

export async function parseIfc(
  file: ArrayBuffer, 
  onProgress?: (pct: number) => void
): Promise<ParsedIfcModel> {
  const ifcApi = new WebIFC.IfcAPI();
  ifcApi.SetWasmPath('/wasm/', true);
  await ifcApi.Init();

  let model: number = -1;
  try {
    const fileUint8Array = new Uint8Array(file);
    model = ifcApi.OpenModel(fileUint8Array);

    const typesToExtract = [
      WebIFC.IFCWALL,
      WebIFC.IFCWALLSTANDARDCASE,
      WebIFC.IFCSLAB,
      WebIFC.IFCCOLUMN,
      WebIFC.IFCBEAM,
      WebIFC.IFCWINDOW,
      WebIFC.IFCDOOR,
      WebIFC.IFCROOF,
      WebIFC.IFCSTAIR,
      WebIFC.IFCRAILING,
      WebIFC.IFCBUILDINGELEMENTPROXY,
      WebIFC.IFCSPACE
    ];

    const elements: ParsedIfcElement[] = [];
    const storeysSet = new Set<string>();
    const disciplinesSet = new Set<string>();

    // 1. Extract Elements
    let totalLines = 0;
    const linesByType = new Map<number, WebIFC.IfcLineObject>();
    
    for (const type of typesToExtract) {
      const lines = ifcApi.GetLineIDsWithType(model, type);
      linesByType.set(type, lines as any);
      totalLines += lines.size();
    }

    let processedLines = 0;

    for (const type of typesToExtract) {
      const lines = linesByType.get(type) as any;
      const size = lines.size();
      for (let i = 0; i < size; i++) {
        const expressID = lines.get(i);
        try {
          const ifcElement = ifcApi.GetLine(model, expressID, true);
          if (!ifcElement) continue;

          const guid = ifcElement.GlobalId?.value;
          const name = ifcElement.Name?.value || "Unnamed";
          const category = ifcApi.GetNameFromTypeCode(ifcElement.type);
          
          if (!guid || !category) continue;

          const properties = await extractProperties(ifcApi, model, expressID, ifcElement);
          const storey = inferStorey(name);
          const discipline = classifyDiscipline(category, properties.ObjectType, properties.Material);
          
          storeysSet.add(storey);
          disciplinesSet.add(discipline);

          properties.Name = name;
          properties.ExpressID = expressID;
          if (!properties.ObjectType && ifcElement.ObjectType?.value) {
            properties.ObjectType = ifcElement.ObjectType.value;
          }

          elements.push({
            expressID,
            guid,
            category,
            name,
            storey,
            discipline,
            properties
          });
        } catch (e) {
          console.warn(`[BIM] Failed to process line ${expressID}:`, e);
        }

        processedLines++;
        if (onProgress) {
          // allocate first 50% for parsing properties
          onProgress((processedLines / totalLines) * 50);
        }
      }
    }

    // 2. Stream Meshes
    const meshes: ParsedIfcModel['meshes'] = [];
    
    // To calculate progress for meshes, we don't know total upfront easily, 
    // but StreamAllMeshes gives us a callback.
    // For simplicity, we just stream.
    ifcApi.StreamAllMeshes(model, (mesh: any) => {
      const expressID = mesh.expressID;
      const geometries = mesh.geometries;
      const size = geometries.size();

      for (let i = 0; i < size; i++) {
        const placedGeometry = geometries.get(i);
        const geometry = ifcApi.GetGeometry(model, placedGeometry.geometryExpressID);
        
        const vertexData = ifcApi.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
        const indexData = ifcApi.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
        
        const bufferGeometry = new THREE.BufferGeometry();
        
        // Each vertex has 6 floats: x, y, z, nx, ny, nz
        const positions = new Float32Array(vertexData.length / 2);
        const normals = new Float32Array(vertexData.length / 2);
        
        for (let j = 0; j < vertexData.length; j += 6) {
          positions[j / 2] = vertexData[j];
          positions[j / 2 + 1] = vertexData[j + 1];
          positions[j / 2 + 2] = vertexData[j + 2];
          normals[j / 2] = vertexData[j + 3];
          normals[j / 2 + 1] = vertexData[j + 4];
          normals[j / 2 + 2] = vertexData[j + 5];
        }

        bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        bufferGeometry.setIndex(new THREE.BufferAttribute(indexData, 1));

        const transform = placedGeometry.flatTransformation;
        const matrix = new THREE.Matrix4().fromArray(transform);
        bufferGeometry.applyMatrix4(matrix);

        const color = placedGeometry.color; // {x: r, y: g, z: b, w: a}
        meshes.push({
          expressID,
          geometry: bufferGeometry,
          color: [color.x, color.y, color.z, color.w]
        });
      }
    });

    if (onProgress) {
      onProgress(100);
    }

    return {
      elements,
      meshes,
      storeys: Array.from(storeysSet),
      disciplines: Array.from(disciplinesSet)
    };

  } finally {
    if (model !== -1) {
      ifcApi.CloseModel(model);
    }
    // No explicit memory free needed for the API wrapper except CloseModel usually,
    // but if we need we can do ifcApi.Dispose() or similar if supported.
  }
}
