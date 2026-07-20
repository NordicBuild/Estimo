with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx1 = content.find('Egenskaper')
print(content[idx1-200:idx1])
