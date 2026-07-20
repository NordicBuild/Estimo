import re

with open("src/components/WorkspaceToolbar.tsx", "r") as f:
    content = f.read()

# Add import
if "ApprovalNotification" not in content:
    content = "import { ApprovalNotification } from './Ffu/ApprovalNotification';\n" + content

# Add the component at the end of WorkspaceActions
if "<ApprovalNotification />" not in content:
    content = content.replace(
'''      </div>
    </div>
  );
}

interface WorkspaceNavProps {''',
'''      </div>
      <div>
        <ApprovalNotification />
      </div>
    </div>
  );
}

interface WorkspaceNavProps {'''
    )

with open("src/components/WorkspaceToolbar.tsx", "w") as f:
    f.write(content)
