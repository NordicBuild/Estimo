import * as THREE from 'three';
import * as WebIFC from 'web-ifc';

export interface IFCElement {
  expressID: number;
  type: number;
  typeName: string;
  name: string;
  mesh?: THREE.Group;
  properties?: any;
}

export class IFCLoader {
  private ifcApi: WebIFC.IfcAPI | null = null;
  private currentModelID: number | null = null;
  public elements: Map<number, IFCElement> = new Map();
  public modelGroup: THREE.Group;
  
  // Materials used for rendering based on IFC element types or default fallback
  private defaultMaterial: THREE.MeshLambertMaterial;
  private transparentMaterial: THREE.MeshLambertMaterial;
  private selectedMaterial: THREE.MeshLambertMaterial;

  constructor() {
    this.modelGroup = new THREE.Group();
    
    this.defaultMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
    this.transparentMaterial = new THREE.MeshLambertMaterial({ color: 0x99ccff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    this.selectedMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.8 });
  }

  public async init() {
    const { getIfcApi } = await import('./IfcAPI');
    this.ifcApi = await getIfcApi();
  }

  public async loadFile(file: File, onProgress?: (progress: number, total: number) => void): Promise<THREE.Group> {
    if (!this.ifcApi) await this.init();
    if (this.currentModelID !== null) {
      this.closeModel();
    }
    
    this.elements.clear();
    this.modelGroup.clear();
    
    const data = new Uint8Array(await file.arrayBuffer());
    this.currentModelID = this.ifcApi!.OpenModel(data);

    // Get all meshes (we fetch all types)
    this.ifcApi!.StreamAllMeshes(this.currentModelID, (mesh: WebIFC.FlatMesh) => {
      const expressID = mesh.expressID;
      
      const parts: THREE.Mesh[] = [];

      for (let i = 0; i < mesh.geometries.size(); i++) {
        const placedGeom = mesh.geometries.get(i);
        const ifcGeom = this.ifcApi!.GetGeometry(this.currentModelID!, placedGeom.geometryExpressID);
        
        const vertices = this.ifcApi!.GetVertexArray(ifcGeom.GetVertexData(), ifcGeom.GetVertexDataSize());
        const indices = this.ifcApi!.GetIndexArray(ifcGeom.GetIndexData(), ifcGeom.GetIndexDataSize());
        const matrix = placedGeom.flatTransformation;
        
        // Extract position and normals from interleaved vertex buffer
        const posArray = new Float32Array((vertices.length / 6) * 3);
        const normArray = new Float32Array((vertices.length / 6) * 3);
        
        for (let j = 0; j < vertices.length; j += 6) {
           const idx = (j / 6) * 3;
           posArray[idx] = vertices[j];
           posArray[idx + 1] = vertices[j + 1];
           posArray[idx + 2] = vertices[j + 2];
           
           normArray[idx] = vertices[j + 3];
           normArray[idx + 1] = vertices[j + 4];
           normArray[idx + 2] = vertices[j + 5];
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        
        // Apply transform
        const transform = new THREE.Matrix4().fromArray(matrix);
        geometry.applyMatrix4(transform);
        
        // Use a generic material based on expressID or let's try to infer if it's a window
        // But for simplicity, we'll try to just assign default material right now
        // A better approach looks at the color provided in placedGeom if available
        let color = new THREE.Color(placedGeom.color.x, placedGeom.color.y, placedGeom.color.z);
        let opacity = placedGeom.color.w;
        let material = this.defaultMaterial;
        
        if (opacity < 1.0) {
            material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide });
        } else if (color.getHex() !== 0x000000) {
            material = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
        }

        const meshObj = new THREE.Mesh(geometry, material);
        // store expressID on mesh user data for selection
        meshObj.userData.expressID = expressID;
        parts.push(meshObj);
      }
      
      if (parts.length > 0) {
         const group = new THREE.Group();
         parts.forEach(p => group.add(p));
         
         this.elements.set(expressID, {
           expressID: expressID,
           type: 0, // Need to fetch type
           typeName: '', // Need to fetch name
           name: "", // Need to fetch name
           mesh: group
         });
         
         this.modelGroup.add(group);
      }
      
      if (onProgress) {
         onProgress(this.elements.size, this.elements.size); // approximate
      }
    });

    // Populate metadata
    this.autoNameElements();

    return this.modelGroup;
  }
  
  private autoNameElements() {
     if (this.currentModelID === null || !this.ifcApi) return;
     for (const [id, el] of this.elements.entries()) {
        try {
           const line = this.ifcApi.GetLine(this.currentModelID, id);
           el.name = line?.Name?.value || line?.ObjectType?.value || `Element ${id}`;
           el.type = line?.type || 0;
           el.typeName = this.ifcApi.GetNameFromTypeCode(el.type) || 'Unknown';
           if (el.mesh) {
              el.mesh.name = el.name;
              el.mesh.userData.type = el.type;
              el.mesh.userData.typeName = el.typeName;
           }
        } catch (e) {
           el.name = `Element ${id}`;
        }
     }
  }

  public getProperties(expressID: number): any {
    if (this.currentModelID === null || !this.ifcApi) return null;
    try {
       const line = this.ifcApi.GetLine(this.currentModelID, expressID);
       return line;
    } catch {
       return null;
    }
  }
  
  public async getPropertySets(expressID: number) {
     if (this.currentModelID === null || !this.ifcApi) return null;
     try {
        const psets = await this.ifcApi.properties.getPropertySets(this.currentModelID, expressID, true);
        return psets;
     } catch {
        return [];
     }
  }

  public closeModel() {
     if (this.currentModelID !== null && this.ifcApi) {
        this.ifcApi.CloseModel(this.currentModelID);
        this.currentModelID = null;
     }
     
     // Dispose three.js resources
     this.modelGroup.traverse((object: any) => {
        if (object.geometry) {
           object.geometry.dispose();
        }
        if (object.material) {
           if (Array.isArray(object.material)) {
              object.material.forEach((mat: any) => mat.dispose());
           } else {
              object.material.dispose();
           }
        }
     });

     this.elements.clear();
     this.modelGroup.clear();
  }
}
