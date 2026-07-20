import re
with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

match_mc = re.search(r'\{/\* Main Canvas Area \*/\}', content)
match_rs = re.search(r'\{/\* Right Sidebar \*/\}', content)
main_canvas_area = content[match_mc.start():match_rs.start()]

print("main canvas Count <div", main_canvas_area.count('<div'))
print("main canvas Count </div", main_canvas_area.count('</div'))
print("main canvas Count {", main_canvas_area.count('{'))
print("main canvas Count }", main_canvas_area.count('}'))
print("main canvas Count <", main_canvas_area.count('<'))
print("main canvas Count >", main_canvas_area.count('>'))
