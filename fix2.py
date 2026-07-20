import re

with open("src/components/PdfMeasurementTab.tsx", "r") as f:
    content = f.read()

# 1. Top part
idx_start_injected = content.find('      <div className="flex flex-col flex-1 min-h-0 relative">\n        <div className="flex flex-1 min-h-0 relative lg:flex-row flex-col">')
top_part = content[:idx_start_injected]

# 2. Main canvas area
idx_main_canvas_start = content.find('        {/* Main Canvas Area */}')
idx_right_sidebar_start = content.find('        {/* Right Sidebar */}')
main_canvas_area = content[idx_main_canvas_start:idx_right_sidebar_start]

# 3. Bottom part
idx_bottom_part = content.find('      {dialogConfig && dialogConfig.isOpen && (')
bottom_part = content[idx_bottom_part:]

# 4. Rebuild Right Sidebar from right_sidebar.txt
with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

# rs_content starts with `{/* Right Sidebar */}`
# Let's cleanly separate its parts.
idx_properties_header = rs_content.find('              <>\n                <div className="flex justify-between items-center mb-4">\n                  <div className="text-sm font-bold text-gray-800">\n                    Egenskaper')

if idx_properties_header == -1:
    print("Cannot find Egenskaper header")

idx_properties_content_start = rs_content.find(') : (', rs_content.find('{activeSidebarTab === "ledger" ? (')) + len(') : (\n')

# Find the end of properties content.
# It ends right before `              </>\n            )}\n          </div>\n          {pdfDoc && (`
idx_properties_content_end = rs_content.find('              </>\n            )}\n          </div>\n          {pdfDoc && (')

properties_code = rs_content[idx_properties_content_start:idx_properties_content_end].strip()

# Now find where the tabs are
idx_tabs_start = rs_content.find('              <div className="flex p-2 bg-gray-50 border-b border-gray-200">')
idx_tabs_end = rs_content.find('              <div className="p-3 flex-1 overflow-y-auto bg-gray-50">')

sidebar_top = rs_content[:idx_tabs_start]
# Replace class
sidebar_top = sidebar_top.replace(
    'className="w-64 lg:w-72 border-l border-gray-200 bg-white flex flex-col shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]"',
    'className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] overflow-y-auto max-h-[50vh] lg:max-h-full"'
)

# Extract what goes at the end of the sidebar (Export buttons)
# Wait, rs_content ends with:
#           </div>
#           {pdfDoc && ( ... )}
#         </div>
# Which closes the sidebar.
idx_sidebar_bottom_start = rs_content.find('          {pdfDoc && (\n            <div className="p-5 flex flex-col gap-3')
# We need to include `          </div>\n` if it's there, but actually properties_code needs to be wrapped.

new_right_sidebar = sidebar_top + '              <div className="p-3 flex-1 overflow-y-auto bg-gray-50">\n' + properties_code + '\n              </div>\n' + rs_content[idx_sidebar_bottom_start:]

# Fix any stray closing tags in new_right_sidebar
# The original rs_content had `          </div>\n          {pdfDoc && (` so we just need to make sure `</div>` is there.
# Let's just manually append the end.
end_of_rs = """
          {pdfDoc && (
            <div className="p-5 flex flex-col gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <button
                onClick={exportSelected}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  add_task
                </span>{" "}
                Exportera till Kalkyl ({measurements.length})
              </button>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button className="w-full py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg font-medium text-xs hover:bg-gray-100 transition-colors flex justify-center items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    picture_as_pdf
                  </span>{" "}
                  PDF
                </button>
                <button className="w-full py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg font-medium text-xs hover:bg-gray-100 transition-colors flex justify-center items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    table_chart
                  </span>{" "}
                  Excel
                </button>
              </div>
            </div>
          )}
        </div>
"""

new_right_sidebar = sidebar_top + '              <div className="p-3 flex-1 overflow-y-auto bg-gray-50">\n' + properties_code + '\n              </div>\n' + end_of_rs

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

new_content = top_part + '      <div className="flex flex-col flex-1 min-h-0 relative">\n        <div className="flex flex-1 min-h-0 relative lg:flex-row flex-col">\n' + main_canvas_area + new_right_sidebar + '\n        </div>\n' + bottom_table_code + '\n      </div>\n' + bottom_part

with open("src/components/PdfMeasurementTab.tsx", "w") as f:
    f.write(new_content)

print("Replacement done cleanly")
