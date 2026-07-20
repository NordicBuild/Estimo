import re

with open("src/ffu/hooks/useDocumentApprovals.ts", "r") as f:
    content = f.read()

content = content.replace(
'''import { useActiveSpace } from '../../state/ActiveSpaceContext';''',
'''import { useProjectData } from '../../state/ProjectDataContext';'''
)

content = content.replace(
'''const { activeCompanyId } = useActiveSpace();''',
'''const { dataSpaceId } = useProjectData();
  const activeCompanyId = dataSpaceId;'''
)

with open("src/ffu/hooks/useDocumentApprovals.ts", "w") as f:
    f.write(content)
