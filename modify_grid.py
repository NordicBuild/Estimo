import re

with open("src/kalkyl/UnifiedGrid.tsx", "r") as f:
    content = f.read()

# Add fragment around section row
content = content.replace(
    'return (\n                <tr key={`sec-${row.byggdelId}`}',
    '''const partLinks = props.docLinks?.filter(l => l.byggdel_id === String(row.byggdelId)) || [];
              const hasLinks = partLinks.length > 0;
              const isExpanded = expandedDocs.has(row.byggdelId);
              
              return (
                <React.Fragment key={`sec-${row.byggdelId}`}>
                <tr className={`border-b border-gray-200 bg-[#f1f5f9] hover:bg-[#e2e8f0] font-semibold text-gray-800 ${inact ? 'opacity-50' : ''}`}>'''
)

# Replace the closing tr for section
content = content.replace(
    '</IconButton>\n                  </td>\n                </tr>\n              );',
    '''</IconButton>
                  </td>
                </tr>
                {hasLinks && isExpanded && (
                  <tr className="bg-white border-b border-gray-200">
                    <td colSpan={2} className="border-r border-gray-200 bg-gray-50"></td>
                    <td colSpan={11} className="p-3 bg-gray-50/50">
                      <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-link text-gray-400"></i> Kopplade Dokument
                      </div>
                      <div className="space-y-2">
                        {partLinks.map((link: any) => (
                          <div key={link.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                            <i className="fa-solid fa-file-pdf text-red-500"></i>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{link.document?.filename || 'Okänt dokument'}</div>
                              <div className="text-xs text-gray-500">Typ: {link.link_type} {link.notes ? `- ${link.notes}` : ''}</div>
                            </div>
                            <a href={`/app?tab=dokument_ffu`} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-3 py-1 bg-blue-50 rounded">
                              Öppna i FFU
                            </a>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );'''
)

# Add the badge
content = content.replace(
    '<span className="text-[9px] text-gray-500 font-normal uppercase tracking-wider">{row.type}</span>',
    '''<span className="text-[9px] text-gray-500 font-normal uppercase tracking-wider">{row.type}</span>
                    {hasLinks && (
                      <span 
                        className="ml-2 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded cursor-pointer border border-blue-200 hover:bg-blue-100 flex items-center gap-1 w-fit"
                        onClick={(e) => { e.stopPropagation(); toggleDocs(row.byggdelId); }}
                        title="Klicka för att se länkade dokument"
                      >
                        <i className="fa-solid fa-file-lines"></i> {partLinks.length} länkade
                      </span>
                    )}'''
)

with open("src/kalkyl/UnifiedGrid.tsx", "w") as f:
    f.write(content)

