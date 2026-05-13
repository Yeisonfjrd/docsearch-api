import type {
  IChunkRepository,
  IConversationRepository,
  IMessageRepository,
  ICitationRepository,
  IAuditRepository,
} from "../../domain/repositories.js";
import { generateEmbedding, generateAnswer } from "../../infrastructure/ai/openai.js";
import { getConfig } from "../../infrastructure/config.js";

export interface AnswerQuestionInput {
  userId: string;
  conversationId?: string;
  question: string;
  documentIds?: string[]; // filter by specific docs, or search all
  ip?: string;
}

export interface AnswerQuestionOutput {
  conversationId: string;
  messageId: string;
  answer: string;
  citations: AnswerCitation[];
  model: string;
  latencyMs: number;
}

export interface AnswerCitation {
  documentId: string;
  chunkId: string;
  pageNumber: number;
  paragraphRef?: string;
  similarityScore: number;
  excerpt: string;
}

const SYSTEM_PROMPT = `Sos un asistente de análisis de documentos técnicos.
Tu trabajo es responder preguntas usando exclusivamente el contexto provisto.
Si la respuesta no está en el contexto, decí claramente que no encontraste información al respecto.
No inventes datos, no uses conocimiento externo al contexto.
Siempre citá la fuente (página y fragmento) al final de cada afirmación importante.`;

export class AnswerQuestionUseCase {
  constructor(
    private readonly chunks: IChunkRepository,
    private readonly conversations: IConversationRepository,
    private readonly messages: IMessageRepository,
    private readonly citations: ICitationRepository,
    private readonly audit: IAuditRepository
  ) {}

  async execute(input: AnswerQuestionInput): Promise<AnswerQuestionOutput> {
    const config = getConfig();

    // ── 1. Ensure conversation ───────────────────────────────────────────────
    let conversationId = input.conversationId;
    if (!conversationId) {
      const conv = await this.conversations.create({
        userId: input.userId,
        title: input.question.slice(0, 60),
      });
      conversationId = conv.id;
    }

    // ── 2. Save user message ─────────────────────────────────────────────────
    await this.messages.create({
      conversationId,
      role: "user",
      content: input.question,
      queryStatus: "QUEUED",
    });

    // ── 3. Embed question ────────────────────────────────────────────────────
    const queryEmbedding = await generateEmbedding(input.question);

    // ── 4. Retrieve relevant chunks ──────────────────────────────────────────
    const similarChunks = await this.chunks.findSimilar(
      queryEmbedding,
      config.RAG_TOP_K,
      config.RAG_SIMILARITY_THRESHOLD,
      input.documentIds
    );

    if (similarChunks.length === 0) {
      const noContextMsg = await this.messages.create({
        conversationId,
        role: "assistant",
        content: "No encontré información relevante en los documentos disponibles para responder tu pregunta.",
        queryStatus: "ANSWERED",
      });

      return {
        conversationId,
        messageId: noContextMsg.id,
        answer: noContextMsg.content,
        citations: [],
        model: "none",
        latencyMs: 0,
      };
    }

    // ── 5. Build context string ──────────────────────────────────────────────
    const context = similarChunks
      .map(
        (c, i) =>
          `[Fuente ${i + 1} | Documento: ${c.documentId} | Página: ${c.pageNumber}]\n${c.content}`
      )
      .join("\n\n---\n\n");

    // ── 6. Get conversation history ──────────────────────────────────────────
    const history = await this.messages.findByConversationId(conversationId);
    const chatHistory = history.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // ── 7. Generate answer ───────────────────────────────────────────────────
    const { content, model, latencyMs } = await generateAnswer(
      SYSTEM_PROMPT,
      context,
      chatHistory
    );

    // ── 8. Save assistant message ────────────────────────────────────────────
    const assistantMsg = await this.messages.create({
      conversationId,
      role: "assistant",
      content,
      model,
      latencyMs,
      queryStatus: "ANSWERED",
    });

    // ── 9. Save citations ────────────────────────────────────────────────────
    const citationData = similarChunks.map((c) => ({
      messageId: assistantMsg.id,
      documentId: c.documentId,
      chunkId: c.id,
      pageNumber: c.pageNumber,
      similarityScore: c.similarity,
    }));
    await this.citations.createMany(citationData);

    // ── 10. Audit ────────────────────────────────────────────────────────────
    await this.audit.log({
      userId: input.userId,
      action: "QUESTION_ANSWERED",
      entityType: "conversation",
      entityId: conversationId,
      ip: input.ip,
      metadataJson: {
        chunksRetrieved: similarChunks.length,
        model,
        latencyMs,
      },
    });

    const outputCitations: AnswerCitation[] = similarChunks.map((c) => ({
      documentId: c.documentId,
      chunkId: c.id,
      pageNumber: c.pageNumber,
      similarityScore: c.similarity,
      excerpt: c.content.slice(0, 200),
    }));

    return {
      conversationId,
      messageId: assistantMsg.id,
      answer: content,
      citations: outputCitations,
      model,
      latencyMs,
    };
  }
}
