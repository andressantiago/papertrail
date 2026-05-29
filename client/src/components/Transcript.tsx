import { useMemo } from "react";
import { formatDateDivider } from "../lib/dateFormat";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

type TranscriptProps = {
  messages: ChatMessage[];
};

export function Transcript({ messages }: TranscriptProps): React.JSX.Element {
  const dateLabel = useMemo(() => {
    return formatDateDivider(new Date());
  }, []);

  return (
    <main className="transcript" aria-label="Conversation transcript">
      <div className="date-divider">
        <span />
        <time>{dateLabel}</time>
        <span />
      </div>
      {messages.length ? (
        messages.map((message) => <MessageBubble key={message.id} message={message} />)
      ) : (
        <section className="empty-state">
          <p>Start a conversation with your Papertrail.</p>
        </section>
      )}
    </main>
  );
}
