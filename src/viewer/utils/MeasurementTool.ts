import * as THREE from 'three';
import { IFCVManager } from '../IFCVManager';
import { distance3, polygonArea3, polygonPerimeter3, angleBetween3, prismVolume } from '../../bim/measureMath';

export interface MeasurementData {
    id: string;
    groupId?: string;
    color?: string;
    p1?: THREE.Vector3;
    p2?: THREE.Vector3;
    points?: THREE.Vector3[];
    distance?: number;
    area?: number;
    perimeter?: number;
    volume?: number;
    angle?: number;
    midPoint: THREE.Vector3;
    type: 'distance' | 'area' | 'volume' | 'angle';
}

export class MeasurementTool {
    private manager: IFCVManager;
    private points: THREE.Vector3[] = [];
    private lines: THREE.Line[] = [];
    private pointMeshes: THREE.Mesh[] = [];
    private isMeasuring = false;
    private measurements: MeasurementData[] = [];

    public activeGroupId: string = 'default';
    public activeColor: string = '#ef4444';

    // Materials
    private getLineMaterial() { return new THREE.LineBasicMaterial({ color: this.activeColor, linewidth: 3, depthTest: false }); }
    private getPointMaterial() { return new THREE.MeshBasicMaterial({ color: this.activeColor, depthTest: false }); }

    // Events
    public onMeasurementsUpdated?: (measurements: MeasurementData[]) => void;

    private handlePointerUp = (e: PointerEvent) => {
        if (!this.isMeasuring) return;

        // If holding ctrl/cmd, don't place points, it's for selecting
        if (e.ctrlKey || e.metaKey) return;

        // Finish measurement on right click
        if (e.button === 2 && this.points.length > 0) {
            this.finishMeasurement();
            return;
        }

        // Only trigger on left click
        if (e.button !== 0) return;

        const container = this.manager.core.container;
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.manager.core.camera);
        const intersects = raycaster.intersectObject(this.manager.loader.modelGroup, true);

