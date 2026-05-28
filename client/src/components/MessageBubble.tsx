import type { ChatMessage } from "../types";
import { formatMessageTime } from "../lib/dateFormat";
import { AlertIcon } from "./icons/AlertIcon";
import { TypingIndicator } from "./TypingIndicator";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps): React.JSX.Element {
  const time = formatMessageTime(new Date(message.createdAt));

  return (
    <article className={`message-row is-${message.role}`}>
      <div className={`message-bubble ${message.status === "error" ? "has-error" : ""}`}>
        {message.content ? <p>{message.content}</p> : <TypingIndicator />}
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
