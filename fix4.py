with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_properties_header = rs_content.find('              <>\n                <div className="flex justify-between items-center mb-4">\n                  <div className="text-sm font-bold text-gray-800">\n                    Egenskaper')

idx_properties_content_end = rs_content.find('              </>\n            )}\n          </div>\n          {pdfDoc && (')

properties_code = rs_content[idx_properties_header:idx_properties_content_end]
print("--- properties_code head ---")
print("\n".join(properties_code.split("\n")[:10]))
print("--- properties_code tail ---")
print("\n".join(properties_code.split("\n")[-10:]))
