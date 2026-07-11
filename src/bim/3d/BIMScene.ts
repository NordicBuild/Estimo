import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import * as WebIFC from 'web-ifc';

export interface BIMSceneConfig {
  backgroundColor?: number | string;
  lighting?: boolean;
  performance?: 'high' | 'low';
}

/**
 * Core THREE.js scene manager for BIM viewer.
 */
export class BIMScene {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver;

  private modelGroup: THREE.Group;
  private elementsMap: Map<string, THREE.Mesh | THREE.Object3D> = new Map();
  private originalMaterials: Map<string, THREE.Material | THREE.Material[]> = new Map();
  
  private selectedElements: Set<string> = new Set();
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private pickCallback?: (elementId: string | null) => void;

  private clippingPlanes: {
    minX: THREE.Plane; maxX: THREE.Plane;
    minY: THREE.Plane; maxY: THREE.Plane;
    minZ: THREE.Plane; maxZ: THREE.Plane;
  };
  private boundingBox: THREE.Box3 = new THREE.Box3();

  
  
  private ifcApi: WebIFC.IfcAPI | null = null;

  private async getIfcApi(): Promise<WebIFC.IfcAPI> {
    if (this.ifcApi) return this.ifcApi;
    const api = new WebIFC.IfcAPI();
    api.SetWasmPath('/wasm/', true);
    await api.Init();
    this.ifcApi = api;
    return api;
  }

