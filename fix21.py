with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    lines = f.readlines()

print("Last 10 lines of file:")
print("".join(lines[-10:]))
