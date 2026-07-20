with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx = content.find('function ToolButton({')
print(content[idx-100:idx])
