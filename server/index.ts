import express from "express";
import { config } from "./config.js";
import { isOpenAIConfigured } from "./openai.js";
import { respondToInput } from "./openaiService.js";

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

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Express");
});

app.get<never, OpenAIStatusResponse>("/api/openai/status", (req, res) => {
  res.json({
    configured: isOpenAIConfigured(),
    model: config.openAI.model,
  });
});

app.post<never, OpenAIRespondResponse | ErrorResponse, OpenAIRespondRequestBody>("/api/openai/respond", async (req, res) => {
  const { input } = req.body;

  if (!input || typeof input !== "string") {
    return res.status(400).json({ error: "Request body must include an input string." });
  }

  try {
    const output = await respondToInput(input);
    return res.json({ output });
  } catch (error) {
    console.error("OpenAI request failed:", error);
    return res.status(500).json({ error: "OpenAI request failed." });
  }
});

app.listen(config.port, config.host, (error?: Error) => {
  if (error) {
    console.error("Server failed to start:", error);
    process.exitCode = 1;
    return;
  }

  console.log(`Server listening on http://${config.host}:${config.port}`);
});
