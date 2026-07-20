with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_ledger = rs_content.find('{activeSidebarTab === "ledger" ? (')
# find the next `) : (`
idx = idx_ledger
while True:
    idx = rs_content.find(') : (', idx+1)
    if idx == -1: break
    print("Found ) : ( at", idx)
    print(rs_content[idx-50:idx+150])
    print("-" * 40)
