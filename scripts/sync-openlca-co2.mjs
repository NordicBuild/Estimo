import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OLCA_URL = process.env.OLCA_URL || 'http://localhost:8080';
const OLCA_IMPACT_METHOD = process.env.OLCA_IMPACT_METHOD || 'EF 3.1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to call OpenLCA IPC (JSON-RPC 2.0)
async function callOpenLca(method, params = {}) {
  try {
    const response = await fetch(OLCA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenLCA HTTP error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`OpenLCA JSON-RPC error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    return data.result;
  } catch (err) {
    throw err;
  }
}

async function syncMaterials() {
  console.log('Fetching materials from Supabase...');
  
  // Try to fetch from the specific materials table first
  const { data: tableMaterials, error: tableError } = await supabase.from('materials').select('*');
  let hasTableMaterials = tableMaterials && tableMaterials.length > 0;
  
  // Also fetch the app_state materials
  const { data: stateData, error: stateError } = await supabase.from('app_state').select('data').eq('id', 'materials_all').single();
  let stateMaterials = stateData?.data || [];
  let hasStateMaterials = stateMaterials.length > 0;

  if (!hasTableMaterials && !hasStateMaterials) {
    console.log('No materials found in Supabase (neither in materials table nor in app_state).');
    return;
  }
  
  console.log(`Connecting to OpenLCA at ${OLCA_URL}...`);
  let openLcaAvailable = false;
  let methodInfo = null;
  let productSystems = [];

  try {
    const methods = await callOpenLca('get/impact_methods');
    methodInfo = methods.find(m => m.name.includes(OLCA_IMPACT_METHOD));
    if (!methodInfo) {
      console.warn(`Warning: Impact method '${OLCA_IMPACT_METHOD}' not found in OpenLCA.`);
    }
    productSystems = await callOpenLca('get/product_systems');
    openLcaAvailable = true;
  } catch (err) {
    console.log(`OpenLCA IPC not available at ${OLCA_URL}. Will use mock/fallback data for demo.`);
  }

  // Function to process a single material object and return the updated one
  async function processMaterial(material) {
    let updatedMat = { ...material };
    console.log(`Processing material: ${material.name}...`);
    
    if (openLcaAvailable && methodInfo) {
      try {
        const match = productSystems.find(ps => ps.name.toLowerCase() === material.name.toLowerCase());
        if (match) {
          console.log(`  -> Found matching product system '${match.name}'. Calculating...`);
          const setup = {
            target: { '@type': 'ProductSystem', '@id': match['@id'] },
            impactMethod: { '@type': 'ImpactMethod', '@id': methodInfo['@id'] },
            amount: 1.0
          };
          
          const calcResult = await callOpenLca('calculate', setup);
          const indicators = [];
          let gwpAmount = null;
          
          if (calcResult && calcResult.impactResults) {
            for (const ir of calcResult.impactResults) {
               indicators.push({
                 name: ir.indicator.name,
                 unit: ir.indicator.referenceUnit,
                 amount: ir.amount
               });
               if (ir.indicator.name.toLowerCase().includes('climate change') || 
                   ir.indicator.name.toLowerCase().includes('global warming') ||
                   ir.indicator.name.includes('GWP')) {
                 gwpAmount = ir.amount;
               }
            }
          }
          
          if (indicators.length > 0) {
            if (updatedMat.id) updatedMat.lca_indicators = indicators; // DB style
            updatedMat.lcaIndicators = indicators; // JSON style
            
            if (updatedMat.id) updatedMat.co2_source = 'OpenLCA';
            updatedMat.co2Source = 'OpenLCA';
            
            if (gwpAmount !== null) {
              if (updatedMat.id) updatedMat.co2_per_unit = gwpAmount;
              updatedMat.co2PerUnit = gwpAmount;
            }
            console.log(`  -> Real LCA data retrieved.`);
            return updatedMat;
          }
        }
      } catch (e) {
        console.error(`  -> Failed with OpenLCA calculation:`, e.message);
      }
    }
    
    // Fallback Mock Data
    console.log(`  -> [Fallback] Injecting sample LCA data...`);
    const baseCo2 = material.co2PerUnit || material.co2_per_unit || parseFloat((Math.random() * 50 + 10).toFixed(2));
    const mockIndicators = [
      { name: "GWP-total", unit: "kg CO2e", amount: baseCo2 },
      { name: "Försurning (AP)", unit: "mol H+ eq", amount: parseFloat((Math.random() * 0.5).toFixed(3)) },
      { name: "Övergödning (EP)", unit: "kg P eq", amount: parseFloat((Math.random() * 0.1).toFixed(4)) },
      { name: "Partiklar (PM)", unit: "disease inc.", amount: parseFloat((Math.random() * 0.001).toFixed(5)) }
    ];
    
    if (updatedMat.id) {
       updatedMat.lca_indicators = mockIndicators;
       updatedMat.co2_source = 'OpenLCA (Mock)';
       updatedMat.co2_per_unit = baseCo2;
    }
    updatedMat.lcaIndicators = mockIndicators;
    updatedMat.co2Source = 'OpenLCA (Mock)';
    updatedMat.co2PerUnit = baseCo2;
    
    return updatedMat;
  }

  // 1. Process app_state materials
  if (hasStateMaterials) {
    console.log('\n--- Syncing app_state (materials_all) ---');
    const updatedStateMaterials = [];
    for (const mat of stateMaterials) {
      updatedStateMaterials.push(await processMaterial(mat));
    }
    
    const { error: updateError } = await supabase
      .from('app_state')
      .update({ data: updatedStateMaterials })
      .eq('id', 'materials_all');
      
    if (updateError) {
      console.error('Error updating app_state:', updateError);
    } else {
      console.log('Successfully updated app_state (materials_all).');
    }
  }

  // 2. Process materials table
  if (hasTableMaterials) {
    console.log('\n--- Syncing materials table ---');
    for (const mat of tableMaterials) {
       const updatedMat = await processMaterial(mat);
       const { error: updateError } = await supabase
         .from('materials')
         .update({
           lca_indicators: updatedMat.lca_indicators,
           co2_source: updatedMat.co2_source,
           co2_per_unit: updatedMat.co2_per_unit
         })
         .eq('id', mat.id);
         
       if (updateError) {
         console.error(`Error updating material ${mat.name}:`, updateError);
       }
    }
    console.log('Successfully updated materials table.');
  }

  console.log('\nSync finished.');
}

syncMaterials();
