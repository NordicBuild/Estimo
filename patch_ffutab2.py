import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

# Add import
if "OfflineIndicator" not in content:
    content = "import { OfflineIndicator } from './OfflineIndicator';\n" + content

# Make responsive layout
# 1. wrap table in overflow-x-auto
content = content.replace(
'''<div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col">
        <table className="w-full text-left text-sm">''',
'''<OfflineIndicator />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">'''
)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
