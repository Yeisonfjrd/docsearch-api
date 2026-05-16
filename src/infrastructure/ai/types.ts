export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GeneratedAnswer {
  content: string;
  model: string;
  latencyMs: number;
}

export interface AiProviderStatus {
  provider: string;
  embeddingModel: string;
  embeddingDimensions: number;
  chatModel: string;
  available: boolean;
  error?: string;
}

export interface AiProvider {
  readonly name: string;
  readonly embeddingModel: string;
  readonly embeddingDimensions: number;
  readonly chatModel: string;

  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  generateAnswer(
    systemPrompt: string,
    context: string,
    messages: ChatMessage[]
  ): Promise<GeneratedAnswer>;
  getStatus(): Promise<AiProviderStatus>;
}
