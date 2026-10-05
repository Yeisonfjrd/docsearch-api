import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AnswerQuestionUseCase,
  ConversationNotFoundError,
} from "../../src/application/use-cases/answer-question.js";

vi.mock("../../src/infrastructure/config.js", () => ({
  getConfig: () => ({ RAG_TOP_K: 5, RAG_SIMILARITY_THRESHOLD: 0.5 }),
}));

const doc = (id: string, userId: string) => ({ id, userId }) as never;

describe("AnswerQuestionUseCase scoping", () => {
  const chunks = { findSimilar: vi.fn().mockResolvedValue([]) };
  const documents = {
    findByUserId: vi.fn().mockResolvedValue([doc("mine-1", "alice"), doc("mine-2", "alice")]),
  };
  const conversations = {
    findById: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: "conv-new" }),
  };
  const messages = {
    create: vi.fn().mockResolvedValue({ id: "msg-1", content: "sin contexto" }),
    findByConversationId: vi.fn().mockResolvedValue([]),
  };
  const ai = { generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]), generateAnswer: vi.fn() };

  const useCase = new AnswerQuestionUseCase(
    chunks as never,
    documents as never,
    conversations as never,
    messages as never,
    { createMany: vi.fn() } as never,
    { log: vi.fn() } as never,
    ai
  );

  beforeEach(() => vi.clearAllMocks());

  it("searches only the caller's documents when none are specified", async () => {
    await useCase.execute({ userId: "alice", question: "¿qué dice?" });
    expect(chunks.findSimilar).toHaveBeenCalledWith([0.1, 0.2], 5, 0.5, ["mine-1", "mine-2"]);
  });

  it("drops document ids that belong to someone else", async () => {
    await useCase.execute({ userId: "alice", question: "¿qué dice?", documentIds: ["mine-2", "bobs-doc"] });
    expect(chunks.findSimilar).toHaveBeenCalledWith([0.1, 0.2], 5, 0.5, ["mine-2"]);
  });

  it("does not search at all when every requested id is foreign", async () => {
    const result = await useCase.execute({ userId: "alice", question: "¿qué dice?", documentIds: ["bobs-doc"] });
    expect(chunks.findSimilar).not.toHaveBeenCalled();
    expect(result.citations).toEqual([]);
  });

  it("rejects a conversation owned by another user", async () => {
    conversations.findById.mockResolvedValueOnce({ id: "conv-bob", userId: "bob" });
    await expect(
      useCase.execute({ userId: "alice", question: "hola", conversationId: "conv-bob" })
    ).rejects.toBeInstanceOf(ConversationNotFoundError);
    expect(messages.create).not.toHaveBeenCalled();
  });
});
