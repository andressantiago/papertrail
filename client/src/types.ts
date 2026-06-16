import type { AcceptedFileExtension } from "@shared/fileUpload";

export type ApiStatus = {
  configured: boolean;
  model: string;
};

export type MessageRole = "user" | "assistant";

export type ThemeMode = "light" | "dark";

export type WorkspaceView = "files" | "chat";

export type FileExtension = AcceptedFileExtension;

export type OpenAIUploadStatus = "pending" | "uploading" | "uploaded" | "failed" | "not_configured";

export type StoredFile = {
  id: string;
  name: string;
  extension: FileExtension;
  size: number;
  uploadedAt: string;
  openaiFileId?: string;
  openaiUploadStatus?: OpenAIUploadStatus;
  openaiUploadError?: string;
  openaiUploadedAt?: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status: "streaming" | "complete" | "error";
  error?: string;
  responseId?: string;
};

export type StreamEvent =
  | { type: "metadata"; conversationId: string; responseId: string }
  | { type: "delta"; delta: string }
  | { type: "done"; output: string }
  | { type: "error"; error: string };
