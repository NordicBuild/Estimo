with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx_main_canvas_start = content.find('        {/* Main Canvas Area */}')
idx_right_sidebar_start = content.find('        {/* Right Sidebar */}')
main_canvas_area = content[idx_main_canvas_start:idx_right_sidebar_start]
print("Does main_canvas_area contain ul space-y-4?", "ul className=\"space-y-4\"" in main_canvas_area)
