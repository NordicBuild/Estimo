import re

with open("index.html", "r") as f:
    content = f.read()

content = content.replace(
'''<meta name="viewport" content="width=device-width, initial-scale=1.0" />''',
'''<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />\n    <link rel="manifest" href="/manifest.json" />\n    <meta name="theme-color" content="#1f2937" />'''
)

with open("index.html", "w") as f:
    f.write(content)
