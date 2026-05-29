import papertrailIcon from "@client/assets/papertrail-icon.png";
import { IconButton } from "@client/components/IconButton";
import { PlusIcon } from "@client/components/icons/PlusIcon";
import { SunIcon } from "@client/components/icons/SunIcon";
import { StatusDot } from "@client/components/StatusDot";
import { WorkspaceTabs } from "@client/components/WorkspaceTabs";
import type { WorkspaceView } from "@client/types";

type TopBarProps = {
  activeWorkspace: WorkspaceView;
  apiReady: boolean;
  statusLabel: string;
  newChatDisabled: boolean;
  themeLabel: string;
  onWorkspaceChange: (workspace: WorkspaceView) => void;
  onNewChat: () => void;
  onThemeToggle: () => void;
};

export function TopBar({
  activeWorkspace,
  apiReady,
  statusLabel,
  newChatDisabled,
  themeLabel,
  onWorkspaceChange,
  onNewChat,
  onThemeToggle,
}: TopBarProps): React.JSX.Element {
  return (
    <header className="topbar">
      <div className="topbar-primary">
        <img className="brand-logo" src={papertrailIcon} alt="Papertrail" />
        <WorkspaceTabs activeWorkspace={activeWorkspace} onWorkspaceChange={onWorkspaceChange} />
      </div>
      <div className="status-group">
        {activeWorkspace === "chat" ? (
          <button
            className="new-chat-button"
            type="button"
            onClick={onNewChat}
            disabled={newChatDisabled}
          >
            <PlusIcon />
            <span>New chat</span>
          </button>
        ) : null}
        <div
          className="api-status"
          role="status"
          aria-label={statusLabel}
          data-label={statusLabel}
          title={statusLabel}
        >
          <StatusDot ready={apiReady} />
        </div>
        <IconButton label={themeLabel} onClick={onThemeToggle}>
          <SunIcon />
        </IconButton>
      </div>
    </header>
  );
}
