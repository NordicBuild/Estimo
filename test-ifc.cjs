const fs = require('fs');
const WebIFC = require('web-ifc');

async function test() {
  const ifcapi = new WebIFC.IfcAPI();
  ifcapi.SetWasmPath(__dirname + '/public/');
  await ifcapi.Init();
  const file = fs.readFileSync('cube.ifc');
  const modelID = ifcapi.OpenModel(new Uint8Array(file));
  const spatialTree = ifcapi.GetLineIDsWithType(modelID, WebIFC.IFCPROJECT);
  console.log("Found project size:", spatialTree.size());
  
  ifcapi.CloseModel(modelID);
}
test().catch(console.error);
