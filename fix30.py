with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_ledger = rs_content.find('{activeSidebarTab === "ledger" ? (')
# find the ending `) : (` of the ledger block
idx_colon = rs_content.find(') : (', idx_ledger)
print(rs_content[idx_colon-200:idx_colon+300])
