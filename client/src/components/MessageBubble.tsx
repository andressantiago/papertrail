import type { ChatMessage } from "../types";
import { AlertIcon } from "./icons/AlertIcon";
import { BotIcon } from "./icons/BotIcon";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps): React.JSX.Element {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(message.createdAt));

  return (
    <article className={`message-row is-${message.role}`}>
      {message.role === "assistant" ? (
        <div className="bot-avatar" aria-hidden="true">
          <BotIcon />
        </div>
      ) : null}
      <div className={`message-bubble ${message.status === "error" ? "has-error" : ""}`}>
        {message.content ? <p>{message.content}</p> : <p className="typing">Thinking</p>}
        {message.error ? (
          <div className="bubble-error">
            <AlertIcon />
            <span>{message.error}</span>
          </div>
        ) : null}
        <time dateTime={message.createdAt}>{time}</time>
      </div>
    </article>
  );
}
