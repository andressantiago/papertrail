import path from "node:path";
import express from "express";
import multer from "multer";
import { config } from "./config.js";
import {
  FILE_UPLOAD_FIELD,
  FileStorageError,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  deleteStoredFile,
  listStoredFiles,
  saveUploadedFiles,
  type StoredFile,
} from "./fileStorage.js";
import { isOpenAIConfigured } from "./openai.js";
import { createConversation, respondToInput, streamConversationResponse } from "./openaiService.js";

type ErrorResponse = {
  error: string;
};

type OpenAIStatusResponse = {
  configured: boolean;
  model: string;
};

type OpenAIRespondRequestBody = {
  input?: unknown;
};

type OpenAIRespondResponse = {
  output: string;
};

type OpenAIConversationResponse = {
  conversationId: string;
  model: string;
};

type OpenAIStreamRequestBody = {
  input?: unknown;
};

type FilesResponse = {
  files: StoredFile[];
};

type OpenAIStream = Awaited<ReturnType<typeof streamConversationResponse>>;
type OpenAIStreamEvent = OpenAIStream extends AsyncIterable<infer Event> ? Event : never;

type StreamState = {
  completed: boolean;
  output: string;
  responseId?: string;
};

const app = express();
const clientDistPath = path.resolve(process.cwd(), "client", "dist");
const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILE_COUNT,
  },
});

app.use(express.json());

function writeNdjson(res: express.Response, payload: unknown): void {
  res.write(`${JSON.stringify(payload)}\n`);
}

function configureNdjsonStream(res: express.Response): void {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

function attachAbortOnClose(
  res: express.Response,
  abortController: AbortController,
  state: StreamState,
): void {
  res.on("close", () => {
    if (!state.completed && !res.writableEnded) {
      abortController.abort();
    }
  });
}

function readTrimmedInput(body: OpenAIStreamRequestBody): string {
  return typeof body.input === "string" ? body.input.trim() : "";
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getUploadedFiles(files: Express.Request["files"]): Express.Multer.File[] {
  return Array.isArray(files) ? files : [];
}

function readFileUpload(
  req: express.Request,
  res: express.Response,
): Promise<Express.Multer.File[]> {
  const uploadFiles = fileUpload.array(FILE_UPLOAD_FIELD, MAX_FILE_COUNT);

  return new Promise((resolve, reject) => {
    uploadFiles(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(getUploadedFiles(req.files));
    });
  });
}

function getMulterErrorMessage(error: multer.MulterError): string {
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return "Files must be 25 MB or smaller.";
    case "LIMIT_FILE_COUNT":
      return "Upload up to 10 files at a time.";
    default:
      return "Invalid file upload.";
  }
}

function getFileApiError(error: unknown): { statusCode: number; message: string } {
  if (error instanceof FileStorageError) {
    return { statusCode: error.statusCode, message: error.message };
  }

  if (error instanceof multer.MulterError) {
    return { statusCode: 400, message: getMulterErrorMessage(error) };
  }

  return { statusCode: 500, message: "File request failed." };
}

function writeOpenAIStreamEvent(
  res: express.Response,
  event: OpenAIStreamEvent,
  conversationId: string,
  state: StreamState,
): void {
  switch (event.type) {
    case "response.created":
      state.responseId = event.response.id;
      writeNdjson(res, { type: "metadata", conversationId, responseId: state.responseId });
      return;
    case "response.output_text.delta":
      state.output += event.delta;
      writeNdjson(res, { type: "delta", delta: event.delta });
      return;
    case "response.completed":
      state.output = event.response.output_text || state.output;
      state.completed = true;
      writeNdjson(res, { type: "done", output: state.output });
      return;
    case "response.failed":
      throw new Error(event.response.error?.message || "OpenAI response failed.");
    case "error":
      throw new Error(event.message);
  }
}

app.get<never, FilesResponse | ErrorResponse>("/api/files", async (req, res) => {
  try {
    return res.json({
      files: await listStoredFiles(config.uploads.directory),
    });
  } catch (error) {
    console.error("File listing failed:", error);
    return res.status(500).json({ error: "File listing failed." });
  }
});

