import { useMemo } from "react";
import { formatDateDivider } from "../lib/dateFormat";
import type { ChatMessage } from "../types";
import { BotIcon } from "./icons/BotIcon";
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
          <div className="empty-state-icon" aria-hidden="true">
            <BotIcon />
          </div>
          <h1>Ask the API anything.</h1>
          <p>Start a conversation and follow up without repeating context.</p>
        </section>
      )}
    </main>
  );
}
