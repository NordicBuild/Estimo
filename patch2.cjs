const fs = require('fs');
const file = '/app/applet/src/components/BIMLeftPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('const [pollingMsg, setPollingMsg] = useState<string | null>(null);')) {
  code = code.replace(/const \[expandedSection, setExpandedSection\] = useState<'categories' \| 'storeys' \| 'disciplines' \| null>\('categories'\);/, `const [expandedSection, setExpandedSection] = useState<'categories' | 'storeys' | 'disciplines' | null>('categories');
  const [pollingMsg, setPollingMsg] = useState<string | null>(null);`);
}

code = code.replace(/      \/\/ 3\. Invoke parse function[\s\S]*?    \} catch \(err: any\) \{/, `      // 3. Invoke parse function (fire and forget from client perspective)
      supabase.functions.invoke('bim-process', {
        body: { filePath, projectId, modelId, format: 'ifc' }
      }).catch(e => console.warn("[BIM] Invoke returned error but we rely on db polling:", e));

      setPollingMsg("Bearbetar modell…");

      // 4. Poll database for status up to 90 seconds
      let elapsed = 0;
      let finalData = null;
      while (elapsed < 90000) {
        await new Promise(r => setTimeout(r, 2000));
        elapsed += 2000;

        const { data, error: pollError } = await supabase
          .from('bim_models')
          .select('status, metadata')
          .eq('id', modelId)
          .single();
        
        if (!pollError && data) {
          if (data.status === 'ready' || data.status === 'degraded' || data.status === 'error') {
            finalData = data;
            break;
          }
        }
      }

      setPollingMsg(null);

      if (!finalData) {
        throw new Error("BIM-bearbetning: Tidsgränsen överskreds.");
      }

      if (finalData.status === 'error') {
        throw new Error(\`BIM-bearbetning: \${finalData.metadata?.error || 'Okänt fel'}\`);
      }
      
      if (finalData.status === 'degraded' && finalData.metadata?.geometryError) {
        setError(\`BIM-bearbetning: \${finalData.metadata.geometryError}\`);
      }

      console.log(\`[BIM] Successfully parsed IFC. Loading into viewer...\`);

      setModelName(file.name);
      await setActiveModel(modelId);

    } catch (err: any) {`);

code = code.replace(/        \{error && \(\n          <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 rounded-md text-xs flex items-start gap-2 border border-red-100">\n            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0\.5" \/>\n            <span>\{error\}<\/span>\n          <\/div>\n        \)\}/, `        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 rounded-md text-xs flex items-start gap-2 border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {pollingMsg && !error && (
          <div className="mb-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-md text-xs flex items-start gap-2 border border-blue-100">
            <Layers className="w-4 h-4 flex-shrink-0 mt-0.5 animate-pulse" />
            <span>{pollingMsg}</span>
          </div>
        )}`);

fs.writeFileSync(file, code);
console.log('Patched BIMLeftPanel.tsx');
