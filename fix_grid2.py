with open("src/kalkyl/UnifiedGrid.tsx", "r") as f:
    content = f.read()

content = content.replace(
    """<IconButton className="w-6 h-6 text-gray-400 hover:text-red-600" title="Radera" onClick={() => props.removePart(row.byggdelId)} icon="delete" />
                  </td>
                </tr>
              );""",
    """<IconButton className="w-6 h-6 text-gray-400 hover:text-red-600" title="Radera" onClick={() => props.removePart(row.byggdelId)} icon="delete" />
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
                            <a href={`/?tab=dokument_ffu`} className="text-blue-600 hover:text-blue-800 text-xs font-medium px-3 py-1 bg-blue-50 rounded">
                              Öppna i FFU
                            </a>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );"""
)

with open("src/kalkyl/UnifiedGrid.tsx", "w") as f:
    f.write(content)

