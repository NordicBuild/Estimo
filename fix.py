with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx_iv = content.find('iv className="w-64')
print("idx_iv:", idx_iv)
print("Before iv:")
print(content[idx_iv-100:idx_iv])
