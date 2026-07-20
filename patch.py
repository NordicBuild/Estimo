with open('src/components/Ffu/AdminDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace(
'''  const {
    isLoading,
    totalDocuments,
    totalSize,
    docsPerMonth,
    topCommented,
    accessLogs,
    complianceData,
    fetchAccessLogs
  } = useAdminDashboard(projectId);''',
'''  const {
    isLoading,
    totalDocuments,
    totalSize,
    docsPerMonth,
    topCommented,
    accessLogs,
    complianceData,
    collabData,
    fetchAccessLogs
  } = useAdminDashboard(projectId);'''
)

with open('src/components/Ffu/AdminDashboard.tsx', 'w') as f:
    f.write(content)
