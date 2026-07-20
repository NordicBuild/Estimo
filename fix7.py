with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_properties_header = rs_content.find('              <>\n                <div className="flex justify-between items-center mb-4">\n                  <div className="text-sm font-bold text-gray-800">\n                    Egenskaper')
print("At 11635:", repr(rs_content[11635:11635+50]))
print("Is it -1?", idx_properties_header == -1)