app.post<never, FilesResponse | ErrorResponse>("/api/files", async (req, res) => {
  try {
    const files = await readFileUpload(req, res);

    return res.json({
      files: await saveUploadedFiles(config.uploads.directory, files),
    });
  } catch (error) {
    const apiError = getFileApiError(error);

    if (apiError.statusCode >= 500) {
      console.error("File upload failed:", error);
    }

    return res.status(apiError.statusCode).json({ error: apiError.message });
  }
});

app.delete<{ fileId: string }, FilesResponse | ErrorResponse>(
  "/api/files/:fileId",
  async (req, res) => {
    try {
      await deleteStoredFile(config.uploads.directory, req.params.fileId);

      return res.json({
        files: await listStoredFiles(config.uploads.directory),
      });
    } catch (error) {
      const apiError = getFileApiError(error);

      if (apiError.statusCode >= 500) {
        console.error("File delete failed:", error);
      }

      return res.status(apiError.statusCode).json({ error: apiError.message });
    }
  },
);

app.get<never, OpenAIStatusResponse>("/api/openai/status", (req, res) => {
  res.json({
    configured: isOpenAIConfigured(),
    model: config.openAI.model,
  });
});

app.post<never, OpenAIRespondResponse | ErrorResponse, OpenAIRespondRequestBody>(
  "/api/openai/respond",
  async (req, res) => {
    const { input } = req.body;

    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: "OpenAI is not configured." });
    }

    if (typeof input !== "string" || !input.trim()) {
      return res.status(400).json({ error: "Request body must include a non-empty input string." });
    }

    try {
      const output = await respondToInput(input.trim());
      return res.json({ output });
    } catch (error) {
      console.error("OpenAI request failed:", error);
      return res.status(500).json({ error: "OpenAI request failed." });
    }
  },
);

app.post<never, OpenAIConversationResponse | ErrorResponse>(
  "/api/openai/conversations",
  async (req, res) => {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: "OpenAI is not configured." });
    }

    try {
      const conversationId = await createConversation();

      return res.json({
        conversationId,
        model: config.openAI.model,
      });
    } catch (error) {
      console.error("OpenAI conversation creation failed:", error);
      return res.status(500).json({ error: "OpenAI conversation creation failed." });
    }
  },
);

app.post<{ conversationId: string }, ErrorResponse, OpenAIStreamRequestBody>(
  "/api/openai/conversations/:conversationId/stream",
  async (req, res) => {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: "OpenAI is not configured." });
    }

    const conversationId = req.params.conversationId.trim();
    const input = readTrimmedInput(req.body);

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required." });
    }

    if (!input) {
      return res.status(400).json({ error: "Request body must include a non-empty input string." });
    }

    const abortController = new AbortController();
    const streamState: StreamState = { completed: false, output: "" };

    attachAbortOnClose(res, abortController, streamState);

    try {
      const stream = await streamConversationResponse(conversationId, input, {
        signal: abortController.signal,
      });

      configureNdjsonStream(res);

      for await (const event of stream) {
        writeOpenAIStreamEvent(res, event, conversationId, streamState);
      }

      if (!streamState.completed) {
        streamState.completed = true;
        writeNdjson(res, {
          type: "done",
          output: streamState.output,
        });
      }

      return res.end();
    } catch (error) {
      if (abortController.signal.aborted) {
        return res.end();
      }

      console.error("OpenAI stream failed:", error);

      if (!res.headersSent) {
        return res.status(500).json({ error: "OpenAI stream failed." });
      }

      writeNdjson(res, {
        type: "error",
        error: getErrorMessage(error, "OpenAI stream failed."),
      });
      return res.end();
    }
  },
);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Hello from Express");
  });
}

app.listen(config.port, config.host, (error?: Error) => {
  if (error) {
    console.error("Server failed to start:", error);
    process.exitCode = 1;
    return;
  }

  console.log(`Server listening on http://${config.host}:${config.port}`);
});
