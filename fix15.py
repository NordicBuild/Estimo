import re
with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

match = re.search(r'\{/\* Right Sidebar \*/\}', content)
if match:
    idx_right_sidebar_start = match.start()
    print("Found right sidebar at", idx_right_sidebar_start)
else:
    print("Not found")

idx_main_canvas_start = content.find('{/* Main Canvas Area */}')
print("Main canvas area at", idx_main_canvas_start)

