import type { WorkspaceView } from "../types";
import papertrailIcon from "../assets/papertrail-icon.png";
import { IconButton } from "./IconButton";
import { PlusIcon } from "./icons/PlusIcon";
import { SunIcon } from "./icons/SunIcon";
import { StatusDot } from "./StatusDot";
import { WorkspaceTabs } from "./WorkspaceTabs";

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
