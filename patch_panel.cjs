const fs = require('fs');
const file = '/app/applet/src/components/BIMLeftPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{ supabase \} from '\.\.\/supabase';/, `import { supabase } from '../supabase';
import { parseIfc } from '../bim/ifc/parseIfc';`);

code = code.replace(/  const setElements = useBIMStore\(\(state\) => state\.setElements\);/, `  const setElements = useBIMStore((state) => state.setElements);
  const setParsedMeshes = useBIMStore((state) => state.setParsedMeshes);`);

code = code.replace(/      console\.log\(\`\[BIM\] Uploading \$\{file\.name\} to \$\{filePath\}\.\.\.\`\);[\s\S]*?      await setActiveModel\(modelId\);\n\n    \} catch \(err: any\) \{/, `      // a) Read file and parse locally
      setPollingMsg("Läser fil...");
      const arrayBuffer = await file.arrayBuffer();
      
      setPollingMsg("Extraherar BIM-data (lokalt)...");
      const parsedModel = await parseIfc(arrayBuffer, (pct) => {
        setPollingMsg(\`Extraherar BIM-data (\${Math.round(pct)}%)...\`);
      });

      setPollingMsg("Laddar 3D-vy...");
      
      const newElements = parsedModel.elements.map(e => ({
        id: crypto.randomUUID(),
        model_id: modelId,
        guid: e.guid,
        name: e.name,
        category: e.category,
        storey: e.storey,
        discipline: e.discipline,
        properties: e.properties,
        created_at: new Date().toISOString()
      }));

      // c) Upload to storage
      setPollingMsg("Sparar fil i molnet...");
      const { error: uploadError } = await supabase.storage
        .from('bim-uploads')
        .upload(filePath, file, { upsert: false });
        
      if (uploadError) throw uploadError;

      // d) Create bim_models row
      const { error: dbError } = await supabase.from('bim_models').insert({
        id: modelId,
        company_id: companyId,
        project_id: projectId,
        name: file.name,
        file_url: filePath,
        format: 'ifc',
        status: 'ready',
        has_geometry: false
      });

      if (dbError) throw dbError;

      // e) Batch-insert elements
      setPollingMsg("Sparar element...");
      for (let i = 0; i < newElements.length; i += 1000) {
        const batch = newElements.slice(i, i + 1000);
        const { error: batchError } = await supabase.from('bim_elements').insert(batch);
        if (batchError) {
          console.warn("[BIM] Element batch insert error:", batchError);
        }
      }

      setPollingMsg(null);
      
      setParsedMeshes(parsedModel.meshes);
      setModelName(file.name);
      
      // Load active model from DB
      await setActiveModel(modelId);

    } catch (err: any) {`);

fs.writeFileSync(file, code);
console.log('Patched BIMLeftPanel.tsx handleFileUpload');
