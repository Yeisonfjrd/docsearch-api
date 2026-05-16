import { describe, expect, it } from "vitest";
import { createAiProvider } from "../../src/infrastructure/ai/factory.js";
import type { Config } from "../../src/infrastructure/config.js";

const baseConfig: Config = {
  NODE_ENV: "test",
  PORT: 3000,
  HOST: "0.0.0.0",
  LOG_LEVEL: "fatal",
  JWT_SECRET: "change-me-at-least-32-chars-long!!",
  JWT_EXPIRES_IN: "7d",
  DATABASE_URL: "postgresql://docsearch:docsearch@localhost:5432/docsearch",
  REDIS_URL: "redis://localhost:6379",
  AI_PROVIDER: "ollama",
  OLLAMA_BASE_URL: "http://localhost:11434",
  OLLAMA_EMBEDDING_MODEL: "nomic-embed-text",
  OLLAMA_CHAT_MODEL: "llama3.1",
  OLLAMA_EMBEDDING_DIMENSIONS: 768,
  OPENAI_API_KEY: undefined,
  OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
  OPENAI_CHAT_MODEL: "gpt-4o-mini",
  OPENAI_EMBEDDING_DIMENSIONS: 768,
  STORAGE_TYPE: "local",
  STORAGE_LOCAL_PATH: "./uploads",
  MAX_FILE_SIZE_MB: 20,
  ALLOWED_MIME_TYPES: ["application/pdf", "text/plain"],
  RATE_LIMIT_UPLOAD_PER_MINUTE: 10,
  RATE_LIMIT_QUERY_PER_MINUTE: 30,
  RAG_TOP_K: 5,
  RAG_SIMILARITY_THRESHOLD: 0.75,
  RAG_MAX_CONTEXT_TOKENS: 3000,
  OTEL_SERVICE_NAME: "docsearch",
  OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
};

describe("createAiProvider", () => {
  it("usa Ollama sin credenciales externas", () => {
    const provider = createAiProvider(baseConfig);

    expect(provider.name).toBe("ollama");
    expect(provider.embeddingModel).toBe("nomic-embed-text");
    expect(provider.embeddingDimensions).toBe(768);
  });

  it("requiere OPENAI_API_KEY solo cuando AI_PROVIDER=openai", () => {
    expect(() =>
      createAiProvider({
        ...baseConfig,
        AI_PROVIDER: "openai",
      })
    ).toThrow("OPENAI_API_KEY");
  });
});
