with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx1 = content.find('Egenskaper')
# find the corresponding </> at the end of properties
idx2 = content.find('              </>\n              </div>\n          {pdfDoc && (')
prop_code = content[idx1:idx2]
print("Count <div", prop_code.count('<div'))
print("Count </div", prop_code.count('</div'))
print("Count {", prop_code.count('{'))
print("Count }", prop_code.count('}'))
