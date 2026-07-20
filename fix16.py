with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()
idx = content.find('{/* Main Canvas Area */}')
print(content[idx-200:idx])
