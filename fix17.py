with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx_start_injected = content.find('      <div className="flex flex-col flex-1 min-h-0 relative">')
print("idx_start_injected:", idx_start_injected)
top_part = content[:idx_start_injected]
print("Top part ends with:")
print(top_part[-200:])
