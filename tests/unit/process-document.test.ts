import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProcessDocumentUseCase } from "../../src/application/use-cases/process-document.js";

// ─── Mock infrastructure ──────────────────────────────────────────────────────

vi.mock("../../src/infrastructure/parsers/document-parser.js", () => ({
  parseDocument: vi.fn().mockResolvedValue({
    text: "Hello world. This is a test.",
    pageCount: 1,
    pages: [{ pageNumber: 1, content: "Hello world. This is a test." }],
  }),
  chunkPages: vi.fn().mockReturnValue([
    {
      documentId: "doc-1",
      pageNumber: 1,
      chunkIndex: 0,
      content: "Hello world.",
      tokenCount: 2,
      startOffset: 0,
      endOffset: 12,
    },
  ]),
}));

vi.mock("../../src/infrastructure/ai/openai.js", () => ({
  generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProcessDocumentUseCase", () => {
  const mockDoc = {
    id: "doc-1",
    userId: "user-1",
    filename: "test.pdf",
    mimeType: "application/pdf",
    checksum: "abc123",
    sizeBytes: 1000,
    status: "UPLOADED" as const,
    sourcePath: "/tmp/test.pdf",
    createdAt: new Date(),
  };

  const mockJob = {
    id: "job-1",
    documentId: "doc-1",
    status: "PENDING" as const,
    retries: 0,
    createdAt: new Date(),
  };

  const documentRepo = {
    findById: vi.fn().mockResolvedValue(mockDoc),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn(),
    findByChecksum: vi.fn(),
    create: vi.fn(),
  };

  const chunkRepo = {
    createMany: vi.fn().mockResolvedValue(undefined),
    findSimilar: vi.fn(),
    deleteByDocumentId: vi.fn(),
  };

  const jobRepo = {
    findByDocumentId: vi.fn().mockResolvedValue(mockJob),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
  };

  const auditRepo = {
    log: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => vi.clearAllMocks());

  it("procesa un documento exitosamente", async () => {
    const useCase = new ProcessDocumentUseCase(documentRepo, chunkRepo, jobRepo, auditRepo);
    await useCase.execute({ documentId: "doc-1" });

    expect(documentRepo.updateStatus).toHaveBeenCalledWith("doc-1", "PARSING");
    expect(documentRepo.updateStatus).toHaveBeenCalledWith("doc-1", "INDEXING", expect.any(Object));
    expect(documentRepo.updateStatus).toHaveBeenCalledWith("doc-1", "READY", expect.any(Object));
    expect(chunkRepo.createMany).toHaveBeenCalledOnce();
    expect(auditRepo.log).toHaveBeenCalledWith(expect.objectContaining({ action: "DOCUMENT_PROCESSED" }));
  });

  it("marca como FAILED cuando el documento no existe", async () => {
    documentRepo.findById.mockResolvedValueOnce(null);
    const useCase = new ProcessDocumentUseCase(documentRepo, chunkRepo, jobRepo, auditRepo);

    await expect(useCase.execute({ documentId: "doc-1" })).rejects.toThrow("Documento no encontrado");
  });

  it("marca como FAILED y registra auditoría en error de parseo", async () => {
    const { parseDocument } = await import("../../src/infrastructure/parsers/document-parser.js");
    vi.mocked(parseDocument).mockRejectedValueOnce(new Error("PDF corrupto"));

    const useCase = new ProcessDocumentUseCase(documentRepo, chunkRepo, jobRepo, auditRepo);
    await expect(useCase.execute({ documentId: "doc-1" })).rejects.toThrow("PDF corrupto");

    expect(documentRepo.updateStatus).toHaveBeenCalledWith("doc-1", "FAILED", { errorMessage: "PDF corrupto" });
    expect(auditRepo.log).toHaveBeenCalledWith(expect.objectContaining({ action: "DOCUMENT_PROCESS_FAILED" }));
  });
});
