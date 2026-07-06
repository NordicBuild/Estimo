import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as WebIFC from "https://esm.sh/web-ifc@0.0.66";
import { Document, WebIO } from "https://esm.sh/@gltf-transform/core@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 1. extractProperties: traversera IfcRelDefinesByProperties via ifcApi.GetRelatedObjects och platta ut
async function extractProperties(ifcApi: any, model: number, expressID: number, element: any) {
  const props: any = {};
  try {
    // Basic fallback from element
    if (element.ObjectType?.value) props.ObjectType = element.ObjectType.value;
    if (element.Material?.value) props.Material = element.Material.value;

    // Try web-ifc GetRelatedObjects (using standard property relation IfcRelDefinesByProperties if possible)
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

// 2. inferStorey: matcha /PLAN\s*(\d+)/i, etc.
function inferStorey(name: string): string {
  const match = name.match(/(?:PLAN|Niveau|FLOOR|Level)\s*(\d+)/i);
  if (match) {
    return `PLAN ${match[1]}`;
  }
  return "Unknown";
}

// 3. classifyDiscipline
function classifyDiscipline(category: string, objectType?: string, material?: string): string {
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

// Start server
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let modelId: string | undefined;

  // Initialize Supabase client with Service Role to bypass RLS during background processing
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json();
    const { filePath, projectId, format } = body;
    modelId = body.modelId;

    if (!filePath || !projectId || !modelId) {
      throw new Error("Missing required parameters (filePath, projectId, modelId).");
    }

    if (format && format.toLowerCase() !== 'ifc') {
      throw new Error("Unsupported format. Only 'ifc' is currently supported.");
    }

    console.log(`[BIM] Starting processing for model ${modelId}, file: ${filePath}`);

    // 1. Fetch file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('bim-uploads')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileUint8Array = new Uint8Array(fileBuffer);

    // 2. Initialize web-ifc parser
    console.log("[BIM] Initializing web-ifc...");
    const ifcApi = new WebIFC.IfcAPI();
    
    // Set WASM path to a CDN so the Edge Function can load it
    ifcApi.SetWasmPath("https://unpkg.com/web-ifc@0.0.66/", true);
    await ifcApi.Init();

    console.log("[BIM] Opening IFC model...");
    const model = ifcApi.OpenModel(fileUint8Array);

    const elementList: any[] = [];
    const storeysSet = new Set<string>();
    const disciplinesSet = new Set<string>();

    // IFC Classes to extract (Spaces, Walls, Slabs, Columns, Beams, etc.)
    const typesToExtract = [
      WebIFC.IFCWALL,
      WebIFC.IFCWALLSTANDARDCASE,
      WebIFC.IFCSLAB,
      WebIFC.IFCCOLUMN,
      WebIFC.IFCBEAM,
      WebIFC.IFCWINDOW,
      WebIFC.IFCDOOR,
      WebIFC.IFCROOF,
      WebIFC.IFCSTAIR,
      WebIFC.IFCRAILING,
      WebIFC.IFCBUILDINGELEMENTPROXY,
      WebIFC.IFCSPACE
    ];

    // Timeout and safety limits
    const startTime = Date.now();
    const TIMEOUT_MS = 50000; // 50 seconds (leave room for DB inserts)
    let isTimedOut = false;

    console.log("[BIM] Extracting elements...");

    for (const type of typesToExtract) {
      if (isTimedOut) break;

      const lines = ifcApi.GetLineIDsWithType(model, type);
      const size = lines.size();

      for (let i = 0; i < size; i++) {
        if (Date.now() - startTime > TIMEOUT_MS) {
          console.warn("[BIM] Processing timeout reached. Returning partial results.");
          isTimedOut = true;
          break;
        }

        const expressID = lines.get(i);
        try {
          // Get basic properties
          const ifcElement = ifcApi.GetLine(model, expressID, true);
          if (!ifcElement) continue;

          const guid = ifcElement.GlobalId?.value;
          const name = ifcElement.Name?.value || "Unnamed";
          const category = ifcApi.GetNameFromTypeCode(ifcElement.type);
          
          // Validate required fields
          if (!guid || !category) continue;

          // Extract properties and classify
          const properties = await extractProperties(ifcApi, model, expressID, ifcElement);
          const storey = inferStorey(name);
          const discipline = classifyDiscipline(category, properties.ObjectType, properties.Material);
          
          storeysSet.add(storey);
          disciplinesSet.add(discipline);

          properties.Name = name;
          properties.ExpressID = expressID;
          if (!properties.ObjectType && ifcElement.ObjectType?.value) {
            properties.ObjectType = ifcElement.ObjectType.value;
          }

          elementList.push({
            model_id: modelId,
            guid: guid,
            category: category,
            name: name,
            storey: storey,
            discipline: discipline,
            properties: properties
          });

        } catch (err) {
          // Soft fail for individual element parsing errors
          console.warn(`[BIM] Failed to parse element ${expressID}:`, err);
        }
      }
    }

    // --- GEOMETRY EXTRACTION TO GLB ---
    let geometryUrl: string | null = null;
    let geometryError: string | null = null;
    let skipGeometry = false;

    // Check size limit (40MB)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (fileUint8Array.length > MAX_SIZE) {
      console.log(`[BIM] File > 15MB (${fileUint8Array.length} bytes). Skipping geometry extraction.`);
      skipGeometry = true;
      geometryError = "Filen överstiger 15 MB, 3D-geometri inaktiverad.";
    }

    if (!skipGeometry && !isTimedOut) {
      console.log("[BIM] Starting geometry extraction to GLB...");
      try {
        const doc = new Document();
        const buffer = doc.createBuffer();
        const scene = doc.createScene('Scene');
        const materials = new Map<string, any>();
        
        ifcApi.StreamAllMeshes(model, (mesh: any) => {
          if (Date.now() - startTime > TIMEOUT_MS) {
            isTimedOut = true;
            return;
          }
          
          try {
            const expressID = mesh.expressID;
            const node = doc.createNode(`Element_${expressID}`);
            node.setExtras({ expressID });
            scene.addChild(node);
            
            const gltfMesh = doc.createMesh(`Mesh_${expressID}`);
            node.setMesh(gltfMesh);
          
          const geometries = mesh.geometries;
          const size = geometries.size();
          for (let i = 0; i < size; i++) {
            const placedGeom = geometries.get(i);
            const geomID = placedGeom.geometryExpressID;
            const color = placedGeom.color;
            const transform = placedGeom.flatTransformation;
            
            const colorHash = `${color.x},${color.y},${color.z},${color.w}`;
            let material = materials.get(colorHash);
            if (!material) {
              material = doc.createMaterial(`Mat_${colorHash}`)
                .setBaseColorFactor([color.x, color.y, color.z, color.w]);
              if (color.w < 1.0) {
                material.setAlphaMode('BLEND');
              }
              materials.set(colorHash, material);
            }
            
            const geometry = ifcApi.GetGeometry(model, geomID);
            const vertexData = geometry.GetVertexData();
            const vertexDataSize = geometry.GetVertexDataSize();
            const indexData = geometry.GetIndexData();
            const indexDataSize = geometry.GetIndexDataSize();
            
            const vertices = ifcApi.GetVertexArray(vertexData, vertexDataSize);
            const indices = ifcApi.GetIndexArray(indexData, indexDataSize);
            
            const vertexCount = vertices.length / 6;
            const positions = new Float32Array(vertexCount * 3);
            const normals = new Float32Array(vertexCount * 3);
            
            for (let v = 0; v < vertexCount; v++) {
              const x = vertices[v * 6];
              const y = vertices[v * 6 + 1];
              const z = vertices[v * 6 + 2];
              
              const tx = x * transform[0] + y * transform[4] + z * transform[8] + transform[12];
              const ty = x * transform[1] + y * transform[5] + z * transform[9] + transform[13];
              const tz = x * transform[2] + y * transform[6] + z * transform[10] + transform[14];
              
              positions[v * 3] = tx;
              positions[v * 3 + 1] = ty;
              positions[v * 3 + 2] = tz;

              const nx = vertices[v * 6 + 3];
              const ny = vertices[v * 6 + 4];
              const nz = vertices[v * 6 + 5];

              const tnx = nx * transform[0] + ny * transform[4] + nz * transform[8];
              const tny = nx * transform[1] + ny * transform[5] + nz * transform[9];
              const tnz = nx * transform[2] + ny * transform[6] + nz * transform[10];

              const len = Math.sqrt(tnx * tnx + tny * tny + tnz * tnz);
              const invLen = len > 0 ? 1.0 / len : 0;
              
              normals[v * 3] = tnx * invLen;
              normals[v * 3 + 1] = tny * invLen;
              normals[v * 3 + 2] = tnz * invLen;
            }
            
            const positionAccessor = doc.createAccessor()
              .setType('VEC3')
              .setArray(positions)
              .setBuffer(buffer);

            const normalAccessor = doc.createAccessor()
              .setType('VEC3')
              .setArray(normals)
              .setBuffer(buffer);
              
            const indexAccessor = doc.createAccessor()
              .setType('SCALAR')
              .setArray(new Uint32Array(indices))
              .setBuffer(buffer);
              
            const prim = doc.createPrimitive()
              .setIndices(indexAccessor)
              .setAttribute('POSITION', positionAccessor)
              .setAttribute('NORMAL', normalAccessor)
              .setMaterial(material);
              
            gltfMesh.addPrimitive(prim);
          }
          } catch (meshErr) {
            console.warn(`[BIM] Failed to process mesh ${mesh.expressID}:`, meshErr);
          }
        });

        if (!isTimedOut) {
          console.log("[BIM] Generating GLB binary...");
          const io = new WebIO();
          const glbBytes = await io.writeBinary(doc);
          
          const glbPath = `projects/${projectId}/bim/${modelId}.glb`;
          
          console.log(`[BIM] Uploading GLB to ${glbPath}...`);
          const { error: uploadError } = await supabaseClient.storage
            .from('bim-uploads')
            .upload(glbPath, glbBytes, {
              upsert: true,
              contentType: 'model/gltf-binary'
            });
            
          if (uploadError) {
            console.error("[BIM] GLB upload error:", uploadError);
            geometryError = uploadError.message;
          } else {
            geometryUrl = glbPath;
          }
        } else {
          geometryError = "Timeout during geometry extraction.";
        }
      } catch (err: any) {
        console.error("[BIM] Geometry extraction error:", err);
        geometryError = err.message;
      }
    }

    // Free WASM memory
    ifcApi.CloseModel(model);

    console.log(`[BIM] Extracted ${elementList.length} elements. Inserting to database...`);

    // 4. Clean up previous elements for this model (Re-upload scenario)
    await supabaseClient.from('bim_elements').delete().eq('model_id', modelId);

    // 5. Batch insert to prevent payload limits
    const batchSize = 1000;
    for (let i = 0; i < elementList.length; i += batchSize) {
      const batch = elementList.slice(i, i + batchSize);
      const { error: insertError } = await supabaseClient
        .from('bim_elements')
        .insert(batch);
      
      if (insertError) {
        console.error(`[BIM] Batch insert error at index ${i}:`, insertError);
      }
    }

    // 6. Update model status and metadata
    const finalStatus = (isTimedOut || skipGeometry || !!geometryError) ? 'degraded' : 'ready';
    const timestamp = new Date().toISOString();
    
    await supabaseClient
      .from('bim_models')
      .update({ 
        status: finalStatus,
        geometry_url: geometryUrl,
        has_geometry: !!geometryUrl,
        metadata: {
          element_count: elementList.length,
          parsed_at: timestamp,
          timeout: isTimedOut,
          skipGeometry: skipGeometry,
          geometryError: geometryError
        }
      })
      .eq('id', modelId);

    console.log(`[BIM] Model ${modelId} processing complete. Status: ${finalStatus}`);

    // 7. Return summary
    return new Response(
      JSON.stringify({
        success: true,
        modelId,
        geometryUrl,
        elementCount: elementList.length,
        storeys: Array.from(storeysSet),
        disciplines: Array.from(disciplinesSet),
        status: finalStatus,
        timestamp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('BIM Processing error:', error);
    
    // Attempt to update model status to 'error' if possible
    if (modelId && supabaseClient) {
      try {
        await supabaseClient
          .from('bim_models')
          .update({
            status: 'error',
            metadata: {
              error: error.message,
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', modelId);
      } catch (updateErr) {
        console.error('Failed to update model status to error:', updateErr);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
