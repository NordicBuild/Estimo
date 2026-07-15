with open("src/ffu/hooks/useInspections.ts", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "if (projectId" in line and "user" in line and "{" in line:
        if "setIsLoading" not in line:
            lines[i] = "    if (projectId && user) {\n"

with open("src/ffu/hooks/useInspections.ts", "w") as f:
    f.writelines(lines)
