with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_ledger = rs_content.find('{activeSidebarTab === "ledger" ? (')
print(rs_content[idx_ledger-200:idx_ledger+200])
