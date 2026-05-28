import { useEffect, useRef } from "react";
import { useChat } from "../hooks/useChat";
import { Composer } from "./Composer";
import { TopBar } from "./TopBar";
import { Transcript } from "./Transcript";

export function App(): React.JSX.Element {
  const chat = useChat();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [chat.messages]);

  return (
    <div className="app-shell">
      <TopBar
        status={chat.status}
        statusLabel={chat.statusLabel}
        statusLoading={chat.statusLoading}
        newChatDisabled={chat.streaming && !chat.messages.length}
        onNewChat={chat.startNewChat}
      />
      <div className="chat-scroll">
        <Transcript messages={chat.messages} />
        <div ref={scrollRef} />
      </div>
      <footer className="composer-wrap">
        <Composer
          value={chat.input}
          disabled={chat.disabled}
          busy={chat.streaming}
          error={chat.error}
          onChange={chat.setInput}
          onSubmit={() => {
            void chat.submitMessage();
          }}
        />
      </footer>
    </div>
  );
}
