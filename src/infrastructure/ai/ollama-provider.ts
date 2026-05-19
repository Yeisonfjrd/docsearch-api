import type { AiProvider, AiProviderStatus, ChatMessage, GeneratedAnswer } from "./types.js";

export interface OllamaProviderOptions {
  baseUrl: string;
  embeddingModel: string;
  embeddingDimensions: number;
  chatModel: string;
}

interface OllamaEmbedResponse {
  embeddings?: number[][];
  embedding?: number[];
}

interface OllamaChatResponse {
  model?: string;
  message?: {
    content?: string;
  };
}

export class OllamaProvider implements AiProvider {
  readonly name = "ollama";
  readonly embeddingModel: string;
  readonly embeddingDimensions: number;
  readonly chatModel: string;

  private readonly baseUrl: string;

  constructor(options: OllamaProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.embeddingModel = options.embeddingModel;
    this.embeddingDimensions = options.embeddingDimensions;
    this.chatModel = options.chatModel;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await this.generateEmbeddings([text]);
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.postJson<OllamaEmbedResponse>("/api/embed", {
      model: this.embeddingModel,
      input: texts,
    });

    const embeddings = response.embeddings ?? (response.embedding ? [response.embedding] : undefined);
    if (!embeddings || embeddings.length !== texts.length) {
      throw new Error("Ollama no devolvió embeddings para todos los textos solicitados");
    }

    for (const embedding of embeddings) {
      if (embedding.length !== this.embeddingDimensions) {
        throw new Error(
          `Dimensión de embedding inválida: se esperaban ${this.embeddingDimensions}, se recibieron ${embedding.length}`
        );
      }
    }

    return embeddings;
  }

  async generateAnswer(
    systemPrompt: string,
    context: string,
    messages: ChatMessage[]
  ): Promise<GeneratedAnswer> {
    const start = Date.now();
    const response = await this.postJson<OllamaChatResponse>("/api/chat", {
      model: this.chatModel,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: `Contexto de documentos:\n${context}` },
        ...messages,
      ],
      options: {
        temperature: 0.2,
      },
    });

    return {
      content: response.message?.content ?? "",
      model: response.model ?? this.chatModel,
      latencyMs: Date.now() - start,
    };
  }

  async getStatus(): Promise<AiProviderStatus> {
    try {
      await this.fetchWithTimeout(`${this.baseUrl}/api/tags`, { method: "GET" });
      return {
        provider: this.name,
        embeddingModel: this.embeddingModel,
        embeddingDimensions: this.embeddingDimensions,
        chatModel: this.chatModel,
        available: true,
      };
    } catch (err) {
      return {
        provider: this.name,
        embeddingModel: this.embeddingModel,
        embeddingDimensions: this.embeddingDimensions,
        chatModel: this.chatModel,
        available: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    return response.json() as Promise<T>;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Ollama respondió ${response.status}`);
      }
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
