with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_tabs_start = rs_content.find('              <div className="flex p-2 bg-gray-50 border-b border-gray-200">')
sidebar_top = rs_content[:idx_tabs_start]

sidebar_top += '            </>\n          )}\n'

print("Count <", sidebar_top.count('<'))
print("Count >", sidebar_top.count('>'))
print("Count {", sidebar_top.count('{'))
print("Count }", sidebar_top.count('}'))
