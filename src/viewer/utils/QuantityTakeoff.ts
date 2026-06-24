export async function extractQuantityInfo(
    manager: any,
    targetExpressID: number
) {
    if (!manager || !manager.loader.ifcApi || manager.loader.currentModelID === null) return null;
    
    const api = manager.loader.ifcApi;
    const modelID = manager.loader.currentModelID;
    const loader = manager.loader;

    try {
        const spatialTree = await api.properties.getSpatialStructure(modelID, true);
        
        // Build map of expressID -> Storey Name
        const storeyMap = new Map<number, string>();
        
        function traverseSpatial(node: any, currentStorey: string) {
            let storeyName = currentStorey;
            const typeStr = node.type ? node.type.toString().toUpperCase() : '';
            if (typeStr === 'IFCBUILDINGSTOREY') {
                // If getSpatialStructure was called with includeProperties = true, node properties are present.
                // Sometimes it's directly node.name, sometimes we have to query.
                storeyName = node.Name?.value || node.name?.value || `Våning ${node.expressID}`;
            }
            if (node.expressID !== undefined) {
                storeyMap.set(node.expressID, storeyName);
            }
            if (node.children && Array.isArray(node.children)) {
                for (const child of node.children) {
                    traverseSpatial(child, storeyName);
                }
            }
        }
        
        traverseSpatial(spatialTree[0] || spatialTree, 'Okänd Våning');

        // Target element info
        const targetElement = loader.elements.get(targetExpressID);
        if (!targetElement) return null;

        const targetTypeName = targetElement.typeName;
        const targetName = targetElement.name;
        
        // Find all matching elements (same IFC type and same name/identifier)
        const matchingElements: any[] = [];
        for (const [id, el] of loader.elements.entries()) {
            if (el.typeName === targetTypeName && el.name === targetName) {
                const psets = await loader.getPropertySets(id);
                // Try to find volume / area from Qto / BaseQuantities
                let volume = 0;
                let area = 0;
                let length = 0;

                if (psets && psets.length > 0) {
                    for (const pset of psets) {
                        const props = pset.HasProperties || pset.Quantities || [];
                        for (const prop of props) {
                            const pName = prop.Name?.value?.toLowerCase() || '';
                            let val = prop.VolumeValue?.value ?? prop.AreaValue?.value ?? prop.LengthValue?.value ?? prop.NominalValue?.value ?? prop.MassValue?.value ?? prop.WeightValue?.value;
                            
                            // Try to parse string to number if needed
                            if (typeof val === 'string') {
                                const parsed = parseFloat(val);
                                if (!isNaN(parsed)) val = parsed;
                            }

                            if (val !== undefined && typeof val === 'number') {
                                if (pName.includes('volume') || pName.includes('volym')) {
                                    if (pName.includes('net') || volume === 0) volume = val;
                                } else if (pName.includes('area')) {
                                    if (pName.includes('net') || area === 0) area = val;
                                } else if (pName === 'length' || pName === 'längd') {
                                    length = val;
                                }
                            }
                        }
                    }
                }

                // Fallback to bounding box sizes if no Qto
                if (volume === 0 && area === 0 && length === 0 && el.mesh) {
                    const box = new window.THREE.Box3().setFromObject(el.mesh);
                    const size = new window.THREE.Vector3();
                    box.getSize(size);
                    length = size.x;
                    const w = size.y;
                    const h = size.z;
                    volume = length * w * h;
                    area = length * w; 
                }

                matchingElements.push({
                    expressID: id,
                    name: el.name,
                    storey: storeyMap.get(id) || 'Okänd Våning',
                    volume, area, length
                });
            }
        }

        // Group by Storey
        const groups = new Map<string, any[]>();
        for (const el of matchingElements) {
            const arr = groups.get(el.storey) || [];
            arr.push(el);
            groups.set(el.storey, arr);
        }

        // Build result
        const results = [];
        for (const [storey, items] of groups.entries()) {
            const totalVolume = items.reduce((acc, it) => acc + it.volume, 0);
            const totalArea = items.reduce((acc, it) => acc + it.area, 0);
            const totalLength = items.reduce((acc, it) => acc + it.length, 0);
            const count = items.length;

            results.push({
                storey,
                elementName: targetName,
                typeName: targetTypeName,
                count,
                totalVolume,
                totalArea,
                totalLength,
                elements: items
            });
        }

        return results;

    } catch (e) {
        console.error("Takeoff Error", e);
        return null;
    }
}
