export function inferStorey(name: string): string {
  const match = name.match(/(?:PLAN|Niveau|FLOOR|Level)\s*(\d+)/i);
  if (match) {
    return `PLAN ${match[1]}`;
  }
  return "Unknown";
}

export function classifyDiscipline(category: string, objectType?: string, material?: string): string {
  const cat = (category || '').toUpperCase();
  const obj = (objectType || '').toUpperCase();
  const mat = (material || '').toUpperCase();

  if (cat.includes('COLUMN') || cat.includes('BEAM') || cat.includes('FOOTING')) {
    return 'STRUCTURE';
  }
  if (cat.includes('SLAB') || cat.includes('WALL')) {
    if (mat.includes('CONCRETE') || mat.includes('BETONG') || obj.includes('BEARING')) {
      return 'STRUCTURE';
    }
  }
  if (cat.includes('DUCT') || cat.includes('PIPE') || cat.includes('CABLE')) {
    return 'MEP';
  }
  return 'ARCHITECTURE';
}

export async function extractProperties(ifcApi: any, model: number, expressID: number, element: any) {
  const props: any = {};
  try {
    if (element.ObjectType?.value) props.ObjectType = element.ObjectType.value;
    if (element.Material?.value) props.Material = element.Material.value;

    if (typeof ifcApi.properties?.getPropertySets === 'function') {
      const psets = await ifcApi.properties.getPropertySets(model, expressID, true);
      for (const pset of (psets || [])) {
        if (pset.HasProperties) {
          for (const prop of pset.HasProperties) {
            const val = prop.NominalValue?.value ?? prop.Value?.value;
            const name = prop.Name?.value;
            if (name && val !== undefined) props[name] = val;
          }
        }
      }
    } else if (typeof ifcApi.GetRelatedObjects === 'function') {
      const rels = await ifcApi.GetRelatedObjects(model, expressID, "IfcRelDefinesByProperties", true);
      for (const rel of (rels || [])) {
        const pset = rel.RelatingPropertyDefinition;
        if (pset && pset.HasProperties) {
          for (const prop of pset.HasProperties) {
            const val = prop.NominalValue?.value ?? prop.Value?.value;
            const name = prop.Name?.value;
            if (name && val !== undefined) props[name] = val;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[BIM] extractProperties failed for ${expressID}:`, err);
  }
  return props;
}
