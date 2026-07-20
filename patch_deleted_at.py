import os

def remove_deleted_at(filepath):
    with open(filepath, "r") as f:
        content = f.read()
    
    content = content.replace(".is('deleted_at', null)", "")
    
    with open(filepath, "w") as f:
        f.write(content)

remove_deleted_at("src/components/Ffu/FfuTab.tsx")
remove_deleted_at("src/components/DocumentPickerModal.tsx")
remove_deleted_at("src/ffu/hooks/useBatchOperations.ts")
