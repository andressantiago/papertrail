import { useMemo } from "react";
import { MessageBubble } from "@client/components/MessageBubble";
import { formatDateDivider } from "@client/lib/dateFormat";
import type { ChatMessage } from "@client/types";

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
