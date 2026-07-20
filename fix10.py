with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_properties_header = rs_content.find('              <>\n                <div className="flex justify-between items-center mb-4">\n                  <div className="text-sm font-bold text-gray-800">\n                    Egenskaper')

idx_last_pdfDoc = rs_content.rfind('          {pdfDoc && (')
part_before_pdfdoc = rs_content[:idx_last_pdfDoc]
idx_properties_content_end = part_before_pdfdoc.rfind('              </>') + len('              </>')

properties_code = rs_content[idx_properties_header:idx_properties_content_end]
print("properties_code length:", len(properties_code))
print("properties_code starts with:", repr(properties_code[:50]))
print("Does it contain ul space-y-4?", "ul className=\"space-y-4\"" in properties_code)

