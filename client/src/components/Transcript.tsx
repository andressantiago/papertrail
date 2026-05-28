import { useMemo } from "react";
import type { ChatMessage } from "../types";
import { BotIcon } from "./icons/BotIcon";
import { MessageBubble } from "./MessageBubble";

type TranscriptProps = {
  messages: ChatMessage[];
};

export function Transcript({ messages }: TranscriptProps): React.JSX.Element {
  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
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
          <div className="bot-avatar is-large" aria-hidden="true">
            <BotIcon />
          </div>
          <h1>Ask the API anything.</h1>
          <p>Start a conversation and follow up without repeating context.</p>
        </section>
      )}
    </main>
  );
}
