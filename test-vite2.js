import { IFCLoader } from 'web-ifc-three';

async function run() {
  const loader = new IFCLoader();
  loader.ifcManager.setWasmPath('/');
  
  try {
    const res = await fetch('/cube.ifc');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    
    loader.load(url, async (ifcModel) => {
      console.log("Model loaded. isMesh:", ifcModel.isMesh, "children:", ifcModel.children.length);
      
      let meshCount = 0;
      ifcModel.traverse(c => {
        if (c.isMesh) meshCount++;
      });
      console.log("Mesh count:", meshCount);
      
      const spatialTree = await loader.ifcManager.getSpatialStructure(ifcModel.modelID);
      console.log("Spatial tree size:", JSON.stringify(spatialTree).length);
    }, null, (err) => {
      console.error("OnError:", err);
    });
    
  } catch (err) {
    console.error("Catch:", err);
  }
}
run();
window.runIFCTest = run;
