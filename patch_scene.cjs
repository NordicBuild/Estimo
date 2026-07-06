const fs = require('fs');
const file = '/app/applet/src/bim/3d/BIMScene.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/  private doPick\(clientX: number, clientY: number\) \{[\s\S]*?          const elementId = hit\.object\.userData\?\.guid \|\| hit\.object\.name \|\| hit\.object\.uuid;\n          if \(this\.pickCallback\) \{\n            this\.pickCallback\(elementId\);\n            return;\n          \}\n        \}\n      \}\n    \}\n    \n    if \(this\.pickCallback\) \{\n      this\.pickCallback\(null\);\n    \}\n  \}/, `  private doPick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObject(this.modelGroup, true);
    
    if (intersects.length > 0) {
      // Find the first visible and valid intersected object
      for (const hit of intersects) {
        if (hit.object.visible) {
          let curr: THREE.Object3D | null = hit.object;
          let expressID: number | undefined;
          
          while (curr && curr !== this.modelGroup) {
            if (curr.userData && curr.userData.expressID !== undefined) {
              expressID = curr.userData.expressID;
              break;
            }
            curr = curr.parent;
          }
          
          const elementId = expressID !== undefined 
            ? String(expressID)
            : (hit.object.userData?.guid || hit.object.name || hit.object.uuid);
            
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
  }`);

fs.writeFileSync(file, code);
console.log('Patched BIMScene.ts doPick');
