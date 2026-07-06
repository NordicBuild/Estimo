-- 1. Fastnade modeller? (F2-symptom)
SELECT id, name, status, has_geometry, geometry_url IS NOT NULL AS har_url,
       metadata->>'geometryError' AS geo_fel, created_at
FROM bim_models
ORDER BY created_at DESC
LIMIT 10;

-- 2. Har elementen kommit in?
SELECT model_id, COUNT(*) AS antal_element,
       COUNT(*) FILTER (WHERE properties ? 'ExpressID') AS med_expressid
FROM bim_elements
GROUP BY model_id;

-- 3. Är bucketen publik? (F3: getPublicUrl kräver public = true)
SELECT id, name, public FROM storage.buckets WHERE id = 'bim-uploads';
