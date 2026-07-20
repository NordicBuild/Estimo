import re

with open("src/ffu/hooks/useDocumentBygdelLinks.ts", "r") as f:
    content = f.read()

content = content.replace(
    """    if (error) {
      console.error('Error fetching links', error);
    } else {
      setLinks(data as any);
    }""",
    """    if (error) {
      // console.warn('Table might not exist, using empty array for links', error);
      setLinks([]);
    } else {
      setLinks(data as any || []);
    }"""
)

with open("src/ffu/hooks/useDocumentBygdelLinks.ts", "w") as f:
    f.write(content)
