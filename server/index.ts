import path from "node:path";
import express from "express";
import { config } from "./config.js";
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

const app = express();
const clientDistPath = path.resolve(process.cwd(), "client", "dist");

app.use(express.json());

function writeNdjson(res: express.Response, payload: unknown): void {
  res.write(`${JSON.stringify(payload)}\n`);
}

app.get<never, OpenAIStatusResponse>("/api/openai/status", (req, res) => {
  res.json({
    configured: isOpenAIConfigured(),
    model: config.openAI.model,
  });
});

app.post<never, OpenAIRespondResponse | ErrorResponse, OpenAIRespondRequestBody>("/api/openai/respond", async (req, res) => {
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
});

app.post<never, OpenAIConversationResponse | ErrorResponse>("/api/openai/conversations", async (req, res) => {
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
});

app.post<{ conversationId: string }, ErrorResponse, OpenAIStreamRequestBody>(
  "/api/openai/conversations/:conversationId/stream",
  async (req, res) => {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: "OpenAI is not configured." });
    }

    const conversationId = req.params.conversationId.trim();
    const input = typeof req.body.input === "string" ? req.body.input.trim() : "";

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required." });
    }

    if (!input) {
      return res.status(400).json({ error: "Request body must include a non-empty input string." });
    }

    const abortController = new AbortController();
    let responseId: string | undefined;
    let output = "";
    let completed = false;

    res.on("close", () => {
      if (!completed && !res.writableEnded) {
        abortController.abort();
      }
    });

    try {
      const stream = await streamConversationResponse(conversationId, input, {
        signal: abortController.signal,
      });

      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      for await (const event of stream) {
        if (event.type === "response.created") {
          responseId = event.response.id;
          writeNdjson(res, {
            type: "metadata",
            conversationId,
            responseId,
          });
          continue;
        }

        if (event.type === "response.output_text.delta") {
          output += event.delta;
          writeNdjson(res, {
            type: "delta",
            delta: event.delta,
          });
          continue;
        }

        if (event.type === "response.completed") {
          output = event.response.output_text || output;
          completed = true;
          writeNdjson(res, {
            type: "done",
            output,
          });
          continue;
        }

        if (event.type === "response.failed") {
          const message = event.response.error?.message || "OpenAI response failed.";
          throw new Error(message);
        }

        if (event.type === "error") {
          throw new Error(event.message);
        }
      }

      if (!completed) {
        completed = true;
        writeNdjson(res, {
          type: "done",
          output,
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
        error: error instanceof Error ? error.message : "OpenAI stream failed.",
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
