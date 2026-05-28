import { config } from "./config.js";
import { getOpenAIClient } from "./openai.js";
export async function respondToInput(input) {
    const response = await getOpenAIClient().responses.create({
        model: config.openAI.model,
        input,
    });
    return response.output_text;
}
