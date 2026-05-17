import type { Prisma, PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import type {
  IDocumentRepository,
  IChunkRepository,
  IIngestionJobRepository,
  IAuditRepository,
  IConversationRepository,
  IMessageRepository,
  ICitationRepository,
} from "../../../domain/repositories.js";
import type {
  Document,
  DocumentStatus,
  DocumentChunk,
  IngestionJob,
  AuditLog,
  Conversation,
  Message,
  Citation,
} from "../../../domain/entities/index.js";

export class PrismaDocumentRepository implements IDocumentRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string) {
    const row = await this.db.document.findUnique({ where: { id } });
    return row as Document | null;
  }

  async findByUserId(userId: string) {
    const rows = await this.db.document.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows as Document[];
  }

  async findByChecksum(checksum: string) {
    const row = await this.db.document.findUnique({ where: { checksum } });
    return row as Document | null;
  }

  async create(data: Omit<Document, "id" | "createdAt">) {
    const row = await this.db.document.create({ data: { id: uuidv4(), ...data } });
    return row as Document;
  }

  async updateStatus(id: string, status: DocumentStatus, extra?: Partial<Pick<Document, "pageCount" | "processedAt" | "errorMessage">>) {
    await this.db.document.update({ where: { id }, data: { status, ...extra } });
  }
}

export class PrismaChunkRepository implements IChunkRepository {
  constructor(private readonly db: PrismaClient) {}

  async createMany(chunks: Omit<DocumentChunk, "id">[]) {
    for (const chunk of chunks) {
      const id = uuidv4();
      const vectorStr = chunk.embeddingVector
        ? `[${chunk.embeddingVector.join(",")}]`
        : null;

      await this.db.$executeRaw`
        INSERT INTO document_chunks
          (id, document_id, page_number, chunk_index, content, embedding_vector, token_count, start_offset, end_offset, source_format, is_active)
        VALUES
          (${id}, ${chunk.documentId}, ${chunk.pageNumber}, ${chunk.chunkIndex},
           ${chunk.content}, ${vectorStr}::vector, ${chunk.tokenCount},
           ${chunk.startOffset}, ${chunk.endOffset}, ${chunk.sourceFormat}, true)
      `;
    }
  }

  async replaceByDocumentId(documentId: string, chunks: Omit<DocumentChunk, "id">[]) {
    const newChunkIds = chunks.map(() => uuidv4());

    await this.db.$transaction(async (tx) => {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vectorStr = chunk.embeddingVector
          ? `[${chunk.embeddingVector.join(",")}]`
          : null;

        await tx.$executeRaw`
          INSERT INTO document_chunks
            (id, document_id, page_number, chunk_index, content, embedding_vector, token_count, start_offset, end_offset, source_format, is_active)
          VALUES
            (${newChunkIds[i]}, ${chunk.documentId}, ${chunk.pageNumber}, ${chunk.chunkIndex},
             ${chunk.content}, ${vectorStr}::vector, ${chunk.tokenCount},
             ${chunk.startOffset}, ${chunk.endOffset}, ${chunk.sourceFormat}, true)
        `;
      }

      await tx.$executeRaw`
        UPDATE document_chunks
        SET is_active = false
        WHERE document_id = ${documentId}
          AND id <> ALL(${newChunkIds}::text[])
      `;
    });
  }

  async findSimilar(embedding: number[], topK: number, threshold: number, documentIds?: string[]) {
    const vectorStr = `[${embedding.join(",")}]`;

    const rows: Array<DocumentChunk & { similarity: number }> = documentIds?.length
      ? await this.db.$queryRaw`
          SELECT id, document_id as "documentId", page_number as "pageNumber",
                 chunk_index as "chunkIndex", content, token_count as "tokenCount",
                 start_offset as "startOffset", end_offset as "endOffset",
                 source_format as "sourceFormat",
                 1 - (embedding_vector <=> ${vectorStr}::vector) as similarity
          FROM document_chunks
          WHERE document_id = ANY(${documentIds}::text[])
            AND is_active = true
            AND 1 - (embedding_vector <=> ${vectorStr}::vector) >= ${threshold}
          ORDER BY embedding_vector <=> ${vectorStr}::vector
          LIMIT ${topK}
        `
      : await this.db.$queryRaw`
          SELECT id, document_id as "documentId", page_number as "pageNumber",
                 chunk_index as "chunkIndex", content, token_count as "tokenCount",
                 start_offset as "startOffset", end_offset as "endOffset",
                 source_format as "sourceFormat",
                 1 - (embedding_vector <=> ${vectorStr}::vector) as similarity
          FROM document_chunks
          WHERE is_active = true
            AND 1 - (embedding_vector <=> ${vectorStr}::vector) >= ${threshold}
          ORDER BY embedding_vector <=> ${vectorStr}::vector
          LIMIT ${topK}
        `;

    return rows;
  }

  async deleteByDocumentId(documentId: string) {
    await this.db.documentChunk.deleteMany({ where: { documentId } });
  }
}

export class PrismaIngestionJobRepository implements IIngestionJobRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByDocumentId(documentId: string) {
    const row = await this.db.ingestionJob.findUnique({ where: { documentId } });
    return row as IngestionJob | null;
  }

  async create(data: Pick<IngestionJob, "documentId">) {
    const row = await this.db.ingestionJob.create({ data: { id: uuidv4(), ...data } });
    return row as IngestionJob;
  }

  async updateStatus(id: string, status: IngestionJob["status"], extra?: Partial<Pick<IngestionJob, "retries" | "lockedAt" | "startedAt" | "finishedAt" | "errorMessage">>) {
    await this.db.ingestionJob.update({ where: { id }, data: { status, ...extra } });
  }
}

export class PrismaAuditRepository implements IAuditRepository {
  constructor(private readonly db: PrismaClient) {}

  async log(data: Omit<AuditLog, "id" | "createdAt">) {
    await this.db.auditLog.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        ip: data.ip,
        userAgent: data.userAgent,
        metadataJson: data.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

export class PrismaConversationRepository implements IConversationRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string) {
    const row = await this.db.conversation.findUnique({ where: { id } });
    return row as Conversation | null;
  }

  async findByUserId(userId: string) {
    const rows = await this.db.conversation.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows as Conversation[];
  }

  async create(data: Omit<Conversation, "id" | "createdAt">) {
    const row = await this.db.conversation.create({ data: { id: uuidv4(), ...data } });
    return row as Conversation;
  }
}

export class PrismaMessageRepository implements IMessageRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByConversationId(conversationId: string) {
    const rows = await this.db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
    return rows as Message[];
  }

  async create(data: Omit<Message, "id" | "createdAt">) {
    const row = await this.db.message.create({ data: { id: uuidv4(), ...data } });
    return row as Message;
  }
}

export class PrismaCitationRepository implements ICitationRepository {
  constructor(private readonly db: PrismaClient) {}

  async createMany(citations: Omit<Citation, "id">[]) {
    await this.db.citation.createMany({
      data: citations.map((c) => ({ id: uuidv4(), ...c })),
    });
  }

  async findByMessageId(messageId: string) {
    const rows = await this.db.citation.findMany({ where: { messageId } });
    return rows as Citation[];
  }
}
