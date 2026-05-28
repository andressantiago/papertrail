import OpenAI from "openai";
import { config } from "./config.js";

let client: OpenAI | undefined;

export function isOpenAIConfigured(): boolean {
  return config.openAI.configured;
}

export function getOpenAIClient(): OpenAI {
  const { apiKey } = config.openAI;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured in .env");
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
    });
  }

  return client;
}
