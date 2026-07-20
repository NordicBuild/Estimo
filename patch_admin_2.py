import re

with open("src/components/Ffu/AdminDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace("jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }", "jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' as const }")
content = content.replace('<Button variant="ghost" size="sm" onClick={exportToCSV}>', '<Button variant="ghost" onClick={exportToCSV}>')

with open("src/components/Ffu/AdminDashboard.tsx", "w") as f:
    f.write(content)

