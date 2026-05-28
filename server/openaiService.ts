import { config } from "./config.js";
import { getOpenAIClient } from "./openai.js";

type StreamOptions = {
  signal?: AbortSignal;
};

export async function respondToInput(input: string): Promise<string> {
  const response = await getOpenAIClient().responses.create({
    model: config.openAI.model,
    input,
  });

  return response.output_text;
}

export async function createConversation(): Promise<string> {
  const conversation = await getOpenAIClient().conversations.create();

  return conversation.id;
}

export async function streamConversationResponse(conversationId: string, input: string, options: StreamOptions = {}) {
  return getOpenAIClient().responses.create(
    {
      model: config.openAI.model,
      conversation: conversationId,
      input,
      stream: true,
    },
    {
      signal: options.signal,
    },
  );
}
