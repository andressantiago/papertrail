import type { WorkspaceView } from "../types";

type WorkspaceTabsProps = {
  activeWorkspace: WorkspaceView;
  onWorkspaceChange: (workspace: WorkspaceView) => void;
};

const WORKSPACES: Array<{ id: WorkspaceView; label: string }> = [
  { id: "files", label: "Files" },
  { id: "chat", label: "Chat" },
];

export function WorkspaceTabs({
  activeWorkspace,
  onWorkspaceChange,
}: WorkspaceTabsProps): React.JSX.Element {
  return (
    <div className="workspace-tabs" role="tablist" aria-label="Workspace">
      {WORKSPACES.map((workspace) => (
        <button
          key={workspace.id}
          className={workspace.id === activeWorkspace ? "workspace-tab is-active" : "workspace-tab"}
          type="button"
          role="tab"
          aria-selected={workspace.id === activeWorkspace}
          onClick={() => onWorkspaceChange(workspace.id)}
        >
          {workspace.label}
        </button>
      ))}
    </div>
  );
}
