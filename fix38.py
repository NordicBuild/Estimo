with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

print("right_sidebar Count <>", rs_content.count('<>'))
print("right_sidebar Count </>", rs_content.count('</>'))
