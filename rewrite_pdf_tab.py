import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

idx_main_container = content.find('<div className="flex flex-1 min-h-0 relative">')
idx_right_sidebar = content.find('{/* Right Sidebar */}')
idx_end_of_sidebar = content.find('      {dialogConfig && dialogConfig.isOpen && (')

main_canvas_area = content[idx_main_container + len('<div className="flex flex-1 min-h-0 relative">'):idx_right_sidebar]
right_sidebar = content[idx_right_sidebar:idx_end_of_sidebar]

# 1. Modify the main Canvas Area wrapper if needed (it already has its own divs).

# 2. Re-write the Right Sidebar by removing the 'ledger' tab completely.
# Find where the ledger tab content begins and ends.
ledger_condition_start = right_sidebar.find('{activeSidebarTab === "ledger" ? (')
properties_else_start = right_sidebar.find(') : (\n              <>\n                <div className="flex justify-between items-center mb-4">\n                  <div className="text-sm font-bold text-gray-800">\n                    Egenskaper')

if properties_else_start == -1:
    properties_else_start = right_sidebar.find(') : (\n              <>')

properties_content_start = properties_else_start + len(') : (')
properties_content_end = right_sidebar.rfind('              </>\n            )}\n          </div>\n          {pdfDoc && (')

properties_code = right_sidebar[properties_content_start:properties_content_end].strip()

# Now find the tab buttons in Right Sidebar
tab_buttons_start = right_sidebar.find('<div className="flex p-2 bg-gray-50 border-b border-gray-200">')
tab_buttons_end = right_sidebar.find('<div className="p-3 flex-1 overflow-y-auto bg-gray-50">')

# Extract the top part of the sidebar (Skala, Mätgrupper)
sidebar_top = right_sidebar[:tab_buttons_start]
sidebar_bottom = right_sidebar[properties_content_end + len('              </>\n            )}\n'):]

# Replace w-64 lg:w-72 with w-full lg:w-72
sidebar_top = sidebar_top.replace(
    'className="w-64 lg:w-72 border-l border-gray-200 bg-white flex flex-col shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]"',
    'className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] overflow-y-auto max-h-[50vh] lg:max-h-full"'
)

new_right_sidebar = sidebar_top + '<div className="p-3 flex-1 overflow-y-auto bg-gray-50">\n' + properties_code + '\n</div>\n' + sidebar_bottom

# 3. Create the Bottom Table
bottom_table_code = """
        {/* Bottom Panel: Measurements Table */}
        {pdfDoc && (
          <div className="h-[250px] lg:h-[300px] border-t border-gray-300 bg-white flex flex-col shrink-0 z-20 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] w-full">
            <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex justify-between items-center shrink-0">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">list_alt</span>
                Mätningar (Mängdförteckning)
              </span>
              <span className="text-gray-500 text-xs font-medium">
                Sida {pageNum} ({measurements.filter((m) => m.page === pageNum).length} objekt)
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase">Färg</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase">Namn/Etikett</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase">Typ</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase">Grupp</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-right">Mängd</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-right">Höjd/Djup</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-right">Antal</th>
                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-right">Totalt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {measurements.filter((m) => m.page === pageNum).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400 font-medium">
                        Inga mätningar på denna sida.
                      </td>
                    </tr>
                  ) : (
                    measurements.filter((m) => m.page === pageNum).map(m => {
                      const groupName = measurementGroups.find(g => g.id === (m.groupId || 'default'))?.name || 'Standard';
                      const isSelected = selectedMeasurementId === m.id;
                      const unit = m.tool === "area" ? "m²" : m.tool === "volume" ? "m³" : m.tool === "count" ? "st" : m.tool === "text" ? "" : "m";
                      return (
                        <tr 
                          key={m.id} 
                          onClick={() => setSelectedMeasurementId(m.id)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2 text-center w-10">
                            <div className="w-3 h-3 rounded-full mx-auto shadow-sm" style={{ backgroundColor: m.color }}></div>
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800">{m.name || (m.tool === 'text' ? m.text : `Mätning ${m.id.substring(m.id.length - 4)}`)}</td>
                          <td className="px-3 py-2 text-gray-600 capitalize">{m.tool}</td>
                          <td className="px-3 py-2 text-gray-600">{groupName}</td>
                          <td className="px-3 py-2 text-gray-800 font-mono text-right">{m.tool !== 'text' && m.tool !== 'count' ? m.value?.toFixed(2) : '-'} {m.tool !== 'text' && m.tool !== 'count' ? unit : ''}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-right">{m.height ? m.height.toFixed(2) + ' m' : '-'}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-right">{m.multiplier || 1}</td>
                          <td className="px-3 py-2 text-gray-800 font-bold font-mono text-right bg-gray-50/50">
                            {m.tool !== 'text' ? ((m.value || (m.tool === 'count' ? 1 : 0)) * (m.multiplier || 1)).toFixed(2) : '-'} {m.tool !== 'text' ? unit : ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
"""

# Construct the new layout
new_layout = f"""
      <div className="flex flex-col flex-1 min-h-0 relative">
        <div className="flex flex-1 min-h-0 relative lg:flex-row flex-col">
          {main_canvas_area}
          {new_right_sidebar}
        </div>
        {bottom_table_code}
      </div>
"""

new_content = content[:idx_main_container] + new_layout + content[idx_end_of_sidebar:]

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(new_content)

print("Replacement done")
