import { IfcAPI, IFCPROJECT } from 'web-ifc';
import fs from 'fs';

async function run() {
  const ifcapi = new IfcAPI();
  await ifcapi.Init();
  console.log("Initialized");
}
run();
