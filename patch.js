const fs = require('fs');
const file = '/app/applet/supabase/functions/bim-process/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/try {\n    const { filePath, projectId, modelId, format } = await req\.json\(\);\n\n    if \(!filePath \|\| !projectId \|\| !modelId\) {\n      throw new Error\("Missing required parameters \(filePath, projectId, modelId\)\."\);\n    }\n\n    if \(format && format\.toLowerCase\(\) !== 'ifc'\) {\n      throw new Error\("Unsupported format\. Only 'ifc' is currently supported\."\);\n    }\n\n    \/\/ Initialize Supabase client with Service Role to bypass RLS during background processing\n    const supabaseClient = createClient\(\n      Deno\.env\.get\('SUPABASE_URL'\) \?\? '',\n      Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\) \?\? '',\n      { auth: { persistSession: false } }\n    \);\n/, `let modelId: string | undefined;

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
`);

code = code.replace(/    \/\/ Attempt to update model status to 'error' if possible\n    try {\n      \/\/ In a real scenario we'd need to extract modelId again or keep it scoped\n    } catch \(_\) {}/, `    // Attempt to update model status to 'error' if possible
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
    }`);

fs.writeFileSync(file, code);
console.log('Patched index.ts');
