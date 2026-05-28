import type { ApiStatus } from "../types";
import { IconButton } from "./IconButton";
import { PlusIcon } from "./icons/PlusIcon";
import { SunIcon } from "./icons/SunIcon";
import { ModelPill } from "./ModelPill";
import { StatusDot } from "./StatusDot";

type TopBarProps = {
  status: ApiStatus;
  statusLabel: string;
  statusLoading: boolean;
  newChatDisabled: boolean;
  onNewChat: () => void;
};

export function TopBar({
  status,
  statusLabel,
  statusLoading,
  newChatDisabled,
  onNewChat,
}: TopBarProps): React.JSX.Element {
  return (
    <header className="topbar">
      <div className="brand-group">
        <div className="brand-mark" aria-hidden="true">
          P
        </div>
        <span className="brand-name">Papertrail</span>
      </div>
      <div className="status-group">
        <button className="new-chat-button" type="button" onClick={onNewChat} disabled={newChatDisabled}>
          <PlusIcon />
          <span>New chat</span>
        </button>
        <ModelPill model={status.model} />
        <div className="api-status">
          <StatusDot configured={status.configured && !statusLoading} />
          <span>{statusLabel}</span>
        </div>
        <IconButton label="Theme">
          <SunIcon />
        </IconButton>
      </div>
    </header>
  );
}
