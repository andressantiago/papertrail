import type express from "express";
import { setActiveConversationId } from "../dataStore.js";
import type { PapertrailDatabase } from "../database.js";
import { isOpenAIConfigured } from "../openai.js";
import {
  attachAbortOnClose,
  getStreamErrorMessage,
  readStreamRequest,
  sendOpenAIStream,
  updateAssistantFailure,
  type OpenAIStreamRequestBody,
  type StreamState,
} from "../openaiStream.js";
import { createConversation, respondToInput } from "../openaiService.js";

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

function registerOpenAIStatusRoute(app: express.Express, openAIModel: string): void {
  app.get<never, OpenAIStatusResponse>("/api/openai/status", (_req, res) => {
    res.json({
      configured: isOpenAIConfigured(),
      model: openAIModel,
    });
  });
}

function registerOpenAIRespondRoute(app: express.Express): void {
  app.post<never, OpenAIRespondResponse | ErrorResponse, OpenAIRespondRequestBody>(
    "/api/openai/respond",
    async (req, res) => {
      const { input } = req.body;

      if (!isOpenAIConfigured()) {
        return res.status(503).json({ error: "OpenAI is not configured." });
      }

      if (typeof input !== "string" || !input.trim()) {
        return res
          .status(400)
          .json({ error: "Request body must include a non-empty input string." });
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
}

function registerOpenAIConversationRoute(
  app: express.Express,
  database: PapertrailDatabase,
  openAIModel: string,
): void {
  app.post<never, OpenAIConversationResponse | ErrorResponse>(
    "/api/openai/conversations",
    async (_req, res) => {
      if (!isOpenAIConfigured()) {
        return res.status(503).json({ error: "OpenAI is not configured." });
      }

      try {
        const conversationId = await createConversation();
        setActiveConversationId(database, conversationId);

        return res.json({
          conversationId,
          model: openAIModel,
        });
      } catch (error) {
        console.error("OpenAI conversation creation failed:", error);
        return res.status(500).json({ error: "OpenAI conversation creation failed." });
      }
    },
  );
}

function registerOpenAIStreamRoute(app: express.Express, database: PapertrailDatabase): void {
  app.post<{ conversationId: string }, ErrorResponse, OpenAIStreamRequestBody>(
    "/api/openai/conversations/:conversationId/stream",
    async (req, res) => {
      if (!isOpenAIConfigured()) {
        return res.status(503).json({ error: "OpenAI is not configured." });
      }

      const conversationId = req.params.conversationId.trim();
      const request = readStreamRequest(req.body);

      if (!conversationId) {
        return res.status(400).json({ error: "Conversation ID is required." });
      }

      if (!request) {
        return res.status(400).json({
          error: "Request body must include input, userMessageId, and assistantMessageId.",
        });
      }

      const abortController = new AbortController();
      const streamState: StreamState = { completed: false, output: "" };

      attachAbortOnClose(res, abortController, streamState);

      try {
        await sendOpenAIStream({
          abortController,
          conversationId,
          database,
          request,
          res,
          state: streamState,
        });
        return;
      } catch (error) {
        const message = getStreamErrorMessage(error, "OpenAI stream failed.");

        updateAssistantFailure(
          database,
          request.assistantMessageId,
          streamState,
          abortController.signal.aborted ? "Request cancelled." : message,
        );

        if (abortController.signal.aborted) {
          return res.end();
        }

        console.error("OpenAI stream failed:", error);

        if (!res.headersSent) {
          return res.status(500).json({ error: "OpenAI stream failed." });
        }

        res.write(`${JSON.stringify({ type: "error", error: message })}\n`);
        return res.end();
      }
    },
  );
}

export function registerOpenAIRoutes(
  app: express.Express,
  database: PapertrailDatabase,
  openAIModel: string,
): void {
  registerOpenAIStatusRoute(app, openAIModel);
  registerOpenAIRespondRoute(app);
  registerOpenAIConversationRoute(app, database, openAIModel);
  registerOpenAIStreamRoute(app, database);
}
