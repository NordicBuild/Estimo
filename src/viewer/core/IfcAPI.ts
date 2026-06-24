import * as WebIFC from 'web-ifc';

let ifcApiPromise: Promise<WebIFC.IfcAPI> | null = null;

export async function getIfcApi(): Promise<WebIFC.IfcAPI> {
  if (!ifcApiPromise) {
    ifcApiPromise = (async () => {
      const api = new WebIFC.IfcAPI();
      api.SetWasmPath('/');
      await api.Init();
      return api;
    })();
  }
  return ifcApiPromise;
}
