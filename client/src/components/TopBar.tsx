import { IconButton } from "./IconButton";
import { PlusIcon } from "./icons/PlusIcon";
import { SunIcon } from "./icons/SunIcon";
import { StatusDot } from "./StatusDot";

type TopBarProps = {
  apiReady: boolean;
  statusLabel: string;
  newChatDisabled: boolean;
  themeLabel: string;
  onNewChat: () => void;
  onThemeToggle: () => void;
};

export function TopBar({
  apiReady,
  statusLabel,
  newChatDisabled,
  themeLabel,
  onNewChat,
  onThemeToggle,
}: TopBarProps): React.JSX.Element {
  return (
    <header className="topbar">
      <div className="brand-group">
        <span className="brand-name">Papertrail</span>
      </div>
      <div className="status-group">
        <button
          className="new-chat-button"
          type="button"
          onClick={onNewChat}
          disabled={newChatDisabled}
        >
          <PlusIcon />
          <span>New chat</span>
        </button>
        <div className="api-status">
          <StatusDot ready={apiReady} />
          <span>{statusLabel}</span>
        </div>
        <IconButton label={themeLabel} onClick={onThemeToggle}>
          <SunIcon />
        </IconButton>
      </div>
    </header>
  );
}
