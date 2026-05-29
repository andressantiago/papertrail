import { AlertIcon } from "@client/components/icons/AlertIcon";
import { TypingIndicator } from "@client/components/TypingIndicator";
import { formatMessageTime } from "@client/lib/dateFormat";
import type { ChatMessage } from "@client/types";

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
