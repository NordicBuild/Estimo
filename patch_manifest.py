import json

with open("public/manifest.json", "r") as f:
    data = json.load(f)

data["icons"] = [
    {
      "src": "/icon.svg",
      "sizes": "512x512",
      "type": "image/svg+xml"
    }
]

with open("public/manifest.json", "w") as f:
    json.dump(data, f, indent=2)
