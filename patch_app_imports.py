import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
'''import { supabase, logout, loginWithGoogle } from "./supabase";''',
'''import { supabase, logout, loginWithGoogle, saveProjectsToSupabase, saveFoldersToSupabase } from "./supabase";'''
)

with open("src/App.tsx", "w") as f:
    f.write(content)
