import type { Config } from "../config.js";
import { getConfig } from "../config.js";
import type { AiProvider } from "./types.js";
import { OllamaProvider } from "./ollama-provider.js";
import { OpenAiProvider } from "./openai-provider.js";

export function createAiProvider(config: Config = getConfig()): AiProvider {
  if (config.AI_PROVIDER === "openai") {
    return new OpenAiProvider({
      apiKey: config.OPENAI_API_KEY,
      embeddingModel: config.OPENAI_EMBEDDING_MODEL,
      embeddingDimensions: config.OPENAI_EMBEDDING_DIMENSIONS,
      chatModel: config.OPENAI_CHAT_MODEL,
    });
  }

  return new OllamaProvider({
    baseUrl: config.OLLAMA_BASE_URL,
    embeddingModel: config.OLLAMA_EMBEDDING_MODEL,
    embeddingDimensions: config.OLLAMA_EMBEDDING_DIMENSIONS,
    chatModel: config.OLLAMA_CHAT_MODEL,
  });
}

export type { AiProvider, AiProviderStatus, ChatMessage, GeneratedAnswer } from "./types.js";
