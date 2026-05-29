import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { useFiles } from "../hooks/useFiles";
import { useTheme } from "../hooks/useTheme";
import type { WorkspaceView } from "../types";
import { Composer } from "./Composer";
import { FileExplorer } from "./FileExplorer";
import { TopBar } from "./TopBar";
import { Transcript } from "./Transcript";

const BOTTOM_FOLLOW_THRESHOLD_PX = 80;

function isNearScrollBottom(element: HTMLDivElement): boolean {
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_FOLLOW_THRESHOLD_PX
  );
}

export function App(): React.JSX.Element {
  const [workspace, setWorkspace] = useState<WorkspaceView>("files");
  const chat = useChat();
  const files = useFiles();
  const { themeLabel, toggleTheme } = useTheme();
  const apiReady = chat.status.configured && !chat.statusLoading;
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldFollowBottomRef = useRef(true);

  const updateBottomFollow = useCallback(() => {
    const chatScroll = chatScrollRef.current;

    if (chatScroll) {
      shouldFollowBottomRef.current = isNearScrollBottom(chatScroll);
    }
  }, []);

  useLayoutEffect(() => {
    const chatScroll = chatScrollRef.current;

    if (chatScroll && shouldFollowBottomRef.current) {
      chatScroll.scrollTop = chatScroll.scrollHeight;
    }
  }, [chat.messages]);

  return (
    <div className="app-shell">
      <TopBar
        activeWorkspace={workspace}
        apiReady={apiReady}
        statusLabel={chat.statusLabel}
        newChatDisabled={chat.streaming && !chat.messages.length}
        onWorkspaceChange={setWorkspace}
        onNewChat={chat.startNewChat}
        themeLabel={themeLabel}
        onThemeToggle={toggleTheme}
      />
      {workspace === "chat" ? (
        <>
          <div ref={chatScrollRef} className="chat-scroll" onScroll={updateBottomFollow}>
            <Transcript messages={chat.messages} />
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
        </>
      ) : (
        <div className="files-scroll">
          <FileExplorer
            files={files.files}
            loading={files.loading}
            uploading={files.uploading}
            error={files.error}
            onRefresh={() => {
              void files.refreshFiles();
            }}
            onUploadFiles={(fileList) => {
              void files.uploadFiles(fileList);
            }}
          />
        </div>
      )}
    </div>
  );
}
