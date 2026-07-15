with open("src/components/Workspace/TabRouter.tsx", "r") as f:
    content = f.read()

content = content.replace("import { MaterialTab } from '../MaterialTab';", "import { MaterialTab } from '../MaterialTab';\nimport { FfuTab } from '../Ffu/FfuTab';")

old_block = """      {activeTab === 'dokument_ffu' && (
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">description</span>
            <h2 className="text-2xl font-bold text-on-surface">FFU</h2>
            <p className="text-on-surface-variant mt-2">Denna sektion är under utveckling.</p>
          </div>
        </div>
      )}"""

new_block = """      {activeTab === 'dokument_ffu' && (
        <FfuTab projectId={projectId || ''} />
      )}"""

if old_block in content:
    content = content.replace(old_block, new_block)
else:
    print("Old block not found!")

with open("src/components/Workspace/TabRouter.tsx", "w") as f:
    f.write(content)
