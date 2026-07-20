with open("right_sidebar.txt", "r") as f:
    rs_content = f.read()

idx_properties_header = rs_content.find('              <>\n                <div className="flex justify-between items-center mb-4">\n                  <div className="text-sm font-bold text-gray-800">\n                    Egenskaper')

# Instead of matching a long string with \n, let's just find the last `{pdfDoc && (`
idx_last_pdfDoc = rs_content.rfind('          {pdfDoc && (')

# And find the `</div>` before it. We know properties is wrapped in `<>` ... `</>`.
# Wait, look at the grep output:
#                )}
#              </>
#            )}
#          </div>
#          {pdfDoc && (

# So properties_content_end should be `idx_last_pdfDoc` minus `len('          </div>\n')`.
# Actually, let's just split by `          {pdfDoc && (` and take the first part, then rfind `</>`.

part_before_pdfdoc = rs_content[:idx_last_pdfDoc]
idx_properties_content_end = part_before_pdfdoc.rfind('              </>') + len('              </>')

properties_code = rs_content[idx_properties_header:idx_properties_content_end]

print("--- properties_code head ---")
print("\n".join(properties_code.split("\n")[:5]))
print("--- properties_code tail ---")
print("\n".join(properties_code.split("\n")[-5:]))

