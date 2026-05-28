import "dotenv/config";

const openAIApiKeyPlaceholder = "your_openai_api_key_here";

type OpenAIConfig = {
  apiKey?: string;
  configured: boolean;
  model: string;
};

type AppConfig = {
  host: string;
  port: number;
  openAI: OpenAIConfig;
};

function parsePort(value: string | undefined): number {
  const rawPort = value || "3000";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535. Received: ${rawPort}`);
  }

  return port;
}

function readOpenAIConfig(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  const configured = Boolean(apiKey && apiKey !== openAIApiKeyPlaceholder);

  return {
    apiKey: configured ? apiKey : undefined,
    configured,
    model: process.env.OPENAI_MODEL || "gpt-5.5",
  };
}

export const config: AppConfig = {
  host: process.env.HOST || "127.0.0.1",
  port: parsePort(process.env.PORT),
  openAI: readOpenAIConfig(),
};
