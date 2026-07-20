with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_tabs_start = 5112
print(rs_content[:idx_tabs_start][-200:])
