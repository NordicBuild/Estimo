with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_tabs_start = rs_content.find('              <div className="flex p-2 bg-gray-50 border-b border-gray-200">')
print("tabs start:", idx_tabs_start)
