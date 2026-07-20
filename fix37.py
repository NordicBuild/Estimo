with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx_rs = content.find('{/* Right Sidebar */}')
idx_bottom = content.find('{/* Bottom Panel: Measurements Table */}')

rs = content[idx_rs:idx_bottom]
print("rs Count <div", rs.count('<div'))
print("rs Count </div", rs.count('</div'))
print("rs Count <>", rs.count('<>'))
print("rs Count </>", rs.count('</>'))
