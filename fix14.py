with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx_main_canvas_start = content.find('        {/* Main Canvas Area */}')
idx_right_sidebar_start = content.find('        {/* Right Sidebar */}')

print("main canvas start:", idx_main_canvas_start)
print("right sidebar start:", idx_right_sidebar_start)
print("Count of Right Sidebar:", content.count('{/* Right Sidebar */}'))
