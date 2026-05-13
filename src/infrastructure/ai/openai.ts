import OpenAI from "openai";
import { getConfig } from "../config.js";

let _client: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  if (_client) return _client;
  const { OPENAI_API_KEY } = getConfig();
  _client = new OpenAI({ apiKey: OPENAI_API_KEY });
  return _client;
}

// ─── Embeddings ──────────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const { OPENAI_EMBEDDING_MODEL, OPENAI_EMBEDDING_DIMENSIONS } = getConfig();
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: text,
    dimensions: OPENAI_EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { OPENAI_EMBEDDING_MODEL, OPENAI_EMBEDDING_DIMENSIONS } = getConfig();
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: texts,
    dimensions: OPENAI_EMBEDDING_DIMENSIONS,
  });

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// ─── Chat Completion ──────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateAnswer(
  systemPrompt: string,
  context: string,
  messages: ChatMessage[]
): Promise<{ content: string; model: string; latencyMs: number }> {
  const { OPENAI_CHAT_MODEL } = getConfig();
  const client = getOpenAIClient();

  const start = Date.now();

  const response = await client.chat.completions.create({
    model: OPENAI_CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Contexto de documentos:\n${context}` },
      ...messages,
    ],
    temperature: 0.2,
  });

  const latencyMs = Date.now() - start;
  const content = response.choices[0].message.content ?? "";

  return { content, model: response.model, latencyMs };
}
