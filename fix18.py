import re
with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

match_mc = re.search(r'\{/\* Main Canvas Area \*/\}', content)
match_rs = re.search(r'\{/\* Right Sidebar \*/\}', content)

main_canvas_area = content[match_mc.start():match_rs.start()]
print("main_canvas_area length:", len(main_canvas_area))
print("Does it contain duplicate Right Sidebar?", "{/* Right Sidebar */}" in main_canvas_area)
