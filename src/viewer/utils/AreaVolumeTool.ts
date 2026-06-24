import * as THREE from 'three';
import { IFCVManager } from '../IFCVManager';

export interface AreaVolumeData {
    id: string;
    expressID: number;
    position: THREE.Vector3;
    area: number;
    volume: number;
}

export class AreaVolumeTool {
    private manager: IFCVManager;
    private isMeasuring = false;
    private measurements: AreaVolumeData[] = [];
    private highlightMaterial = new THREE.MeshLambertMaterial({
        color: 0xffa500,
        transparent: true,
        opacity: 0.5,
        depthTest: true
    });

    public onMeasurementsUpdated?: (measurements: AreaVolumeData[]) => void;

    private handlePointerUp = async (e: PointerEvent) => {
        if (!this.isMeasuring) return;

        // Only trigger on left click
        if (e.button !== 0) return;
        if (e.ctrlKey || e.metaKey) return; // Don't conflict with multi-select

        const container = this.manager.core.container;
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.manager.core.camera);
        const intersects = raycaster.intersectObject(this.manager.loader.modelGroup, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            let mesh = hit.object as THREE.Object3D;
            let expressID = mesh.userData?.expressID;
            
            // If the hit object doesn't have expressID, try parent group
            while (expressID === undefined && mesh.parent) {
                mesh = mesh.parent;
                expressID = mesh.userData?.expressID;
            }
            
            if (expressID !== undefined && expressID !== -1) {
                // Highlight the element briefly or fetch its data
                await this.addMeasurement(expressID, hit.point);
            }
        }
    };

    constructor(manager: IFCVManager) {
        this.manager = manager;
        this.manager.core.container.addEventListener('pointerup', this.handlePointerUp);
    }

    public toggleMeasuring(active: boolean) {
        this.isMeasuring = active;
        if (!active) {
            this.manager.core.container.style.cursor = 'default';
        } else {
            this.manager.core.container.style.cursor = 'crosshair';
        }
    }

    public clearAll() {
        this.measurements = [];
        this.notifyUpdate();
    }

    public dispose() {
        this.manager.core.container.removeEventListener('pointerup', this.handlePointerUp);
        this.clearAll();
    }

    private async addMeasurement(expressID: number, point: THREE.Vector3) {
        // Find properties to get Area and Volume
        let volume = 0;
        let area = 0;

        const psets = await this.manager.loader.getPropertySets(expressID);
        if (psets && psets.length > 0) {
            for (const pset of psets) {
                const props = pset.HasProperties || pset.Quantities || [];
                for (const prop of props) {
                    const pName = prop.Name?.value?.toLowerCase() || '';
                    let val = prop.VolumeValue?.value ?? prop.AreaValue?.value ?? prop.NominalValue?.value;
                    
                    if (typeof val === 'string') {
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed)) val = parsed;
                    }

                    if (val !== undefined && typeof val === 'number') {
                        if (pName.includes('volume') || pName.includes('volym')) {
                            if (pName.includes('net') || volume === 0) volume = val;
                        } else if (pName.includes('area')) {
                            if (pName.includes('net') || area === 0) area = val;
                        }
                    }
                }
            }
        }

        // Add to list
        this.measurements.push({
            id: Date.now().toString(),
            expressID,
            position: point.clone(),
            area,
            volume
        });

        this.notifyUpdate();
    }

    private notifyUpdate() {
        if (this.onMeasurementsUpdated) {
            this.onMeasurementsUpdated([...this.measurements]);
        }
    }
}
