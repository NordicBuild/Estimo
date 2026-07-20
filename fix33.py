with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_properties_header = rs_content.find('              <>\n                <div className="flex justify-between items-center mb-4">\n                  <div className="text-sm font-bold text-gray-800">\n                    Egenskaper')
idx_last_pdfDoc = rs_content.rfind('          {pdfDoc && (')

part = rs_content[idx_properties_header:idx_last_pdfDoc]
print(part[-300:])