  private highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    depthTest: false,
    transparent: true,
    opacity: 0.5
  });

  constructor(canvas: HTMLCanvasElement, config?: BIMSceneConfig) {
    this.canvas = canvas;
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: config?.performance !== 'low',
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;

    if (config?.backgroundColor) {
      this.renderer.setClearColor(config.backgroundColor);
    } else {
      this.renderer.setClearColor(0xf0f0f0);
    }

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 10000);
    this.camera.position.set(10, 10, 10);

    // Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // Lighting
    if (config?.lighting !== false) {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(10, 20, 10);
      this.scene.add(dirLight);
    }

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    // Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Clipping planes setup
    this.clippingPlanes = {
      minX: new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
      maxX: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
      minY: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      maxY: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
      minZ: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      maxZ: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)
    };

    // Event listeners
    this.canvas.addEventListener('click', this.onClick.bind(this));
    this.canvas.addEventListener('touchstart', this.onTouch.bind(this), { passive: true });

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement || canvas);

    this.animate();
  }

  /**
   * Animation loop
   */
  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Handle resize
   */
  private resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Setup materials with clipping planes
   */
  private setupMaterialClipping(material: THREE.Material) {
    material.clippingPlanes = [
      this.clippingPlanes.minX, this.clippingPlanes.maxX,
      this.clippingPlanes.minY, this.clippingPlanes.maxY,
      this.clippingPlanes.minZ, this.clippingPlanes.maxZ
    ];
    material.needsUpdate = true;
  }

  public generateMockScene(): any[] {
    this.modelGroup.clear();
    this.elementsMap.clear();
    this.originalMaterials.clear();
    this.selectedElements.clear();

    const elements = [];

    // Base slab
    const slabGeom = new THREE.BoxGeometry(20, 0.5, 20);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const slab = new THREE.Mesh(slabGeom, slabMat);
    slab.position.set(0, -0.25, 0);
    const slabId = THREE.MathUtils.generateUUID();
    slab.userData = { guid: slabId, category: 'IfcSlab', storey: 'PLAN 10', discipline: 'STRUCTURE' };
    slab.name = 'Base Slab';
    this.modelGroup.add(slab);
    this.elementsMap.set(slabId, slab);
    this.originalMaterials.set(slabId, slabMat);
    this.setupMaterialClipping(slabMat);
    elements.push({ id: slabId, guid: slabId, name: 'Base Slab', category: 'IfcSlab', storey: 'PLAN 10', discipline: 'STRUCTURE', properties: { Area: 400, Volume: 200, Material: 'Concrete' } });

    // Walls
    const wallGeom = new THREE.BoxGeometry(0.5, 3, 20);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    
    for (let i = 0; i < 2; i++) {
        const wall = new THREE.Mesh(wallGeom, wallMat.clone());
        wall.position.set(i === 0 ? -9.75 : 9.75, 1.5, 0);
        const wallId = THREE.MathUtils.generateUUID();
        wall.userData = { guid: wallId, category: 'IfcWall', storey: 'PLAN 10', discipline: 'ARCHITECTURE' };
        wall.name = `Exterior Wall ${i + 1}`;
        this.modelGroup.add(wall);
        this.elementsMap.set(wallId, wall);
        this.originalMaterials.set(wallId, wall.material);
        this.setupMaterialClipping(wall.material as THREE.Material);
        elements.push({ id: wallId, guid: wallId, name: wall.name, category: 'IfcWall', storey: 'PLAN 10', discipline: 'ARCHITECTURE', properties: { Area: 60, Volume: 30, Length: 20 } });
    }

    // A few columns
    const colGeom = new THREE.BoxGeometry(0.5, 3, 0.5);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    for (let x = -5; x <= 5; x+=5) {
        for (let z = -5; z <= 5; z+=5) {
            const col = new THREE.Mesh(colGeom, colMat.clone());
            col.position.set(x, 1.5, z);
            const colId = THREE.MathUtils.generateUUID();
            col.userData = { guid: colId, category: 'IfcColumn', storey: 'PLAN 10', discipline: 'STRUCTURE' };
            col.name = `Column ${x}_${z}`;
            this.modelGroup.add(col);
            this.elementsMap.set(colId, col);
            this.originalMaterials.set(colId, col.material);
            this.setupMaterialClipping(col.material as THREE.Material);
            elements.push({ id: colId, guid: colId, name: col.name, category: 'IfcColumn', storey: 'PLAN 10', discipline: 'STRUCTURE', properties: { Volume: 0.75, Length: 3 } });
        }
    }

    this.boundingBox.setFromObject(this.modelGroup);
    return elements;
  }

  /**
   * Loads an IFC model
   * @param url URL to the IFC file
   */
  public async loadIFC(url: string): Promise<any[]> {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const buf = new Uint8Array(buffer);

      const api = await this.getIfcApi();
      const modelID = api.OpenModel(buf, { COORDINATE_TO_ORIGIN: true });

      this.modelGroup.clear();
      this.elementsMap.clear();
      this.originalMaterials.clear();
      this.selectedElements.clear();

      

      const elements: any[] = [];
      const expressIDs = new Set<number>();

      api.StreamAllMeshes(modelID, (flatMesh) => {
        expressIDs.add(flatMesh.expressID);
        const size = flatMesh.geometries.size();
        for (let i = 0; i < size; i++) {
          const placed = flatMesh.geometries.get(i);
          const g = api.GetGeometry(modelID, placed.geometryExpressID);
          
          const verts = api.GetVertexArray(g.GetVertexData(), g.GetVertexDataSize());
          const idx = api.GetIndexArray(g.GetIndexData(), g.GetIndexDataSize());

          const geometry = new THREE.BufferGeometry();
          const position = new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(verts, 6), 3, 0);
          const normal = new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(verts, 6), 3, 3);
          geometry.setAttribute('position', position);
          geometry.setAttribute('normal', normal);
          geometry.setIndex(new THREE.BufferAttribute(idx, 1));

          const color = placed.color;
          const material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(color.x, color.y, color.z),
            transparent: color.w < 1,
            opacity: color.w
          });
          this.setupMaterialClipping(material);

          const mesh = new THREE.Mesh(geometry, material);
          mesh.matrix.fromArray(placed.flatTransformation);
          mesh.matrixAutoUpdate = false;

          const elementId = `Element_${flatMesh.expressID}`;
          mesh.name = elementId;
          mesh.userData = { expressID: flatMesh.expressID, guid: elementId };
          
          this.modelGroup.add(mesh);
          this.elementsMap.set(elementId, mesh);
          this.originalMaterials.set(elementId, mesh.material);

          g.delete(); // Free WASM memory
        }
      });

      // Transform Z-up to Y-up
      this.modelGroup.rotation.x = -Math.PI / 2;
      this.modelGroup.updateMatrixWorld(true);

      this.boundingBox.setFromObject(this.modelGroup);

      // Build element list with web-ifc properties
      let spatialTree: any = null;
      try {
        spatialTree = await api.properties.getSpatialStructure(modelID, true);
      } catch (e) {
        console.warn('Could not get spatial structure', e);
      }

      const storeyMap = new Map<number, string>();
      const traverseTree = async (node: any, parentStorey: string = 'Unknown') => {
        if (!node) return;
        let currentStorey = parentStorey;
        if (node.type === 'IFCBUILDINGSTOREY') {
          try {
            const props = await api.properties.getItemProperties(modelID, node.expressID, false);
            if (props && props.Name && props.Name.value) {
              currentStorey = props.Name.value;
            }
          } catch (e) {}
        }
        storeyMap.set(node.expressID, currentStorey);
        if (node.children) {
          for (const child of node.children) {
            await traverseTree(child, currentStorey);
          }
        }
      };

      if (spatialTree) {
        await traverseTree(spatialTree);
      }

      for (const expressID of expressIDs) {
        let name = `Element ${expressID}`;
        let category = 'IfcBuildingElementProxy';
        let props: any = {};
        let guid = String(expressID);

        try {
          const typeCode = api.GetLineType(modelID, expressID);
          if (typeCode !== undefined) {
            const typeName = api.GetNameFromTypeCode(typeCode);
            if (typeName) category = typeName;
          }
        } catch (e) {}

        try {
          const itemProps = await api.properties.getItemProperties(modelID, expressID, true);
          if (itemProps) {
            props = itemProps;
            if (props.Name && props.Name.value) name = props.Name.value;
            if (props.GlobalId && props.GlobalId.value) guid = props.GlobalId.value;
          }
        } catch (e) {
          console.warn(`Could not get properties for ${expressID}`, e);
        }

        elements.push({
          id: `Element_${expressID}`,
          guid: guid,
          name: name,
          category: category,
          storey: storeyMap.get(expressID) || 'Unknown',
          discipline: 'ARCHITECTURE',
          properties: { ...props, ExpressID: expressID }
        });
      }

      if (elements.length === 0) {
        console.log(`[BIMScene] Fallback: reading mesh user data`);
        this.modelGroup.children.forEach((mesh: any) => {
          const expressID = mesh.userData?.expressID;
          const elementId = mesh.userData?.guid || mesh.uuid;
          elements.push({
            id: elementId,
            guid: elementId,
            name: mesh.name || `IFC Element ${elementId.substring(0, 5)}`,
            category: 'IfcBuildingElementProxy',
            storey: 'Unknown',
            discipline: 'ARCHITECTURE',
            properties: expressID ? { ExpressID: expressID } : {}
          });
        });
      }

      this.frameAll();

      return elements;
    } catch (e) {
      console.error('Failed to load IFC:', e);
      throw e;
    }
  }

  /**
   * Loads a GLB model
   * @param url URL to the GLB file
   */
  public async loadGLB(url: string): Promise<any[]> {
    const loader = new GLTFLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => {
        // Clear previous
        this.modelGroup.clear();
        this.elementsMap.clear();
        this.originalMaterials.clear();
        this.selectedElements.clear();

        const model = gltf.scene;
        const elements: any[] = [];
        
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            
            // Assume the name or uuid is the element ID
            // In a real scenario, this comes from userData.guid or similar
            const elementId = mesh.userData?.guid || mesh.name || mesh.uuid;
            this.elementsMap.set(elementId, mesh);
            
            // Store original material
            this.originalMaterials.set(elementId, mesh.material);

            // Apply clipping planes to material
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => this.setupMaterialClipping(m));
            } else {
              this.setupMaterialClipping(mesh.material);
            }

            elements.push({
               id: elementId,
               guid: elementId,
               name: mesh.name || elementId,
               category: mesh.userData?.category || 'IfcBuildingElementProxy',
               storey: mesh.userData?.storey || 'Level 1',
               discipline: mesh.userData?.discipline || 'ARCHITECTURE',
               properties: mesh.userData?.properties || {}
            });
          }
        });

        this.modelGroup.add(model);
        
        // Calculate bounding box and center camera
        this.boundingBox.setFromObject(model);
        this.frameAll();
        
        resolve(elements);
      }, undefined, (err) => {
        // warning removed
        const mockElements = this.generateMockScene();
        this.frameAll();
        resolve(mockElements);
      });
    });
  }

  /**
   * Selects an element by its ID
   * @param elementId ID of the element to select
   */
  public selectElement(elementId: string): void {
    this.selectedElements.add(elementId);
    
    const mesh = this.elementsMap.get(elementId);
    if (!mesh || !(mesh as THREE.Mesh).isMesh) return;

    const m = mesh as THREE.Mesh;
    
    // Create highlight material
    // Clone original and add emission or change color
    const origMat = this.originalMaterials.get(elementId);
    if (origMat) {
      if (Array.isArray(origMat)) {
        m.material = origMat.map(mat => {
          const mClone = mat.clone() as THREE.MeshStandardMaterial;
          mClone.emissive = new THREE.Color(0x00ff00);
          mClone.emissiveIntensity = 0.5;
          return mClone;
        });
      } else {
        const mClone = origMat.clone() as THREE.MeshStandardMaterial;
        mClone.emissive = new THREE.Color(0x00ff00);
        mClone.emissiveIntensity = 0.5;
        m.material = mClone;
      }
    }
  }

  /**
   * Deselects all elements
   */
  public deselectAll(): void {
    this.selectedElements.forEach(id => {
      const mesh = this.elementsMap.get(id);
      if (mesh && (mesh as THREE.Mesh).isMesh) {
        const origMat = this.originalMaterials.get(id);
        if (origMat) {
          (mesh as THREE.Mesh).material = origMat;
        }
      }
    });
    this.selectedElements.clear();
  }

  /**
   * Sets visibility of an element
   */
  public setElementVisibility(elementId: string, visible: boolean): void {
    const mesh = this.elementsMap.get(elementId);
    if (mesh) {
      mesh.visible = visible;
    }
  }

  /**
   * Updates clipping planes
   * @param axisX [min, max] percentage 0-100
   * @param axisY [min, max] percentage 0-100
   * @param axisZ [min, max] percentage 0-100
   */
  public setClippingEnabled(enabled: boolean): void {
    this.renderer.localClippingEnabled = enabled;
  }

  public setClippingPlanes(axisX: [number, number], axisY: [number, number], axisZ: [number, number]): void {
    if (this.boundingBox.isEmpty()) return;

    const size = new THREE.Vector3();
    this.boundingBox.getSize(size);
    const min = this.boundingBox.min;
    
    // Convert 0-100 range to actual world coordinates
    const x0 = min.x + (axisX[0] / 100) * size.x;
    const x1 = min.x + (axisX[1] / 100) * size.x;
    const y0 = min.y + (axisY[0] / 100) * size.y;
    const y1 = min.y + (axisY[1] / 100) * size.y;
    const z0 = min.z + (axisZ[0] / 100) * size.z;
    const z1 = min.z + (axisZ[1] / 100) * size.z;

    this.clippingPlanes.minX.constant = x0;
    this.clippingPlanes.maxX.constant = -x1;
    this.clippingPlanes.minY.constant = y0;
    this.clippingPlanes.maxY.constant = -y1;
    this.clippingPlanes.minZ.constant = z0;
    this.clippingPlanes.maxZ.constant = -z1;
  }

  /**
   * Registers a callback for element picking
   */
  public onPick(callback: (elementId: string | null) => void): void {
    this.pickCallback = callback;
  }

  /**
   * Raycast based on pointer event
   */
  private doPick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObject(this.modelGroup, true);
    
    if (intersects.length > 0) {
      // Find the first visible and valid intersected object
      for (const hit of intersects) {
        if (hit.object.visible) {
          const elementId = hit.object.name || hit.object.userData?.guid || hit.object.uuid;
          if (this.pickCallback) {
            this.pickCallback(elementId);
            return;
          }
        }
      }
    }
    
    if (this.pickCallback) {
      this.pickCallback(null);
    }
  }

  private onClick(event: MouseEvent) {
    this.doPick(event.clientX, event.clientY);
  }

  private onTouch(event: TouchEvent) {
    if (event.touches.length > 0) {
      this.doPick(event.touches[0].clientX, event.touches[0].clientY);
    }
  }

  /**
   * Gets bounding box of specific element
   */
  public getElementBoundingBox(elementId: string): THREE.Box3 | null {
    const mesh = this.elementsMap.get(elementId);
    if (!mesh) return null;
    
    const box = new THREE.Box3().setFromObject(mesh);
    return box;
  }

  /**
   * Frames the camera around currently selected elements
   */
  public frameSelection(): void {
    if (this.selectedElements.size === 0) return;

    const combinedBox = new THREE.Box3();
    let hasValidBox = false;

    this.selectedElements.forEach(id => {
      const box = this.getElementBoundingBox(id);
      if (box && !box.isEmpty()) {
        if (!hasValidBox) {
          combinedBox.copy(box);
          hasValidBox = true;
        } else {
          combinedBox.union(box);
        }
      }
    });

    if (hasValidBox) {
      this.frameBox(combinedBox);
    }
  }

  /**
   * Frames the camera around the entire model
   */
  public frameAll(): void {
    if (!this.boundingBox.isEmpty()) {
      this.frameBox(this.boundingBox);
    }
  }

  /**
   * Smoothly frames a specific bounding box
   */
  private frameBox(box: THREE.Box3) {
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    
    cameraZ *= 1.5; // Zoom out a little so object isn't filling the screen

    const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    const newCameraPos = center.clone().add(direction.multiplyScalar(cameraZ));

    // Instant update for now (could be animated with gsap/tween)
    this.camera.position.copy(newCameraPos);
    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Changes the color scheme of the model
   * @param mode 'default' | 'by-category' | 'by-discipline'
   */
  public setColorMode(mode: 'default' | 'by-category' | 'by-discipline', elementsData?: any[]): void {
    this.elementsMap.forEach((mesh, id) => {
      if (!(mesh as THREE.Mesh).isMesh) return;
      
      const m = mesh as THREE.Mesh;
      if (mode === 'default') {
        const origMat = this.originalMaterials.get(id);
        if (origMat) {
          m.material = origMat;
        }
      } else {
        // Find corresponding database element for metadata if available
        let category = m.userData?.category || 'unknown';
        let discipline = m.userData?.discipline || 'unknown';
        
        if (elementsData) {
           let expressIdStr = id.startsWith('Element_') ? id.replace('Element_', '') : 
                              id.startsWith('Mesh_') ? id.replace('Mesh_', '') : null;
           
           if (expressIdStr) {
             const dbEl = elementsData.find(e => String(e.properties?.ExpressID) === expressIdStr);
             if (dbEl) {
               category = dbEl.category || category;
               discipline = dbEl.discipline || discipline;
             }
           } else {
             const dbEl = elementsData.find(e => e.id === id);
             if (dbEl) {
               category = dbEl.category || category;
               discipline = dbEl.discipline || discipline;
             }
           }
        }

        // Simple distinct color generation based on a string property
        const prop = mode === 'by-category' ? category : discipline;
        
        let hash = 0;
        for (let i = 0; i < prop.length; i++) {
          hash = prop.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = new THREE.Color((hash & 0x00FFFFFF) + 0x555555);
        
        const newMat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.5,
          metalness: 0.1
        });
        this.setupMaterialClipping(newMat);
        
        m.material = newMat;
        
        // Re-apply selection highlight if needed
        if (this.selectedElements.has(id)) {
          newMat.emissive = new THREE.Color(0x00ff00);
          newMat.emissiveIntensity = 0.5;
        }
      }
    });
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.resizeObserver.disconnect();
    
    this.canvas.removeEventListener('click', this.onClick.bind(this));
    this.canvas.removeEventListener('touchstart', this.onTouch.bind(this));
    
    this.controls.dispose();
    this.renderer.dispose();
    
    this.modelGroup.clear();
    // Proper ThreeJS disposal of geometries and materials
    this.elementsMap.forEach(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      }
    });
    
    this.originalMaterials.forEach(mat => {
      if (Array.isArray(mat)) {
        mat.forEach(m => m.dispose());
      } else {
        mat.dispose();
      }
    });
  }
}