        if (intersects.length > 0) {
            const p = intersects[0].point;
            this.addPoint(p);
        }
    };

    public mode: 'distance' | 'area' | 'volume' | 'angle' = 'distance';

    constructor(manager: IFCVManager) {
        this.manager = manager;
        const container = this.manager.core.container;
        container.addEventListener('pointerup', this.handlePointerUp);
        // Prevent context menu on right click to allow finishing measurement
        container.addEventListener('contextmenu', e => {
            if (this.isMeasuring) e.preventDefault();
        });
    }

    public toggleMeasuring(active: boolean, mode: 'distance' | 'area' | 'volume' | 'angle' = 'distance') {
        this.isMeasuring = active;
        this.mode = mode;
        if (!active) {
            this.clearCurrentMeasurement();
        }
    }

    public clearAll() {
        this.clearCurrentMeasurement();
        this.lines.forEach(line => this.manager.core.scene.remove(line));
        this.pointMeshes.forEach(mesh => this.manager.core.scene.remove(mesh));
        this.lines = [];
        this.pointMeshes = [];
        this.measurements = [];
        this.notifyUpdate();
    }

    private clearCurrentMeasurement() {
        this.pointMeshes.forEach(mesh => {
            // Remove points that haven't been finalized into a measurement yet
            if (mesh.userData.isTemp) {
                this.manager.core.scene.remove(mesh);
            }
        });
        this.pointMeshes = this.pointMeshes.filter(m => !m.userData.isTemp);
        this.points = [];
    }

    public dispose() {
        this.manager.core.container.removeEventListener('pointerup', this.handlePointerUp);
        this.clearAll();
    }

    private addPoint(p: THREE.Vector3) {
        this.points.push(p);

        // Create a visual marker for the point
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), this.getPointMaterial());
        sphere.position.copy(p);
        sphere.renderOrder = 999; // Draw on top
        sphere.userData.isTemp = true;
        this.manager.core.scene.add(sphere);
        this.pointMeshes.push(sphere);

        if (this.mode === 'distance' && this.points.length === 2) {
            this.finishMeasurement();
        } else if (this.mode === 'angle' && this.points.length === 3) {
            this.finishMeasurement();
        }
    }

    private finishMeasurement() {
        if (this.points.length < 2) {
            this.clearCurrentMeasurement();
            return;
        }

        const pts = [...this.points];
        
        // Mark temp meshes as permanent for this measurement
        this.pointMeshes.forEach(m => { m.userData.isTemp = false; });

        if (this.mode === 'distance') {
            const p1 = pts[0];
            const p2 = pts[1];
            const dist = distance3(p1, p2);
            
            const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const line = new THREE.Line(geometry, this.getLineMaterial());
            line.renderOrder = 998;
            this.manager.core.scene.add(line);
            this.lines.push(line);

            const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

            this.measurements.push({
                id: Date.now().toString(),
                groupId: this.activeGroupId, color: this.activeColor,
                p1, p2, points: pts, distance: dist, midPoint, type: 'distance'
            });
        } else if (this.mode === 'angle' && pts.length >= 3) {
            const p1 = pts[0];
            const p2 = pts[1]; // Vertex
            const p3 = pts[2];
            const angle = angleBetween3(p1, p2, p3);

            const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2, p3]);
            const line = new THREE.Line(geometry, this.getLineMaterial());
            line.renderOrder = 998;
            this.manager.core.scene.add(line);
            this.lines.push(line);

            this.measurements.push({
                id: Date.now().toString(),
                groupId: this.activeGroupId, color: this.activeColor,
                points: pts, angle, midPoint: p2, type: 'angle'
            });
        } else if (this.mode === 'area' || this.mode === 'volume') {
            // Close polygon
            const geometry = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]]);
            const line = new THREE.Line(geometry, this.getLineMaterial());
            line.renderOrder = 998;
            this.manager.core.scene.add(line);
            this.lines.push(line);

            const area = polygonArea3(pts);
            const perimeter = polygonPerimeter3(pts);
            
            // Midpoint of polygon
            const midPoint = new THREE.Vector3();
            pts.forEach(p => midPoint.add(p));
            midPoint.divideScalar(pts.length);

            let vol: number | undefined = undefined;
            if (this.mode === 'volume') {
                const depthStr = window.prompt("Ange djup i meter för volymberäkning:", "1.0");
                const depth = parseFloat(depthStr || "0");
                vol = prismVolume(area, depth);
            }

            this.measurements.push({
                id: Date.now().toString(),
                groupId: this.activeGroupId, color: this.activeColor,
                points: pts, area, perimeter, volume: vol, midPoint, type: this.mode
            });
        }

        this.points = [];
        this.notifyUpdate();
    }

    public removeMeasurement(id: string) {
        // Find the measurement to remove
        const m = this.measurements.find(x => x.id === id);
        if (!m) return;
        
        // Remove from list
        this.measurements = this.measurements.filter(x => x.id !== id);
        
        // Remove visuals (this requires more complex logic to track which line/points belong to which measurement, 
        // but for now we can just clear everything and re-draw, or since we push in order, we could reconstruct. 
        // Actually the simplest is to rebuild the meshes).
        this.rebuildVisuals();
        this.notifyUpdate();
    }

    private rebuildVisuals() {
        // Clear all
        this.lines.forEach(l => this.manager.core.scene.remove(l));
        this.pointMeshes.forEach(p => this.manager.core.scene.remove(p));
        this.lines = [];
        this.pointMeshes = [];

        // Redraw all remaining
        const oldColor = this.activeColor;
        this.measurements.forEach(m => {
            this.activeColor = m.color || '#ef4444';
            
            // Re-create points
            m.points?.forEach(p => {
                const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), this.getPointMaterial());
                sphere.position.copy(p);
                sphere.renderOrder = 999;
                sphere.userData.isTemp = false;
                this.manager.core.scene.add(sphere);
                this.pointMeshes.push(sphere);
            });

            // Re-create lines
            if (m.type === 'distance' || m.type === 'angle') {
                const geometry = new THREE.BufferGeometry().setFromPoints(m.points || []);
                const line = new THREE.Line(geometry, this.getLineMaterial());
                line.renderOrder = 998;
                this.manager.core.scene.add(line);
                this.lines.push(line);
            } else if (m.type === 'area' || m.type === 'volume') {
                const pts = m.points || [];
                if (pts.length > 0) {
                    const geometry = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]]);
                    const line = new THREE.Line(geometry, this.getLineMaterial());
                    line.renderOrder = 998;
                    this.manager.core.scene.add(line);
                    this.lines.push(line);
                }
            }
        });
        this.activeColor = oldColor;
    }

    private notifyUpdate() {
        if (this.onMeasurementsUpdated) {
            this.onMeasurementsUpdated([...this.measurements]);
        }
    }
}
