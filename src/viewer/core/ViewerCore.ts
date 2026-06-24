import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class ViewerCore {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public gridHelper: THREE.GridHelper;
  public axesHelper: THREE.AxesHelper;
  public dirLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;

  private reqId: number | null = null;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a); // Dark UI background

    // Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);
    this.camera.position.set(20, 20, 20);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // Helpers
    this.gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
    this.scene.add(this.gridHelper);
    
    this.axesHelper = new THREE.AxesHelper(5);
    this.scene.add(this.axesHelper);

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 2);
    this.dirLight.position.set(50, 100, 50);
    this.dirLight.castShadow = true;
    this.scene.add(this.dirLight);

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    this.renderLoop = this.renderLoop.bind(this);
    this.renderLoop();
  }

  public dispose() {
    if (this.reqId !== null) cancelAnimationFrame(this.reqId);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    
    // Explicitly force context loss to reclaim WebGL contexts in Chrome
    this.renderer.forceContextLoss();
    this.renderer.dispose();
    
    // Dispose scene objects
    this.scene.traverse((object: any) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat: any) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  public resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private renderLoop() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.reqId = requestAnimationFrame(this.renderLoop);
  }

  public fitToModel(box: THREE.Box3) {
     const center = new THREE.Vector3();
     box.getCenter(center);
     const size = new THREE.Vector3();
     box.getSize(size);

     const maxDim = Math.max(size.x, size.y, size.z);
     const fov = this.camera.fov * (Math.PI / 180);
     let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
     cameraZ *= 1.5; // zoom out a little so that objects don't fill the screen

     this.camera.position.set(center.x, center.y + size.y, center.z + cameraZ);
     this.controls.target.copy(center);
     this.controls.update();
  }
}
