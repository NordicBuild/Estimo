import re

with open("src/components/Ffu/FfuTab.tsx", "r") as f:
    content = f.read()

# Hide Taggar and Typ columns on mobile
content = content.replace(
'''<th className="p-3 font-semibold text-gray-700">Typ</th>
              <th className="p-3 font-semibold text-gray-700">Taggar</th>''',
'''<th className="p-3 font-semibold text-gray-700 hidden md:table-cell">Typ</th>
              <th className="p-3 font-semibold text-gray-700 hidden md:table-cell">Taggar</th>'''
)

content = content.replace(
'''<td className="p-3 text-gray-600">{doc.document_type}</td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">''',
'''<td className="p-3 text-gray-600 hidden md:table-cell">{doc.document_type}</td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">'''
)

with open("src/components/Ffu/FfuTab.tsx", "w") as f:
    f.write(content)
