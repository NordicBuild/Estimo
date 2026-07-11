import { IFCLoader } from 'web-ifc-three';
import * as THREE from 'three';

async function run() {
  const loader = new IFCLoader();
  loader.ifcManager.setWasmPath('/');
  
  try {
    const res = await fetch('/cube.ifc');
    const buffer = await res.arrayBuffer();
    
    // Instead of parse, IFCLoader wants a url usually for load(), but parse takes buffer.
    const ifcModel = await loader.parse(buffer);
    console.log("Model parsed. isMesh:", ifcModel.isMesh, "children:", ifcModel.children.length);
    
    let meshCount = 0;
    ifcModel.traverse(c => {
      if (c.isMesh) meshCount++;
    });
    console.log("Mesh count:", meshCount);
    
    const spatialTree = await loader.ifcManager.getSpatialStructure(ifcModel.modelID);
    console.log("Spatial tree size:", JSON.stringify(spatialTree).length);
    
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
window.runIFCTest = run;
