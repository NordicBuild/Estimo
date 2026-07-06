import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log("=== 1. Fastnade modeller? ===");
  const { data: models, error: err1 } = await supabase
    .from('bim_models')
    .select('id, name, status, has_geometry, geometry_url, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (err1) console.error(err1);
  else {
    models.forEach(m => {
      console.log(`- ${m.id} | ${m.name} | ${m.status} | has_geom:${m.has_geometry} | har_url:${m.geometry_url !== null} | geo_fel:${m.metadata?.geometryError} | ${m.created_at}`);
    });
  }

  console.log("\n=== 2. Har elementen kommit in? ===");
  const { data: elements, error: err2 } = await supabase
    .from('bim_elements')
    .select('model_id, properties');
  if (err2) console.error(err2);
  else {
    const grouped = {};
    elements.forEach(e => {
      if (!grouped[e.model_id]) grouped[e.model_id] = { total: 0, with_expressid: 0 };
      grouped[e.model_id].total++;
      if (e.properties && e.properties.ExpressID) grouped[e.model_id].with_expressid++;
    });
    console.log(grouped);
  }

  console.log("\n=== 3. Är bucketen publik? ===");
  const { data: bucket, error: err3 } = await supabase.storage.getBucket('bim-uploads');
  if (err3) console.error(err3);
  else {
    console.log(`Bucket: ${bucket.id}, Public: ${bucket.public}`);
  }
}

run();
