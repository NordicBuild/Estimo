import * as THREE from 'three';
import { ViewerCore } from './core/ViewerCore';
import { IFCLoader } from './core/IFCLoader';
import { MeasurementTool } from './utils/MeasurementTool';
import { AreaVolumeTool } from './utils/AreaVolumeTool';

export class IFCVManager {
  public core: ViewerCore;
  public loader: IFCLoader;
  public measureTool: MeasurementTool;
  public areaVolumeTool: AreaVolumeTool;
  private fileObj: File | null = null;
  private selectionMaterial: THREE.MeshLambertMaterial;
  public selectedObjects: Map<number, { mesh: THREE.Mesh, originalMaterial: THREE.Material | THREE.Material[] }[]> = new Map();
  
  public onSelect?: (expressIDs: number[]) => void;

  private initPromise: Promise<void>;

  constructor(container: HTMLElement) {
    this.core = new ViewerCore(container);
    this.loader = new IFCLoader();
    this.measureTool = new MeasurementTool(this);
    this.areaVolumeTool = new AreaVolumeTool(this);
    
    this.selectionMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x22c55e, // Green color as requested
        transparent: true, 
        opacity: 0.8,
        depthTest: false 
    });

    this.setupIntersection();
    this.initPromise = this.init();
  }

  private async init() {
     await this.loader.init();
  }

  public async loadFile(file: File, onProgress?: (p: number, t: number) => void) {
     await this.initPromise;
     this.fileObj = file;
     const modelGroup = await this.loader.loadFile(file, onProgress);
     this.core.scene.add(modelGroup);
     
     // Fit camera
     const box = new THREE.Box3().setFromObject(modelGroup);
     if (!box.isEmpty()) {
       this.core.fitToModel(box);
     }
  }

  private setupIntersection() {
     const raycaster = new THREE.Raycaster();
     const mouse = new THREE.Vector2();
     let isDragging = false;
     let startPoint = { x: 0, y: 0 };

     this.core.container.addEventListener('pointerdown', (e) => {
        isDragging = false;
        startPoint = { x: e.clientX, y: e.clientY };
     });

     this.core.container.addEventListener('pointermove', (e) => {
        if (Math.abs(e.clientX - startPoint.x) > 3 || Math.abs(e.clientY - startPoint.y) > 3) {
           isDragging = true;
        }
     });

     this.core.container.addEventListener('pointerup', (e) => {
        if (isDragging) return;
        
        const rect = this.core.container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, this.core.camera);
        // Intersect only with the model group's children
        const intersects = raycaster.intersectObject(this.loader.modelGroup, true);

        const toggle = e.ctrlKey || e.metaKey;

        if (intersects.length > 0) {
           const mesh = intersects[0].object as THREE.Mesh;
           const expressID = mesh.userData.expressID;
           if (expressID !== undefined) {
               this.selectElementByExpressID(expressID, toggle);
           }
        } else if (!toggle) {
           this.clearSelection();
        }
     });
  }

  public selectElementByExpressID(id: number, toggle: boolean = false) {
     if (!toggle) {
       this.clearSelection();
     }

     if (this.selectedObjects.has(id)) {
        if (toggle) {
           // Deselect
           const dataList = this.selectedObjects.get(id)!;
           dataList.forEach(data => {
               data.mesh.material = data.originalMaterial;
           });
           this.selectedObjects.delete(id);
        }
     } else {
        // Select
        const el = this.loader.elements.get(id);
        if (el && el.mesh) {
            const meshesToSelect: { mesh: THREE.Mesh, originalMaterial: THREE.Material | THREE.Material[] }[] = [];
            // it's a THREE.Group, find all meshes
            el.mesh.traverse((child: any) => {
                if (child.isMesh) {
                    meshesToSelect.push({
                        mesh: child as THREE.Mesh,
                        originalMaterial: child.material
                    });
                    child.material = this.selectionMaterial;
                }
            });
            this.selectedObjects.set(id, meshesToSelect);
        }
     }
     
     if (this.onSelect) {
        this.onSelect(Array.from(this.selectedObjects.keys()));
     }
  }

  public clearSelection() {
     for (const [id, dataList] of this.selectedObjects.entries()) {
        dataList.forEach(data => {
            data.mesh.material = data.originalMaterial;
        });
     }
     this.selectedObjects.clear();
     
     if (this.onSelect) {
        this.onSelect([]);
     }
  }

  public dispose() {
     this.measureTool.dispose();
     this.areaVolumeTool.dispose();
     this.loader.closeModel();
     this.core.dispose();
  }
}
