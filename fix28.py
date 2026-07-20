with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_prop_start = rs_content.find('{activeSidebarTab === "properties" ? (')
print(rs_content[idx_prop_start:idx_prop_start+500])
