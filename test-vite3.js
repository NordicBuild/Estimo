import { IFCLoader } from 'web-ifc-three';

async function run() {
  const loader = new IFCLoader();
  loader.ifcManager.setWasmPath('/');
  
  try {
    const res = await fetch('/cube.ifc');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    
    loader.load(url, async (ifcModel) => {
      console.log("Model loaded");
    }, null, (err) => {
      console.error("OnError:", err.stack || err);
    });
    
  } catch (err) {
    console.error("Catch:", err.stack || err);
  }
}
run();
window.runIFCTest = run;
