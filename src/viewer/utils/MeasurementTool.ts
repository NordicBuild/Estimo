import * as THREE from 'three';
import { IFCVManager } from '../IFCVManager';

export interface MeasurementData {
    id: string;
    p1: THREE.Vector3;
    p2: THREE.Vector3;
    distance: number;
    midPoint: THREE.Vector3;
}

export class MeasurementTool {
    private manager: IFCVManager;
    private points: THREE.Vector3[] = [];
    private lines: THREE.Line[] = [];
    private pointMeshes: THREE.Mesh[] = [];
    private isMeasuring = false;
    private measurements: MeasurementData[] = [];

    // Materials
    private lineMaterial = new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 3, depthTest: false });
    private pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333, depthTest: false });

    // Events
    public onMeasurementsUpdated?: (measurements: MeasurementData[]) => void;

    private handlePointerUp = (e: PointerEvent) => {
        if (!this.isMeasuring) return;

        // Only trigger on left click
        if (e.button !== 0) return;

        // If holding ctrl/cmd, don't place points, it's for selecting
        if (e.ctrlKey || e.metaKey) return;

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

    constructor(manager: IFCVManager) {
        this.manager = manager;
        const container = this.manager.core.container;
        container.addEventListener('pointerup', this.handlePointerUp);
    }

    public toggleMeasuring(active: boolean) {
        this.isMeasuring = active;
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
        if (this.points.length === 1) {
            // Remove the single point mesh
            const mesh = this.pointMeshes.pop();
            if (mesh) this.manager.core.scene.remove(mesh);
        }
        this.points = [];
    }

    public dispose() {
        this.manager.core.container.removeEventListener('pointerup', this.handlePointerUp);
        this.clearAll();
    }

    private addPoint(p: THREE.Vector3) {
        this.points.push(p);

        // Create a visual marker for the point
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), this.pointMaterial);
        sphere.position.copy(p);
        sphere.renderOrder = 999; // Draw on top
        this.manager.core.scene.add(sphere);
        this.pointMeshes.push(sphere);

        if (this.points.length === 2) {
            const p1 = this.points[0];
            const p2 = this.points[1];
            this.createMeasurement(p1, p2);
            this.points = []; // Reset for next measurement
        }
    }

    private createMeasurement(p1: THREE.Vector3, p2: THREE.Vector3) {
        const distance = p1.distanceTo(p2);

        // Draw line
        const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const line = new THREE.Line(geometry, this.lineMaterial);
        line.renderOrder = 998;
        this.manager.core.scene.add(line);
        this.lines.push(line);

        // Calculate midpoint
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

        this.measurements.push({
            id: Date.now().toString(),
            p1,
            p2,
            distance,
            midPoint
        });

        this.notifyUpdate();
    }

    private notifyUpdate() {
        if (this.onMeasurementsUpdated) {
            this.onMeasurementsUpdated([...this.measurements]);
        }
    }
}
