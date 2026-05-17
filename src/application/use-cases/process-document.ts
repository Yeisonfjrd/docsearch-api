import type {
  IDocumentRepository,
  IChunkRepository,
  IIngestionJobRepository,
  IAuditRepository,
} from "../../domain/repositories.js";
import { parseDocument, chunkDocument } from "../../infrastructure/parsers/document-parser.js";
import type { AiProvider } from "../../infrastructure/ai/factory.js";

export interface ProcessDocumentInput {
  documentId: string;
}

const EMBED_BATCH_SIZE = 20;

export class ProcessDocumentUseCase {
  constructor(
    private readonly documents: IDocumentRepository,
    private readonly chunks: IChunkRepository,
    private readonly jobs: IIngestionJobRepository,
    private readonly audit: IAuditRepository,
    private readonly aiProvider: Pick<AiProvider, "generateEmbeddings">
  ) {}

  async execute({ documentId }: ProcessDocumentInput): Promise<void> {
    const document = await this.documents.findById(documentId);
    if (!document) throw new Error(`Documento no encontrado: ${documentId}`);

    const job = await this.jobs.findByDocumentId(documentId);
    if (!job) throw new Error(`Job de ingesta no encontrado para: ${documentId}`);

    try {
      await this.documents.updateStatus(documentId, "PARSING");
      await this.jobs.updateStatus(job.id, "RUNNING", { startedAt: new Date() });

      const parsed = await parseDocument(document.sourcePath, document.mimeType);

      await this.documents.updateStatus(documentId, "INDEXING", {
        pageCount: parsed.pageCount,
      });

      const rawChunks = chunkDocument(documentId, parsed);

      if (rawChunks.length === 0) {
        throw new Error("El documento no produjo chunks (¿está vacío o corrupto?)");
      }

      const chunksWithEmbeddings = await this.embedInBatches(rawChunks);

      await this.chunks.replaceByDocumentId(documentId, chunksWithEmbeddings);

      await this.documents.updateStatus(documentId, "READY", {
        processedAt: new Date(),
        pageCount: parsed.pageCount,
      });
      await this.jobs.updateStatus(job.id, "COMPLETED", { finishedAt: new Date() });

      await this.audit.log({
        action: "DOCUMENT_PROCESSED",
        entityType: "document",
        entityId: documentId,
        metadataJson: {
          pageCount: parsed.pageCount,
          chunkCount: rawChunks.length,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      await this.documents.updateStatus(documentId, "FAILED", { errorMessage });
      await this.jobs.updateStatus(job.id, "FAILED", {
        finishedAt: new Date(),
        errorMessage,
        retries: job.retries + 1,
      });

      await this.audit.log({
        action: "DOCUMENT_PROCESS_FAILED",
        entityType: "document",
        entityId: documentId,
        metadataJson: { error: errorMessage },
      });

      throw err;
    }
  }

  private async embedInBatches(
    chunks: ReturnType<typeof chunkDocument>
  ): Promise<Array<(typeof chunks)[0] & { embeddingVector: number[] }>> {
    const result = [];

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const texts = batch.map((c) => c.content);
      const embeddings = await this.aiProvider.generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        result.push({ ...batch[j], embeddingVector: embeddings[j] });
      }
    }

    return result;
  }
}
