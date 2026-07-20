with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx1 = content.find('Exportera till Kalkyl')
print(content[idx1-500:idx1])
