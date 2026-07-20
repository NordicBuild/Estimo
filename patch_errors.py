import os
import glob

for filepath in glob.glob("src/ffu/hooks/*.ts"):
    with open(filepath, "r") as f:
        content = f.read()
    
    # We want to keep real errors, but many of these are missing table errors
    content = content.replace("console.error('Error fetching admin dashboard data:', error);", "console.warn('Dashboard fetch (expected if missing tables):', error);")
    content = content.replace("console.error('Error fetching comments:', err);", "console.warn('Comments fetch (expected if missing tables):', err);")
    content = content.replace("console.error('Error fetching PDF measurements:', err);", "console.warn('PDF measurements fetch (expected if missing tables):', err);")
    
    with open(filepath, "w") as f:
        f.write(content)

