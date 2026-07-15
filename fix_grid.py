with open("src/kalkyl/UnifiedGrid.tsx", "r") as f:
    content = f.read()

content = content.replace(
    """<tr className={`border-b border-gray-200 bg-[#f1f5f9] hover:bg-[#e2e8f0] font-semibold text-gray-800 ${inact ? 'opacity-50' : ''}`}> className={`border-b border-gray-200 bg-[#f1f5f9] hover:bg-[#e2e8f0] font-semibold text-gray-800 ${inact ? 'opacity-50' : ''}`}>""",
    """<tr className={`border-b border-gray-200 bg-[#f1f5f9] hover:bg-[#e2e8f0] font-semibold text-gray-800 ${inact ? 'opacity-50' : ''}`}>"""
)

with open("src/kalkyl/UnifiedGrid.tsx", "w") as f:
    f.write(content)

