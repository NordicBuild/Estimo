import re
with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx_dialog = content.find('{dialogConfig && dialogConfig.isOpen && (')
idx_toolbutton = content.find('function ToolButton({')

# Find where the first ToolButton ends. It ends at the first `}\n` after ToolButton?
# Let's just find the first `}\n` after ToolButton that closes it.
# Actually, the file just ends with ToolButton!
idx_eof = content.find('  </button>\n  );\n}', idx_toolbutton) + len('  </button>\n  );\n}')

bottom_part = content[idx_dialog:idx_eof]
print("bottom_part length:", len(bottom_part))
print("Ends with:", repr(bottom_part[-50:]))
