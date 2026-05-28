import OpenAI from "openai";
import { config } from "./config.js";
let client;
export function isOpenAIConfigured() {
    return config.openAI.configured;
}
export function getOpenAIClient() {
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
