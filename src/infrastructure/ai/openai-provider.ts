import OpenAI from "openai";
import type { AiProvider, AiProviderStatus, ChatMessage, GeneratedAnswer } from "./types.js";

export interface OpenAiProviderOptions {
  apiKey?: string;
  embeddingModel: string;
  embeddingDimensions: number;
  chatModel: string;
}

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  readonly embeddingModel: string;
  readonly embeddingDimensions: number;
  readonly chatModel: string;

  private readonly client: OpenAI;

  constructor(options: OpenAiProviderOptions) {
    if (!options.apiKey) {
      throw new Error("OPENAI_API_KEY es requerida cuando AI_PROVIDER=openai");
    }

    this.embeddingModel = options.embeddingModel;
    this.embeddingDimensions = options.embeddingDimensions;
    this.chatModel = options.chatModel;
    this.client = new OpenAI({ apiKey: options.apiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await this.generateEmbeddings([text]);
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: texts,
      dimensions: this.embeddingDimensions,
    });

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  async generateAnswer(
    systemPrompt: string,
    context: string,
    messages: ChatMessage[]
  ): Promise<GeneratedAnswer> {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: `Contexto de documentos:\n${context}` },
        ...messages,
      ],
      temperature: 0.2,
    });

    return {
      content: response.choices[0].message.content ?? "",
      model: response.model,
      latencyMs: Date.now() - start,
    };
  }

  async getStatus(): Promise<AiProviderStatus> {
    return {
      provider: this.name,
      embeddingModel: this.embeddingModel,
      embeddingDimensions: this.embeddingDimensions,
      chatModel: this.chatModel,
      available: true,
    };
  }
}
