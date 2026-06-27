import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as WebIFC from "https://esm.sh/web-ifc@0.0.66";

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

  try {
    const { filePath, projectId, modelId, format } = await req.json();

    if (!filePath || !projectId || !modelId) {
      throw new Error("Missing required parameters (filePath, projectId, modelId).");
    }

    if (format && format.toLowerCase() !== 'ifc') {
      throw new Error("Unsupported format. Only 'ifc' is currently supported.");
    }

    // Initialize Supabase client with Service Role to bypass RLS during background processing
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

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
    const finalStatus = isTimedOut ? 'degraded' : 'ready';
    const timestamp = new Date().toISOString();
    
    await supabaseClient
      .from('bim_models')
      .update({ 
        status: finalStatus,
        metadata: {
          element_count: elementList.length,
          parsed_at: timestamp,
          timeout: isTimedOut
        }
      })
      .eq('id', modelId);

    console.log(`[BIM] Model ${modelId} processing complete. Status: ${finalStatus}`);

    // 7. Return summary
    return new Response(
      JSON.stringify({
        success: true,
        modelId,
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
    try {
      // In a real scenario we'd need to extract modelId again or keep it scoped
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
