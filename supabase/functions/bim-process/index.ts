import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as WebIFC from "https://esm.sh/web-ifc@0.0.66";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    console.log(`Starting processing for model ${modelId}, file: ${filePath}`);

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
    console.log("Initializing web-ifc...");
    const ifcApi = new WebIFC.IfcAPI();
    
    // Set WASM path to a CDN so the Edge Function can load it
    ifcApi.SetWasmPath("https://unpkg.com/web-ifc@0.0.66/", true);
    await ifcApi.Init();

    console.log("Opening IFC model...");
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

    console.log("Extracting elements...");

    for (const type of typesToExtract) {
      if (isTimedOut) break;

      const lines = ifcApi.GetLineIDsWithType(model, type);
      const size = lines.size();

      for (let i = 0; i < size; i++) {
        if (Date.now() - startTime > TIMEOUT_MS) {
          console.warn("Processing timeout reached. Returning partial results.");
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

          // Infer storey (Fallback heuristic)
          let storey = "Unknown";
          if (name.toUpperCase().includes("PLAN")) {
            const match = name.match(/PLAN\s*\d+/i);
            if (match) storey = match[0].toUpperCase();
          }

          // Infer discipline
          let discipline = "ARCHITECTURE";
          if (ifcElement.ObjectType?.value) {
            discipline = ifcElement.ObjectType.value;
          }
          
          storeysSet.add(storey);
          disciplinesSet.add(discipline);

          // Flatten Properties
          // Note: In a full implementation, you would traverse IfcRelDefinesByProperties 
          // to get Psets (Property Sets) like Length, Material, Volume, Area.
          const properties: any = {
            Name: name,
            ExpressID: expressID,
            ObjectType: ifcElement.ObjectType?.value,
            // Example stub for extracted properties:
            // Length: 5.2,
            // Material: "Concrete"
          };

          elementList.push({
            model_id: modelId,
            guid: guid,
            category: category,
            name: name,
            storey: storey,
            properties: properties
          });

        } catch (err) {
          // Soft fail for individual element parsing errors
          console.warn(`Failed to parse element ${expressID}:`, err);
        }
      }
    }

    // Free WASM memory
    ifcApi.CloseModel(model);

    console.log(`Extracted ${elementList.length} elements. Inserting to database...`);

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
        console.error(`Batch insert error at index ${i}:`, insertError);
      }
    }

    // 6. Update model status
    const finalStatus = isTimedOut ? 'degraded' : 'ready';
    await supabaseClient
      .from('bim_models')
      .update({ status: finalStatus })
      .eq('id', modelId);

    console.log(`Model ${modelId} processing complete. Status: ${finalStatus}`);

    // 7. Return summary
    return new Response(
      JSON.stringify({
        modelId,
        elementCount: elementList.length,
        storeys: Array.from(storeysSet),
        disciplines: Array.from(disciplinesSet),
        status: finalStatus
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
