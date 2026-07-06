const fs = require('fs');
const file = '/app/applet/src/bim/3d/BIMScene.ts';
let code = fs.readFileSync(file, 'utf8');

const newMethod = `
  public loadParsedModel(meshes: {expressID:number; geometry:THREE.BufferGeometry; color:[number,number,number,number]}[]): void {
    this.modelGroup.clear();
    this.elementsMap.clear();
    this.originalMaterials.clear();
    this.selectedElements.clear();

    for (const meshData of meshes) {
      const { expressID, geometry, color } = meshData;
      
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color[0], color[1], color[2]),
        transparent: color[3] < 1,
        opacity: color[3],
        side: THREE.DoubleSide
      });
      
      this.setupMaterialClipping(material);
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.expressID = expressID;
      
      const elementId = String(expressID);
      this.elementsMap.set(elementId, mesh);
      this.originalMaterials.set(elementId, material);
      
      this.modelGroup.add(mesh);
    }
    
    this.boundingBox.setFromObject(this.modelGroup);
    this.frameAll();
  }
`;

code = code.replace(/  public async loadGLB\(url: string\): Promise<any\[\]> \{/, newMethod + '\n  public async loadGLB(url: string): Promise<any[]> {');

fs.writeFileSync(file, code);
console.log('Patched BIMScene.ts with loadParsedModel');
