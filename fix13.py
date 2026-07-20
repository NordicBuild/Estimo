with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx_main_canvas_start = content.find('        {/* Main Canvas Area */}')
idx_right_sidebar_start = content.find('        {/* Right Sidebar */}')
main_canvas_area = content[idx_main_canvas_start:idx_right_sidebar_start]

idx = main_canvas_area.find('ul className="space-y-4"')
print(main_canvas_area[idx-200:idx+200])
