// ─── Repository Interfaces (Ports) ───────────────────────────────────────────
// El dominio define QUÉ necesita; la infra define CÓMO lo provee.

import type {
  User,
  Document,
  DocumentChunk,
  Conversation,
  Message,
  Citation,
  AuditLog,
  IngestionJob,
  DocumentStatus,
} from "./entities/index.js";

// ─── User ────────────────────────────────────────────────────────────────────

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: Omit<User, "id" | "createdAt">): Promise<User>;
}

// ─── Document ────────────────────────────────────────────────────────────────

export interface IDocumentRepository {
  findById(id: string): Promise<Document | null>;
  findByUserId(userId: string): Promise<Document[]>;
  findByChecksum(checksum: string): Promise<Document | null>;
  create(data: Omit<Document, "id" | "createdAt">): Promise<Document>;
  updateStatus(
    id: string,
    status: DocumentStatus,
    extra?: Partial<Pick<Document, "pageCount" | "processedAt" | "errorMessage">>
  ): Promise<void>;
}

// ─── Chunk ───────────────────────────────────────────────────────────────────

export interface IChunkRepository {
  createMany(chunks: Omit<DocumentChunk, "id">[]): Promise<void>;
  findSimilar(
    embedding: number[],
    topK: number,
    threshold: number,
    documentIds?: string[]
  ): Promise<Array<DocumentChunk & { similarity: number }>>;
  deleteByDocumentId(documentId: string): Promise<void>;
}

// ─── Conversation ────────────────────────────────────────────────────────────

export interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByUserId(userId: string): Promise<Conversation[]>;
  create(data: Omit<Conversation, "id" | "createdAt">): Promise<Conversation>;
}

export interface IMessageRepository {
  findByConversationId(conversationId: string): Promise<Message[]>;
  create(data: Omit<Message, "id" | "createdAt">): Promise<Message>;
}

export interface ICitationRepository {
  createMany(citations: Omit<Citation, "id">[]): Promise<void>;
  findByMessageId(messageId: string): Promise<Citation[]>;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface IAuditRepository {
  log(data: Omit<AuditLog, "id" | "createdAt">): Promise<void>;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface IIngestionJobRepository {
  findByDocumentId(documentId: string): Promise<IngestionJob | null>;
  create(data: Pick<IngestionJob, "documentId">): Promise<IngestionJob>;
  updateStatus(
    id: string,
    status: IngestionJob["status"],
    extra?: Partial<
      Pick<IngestionJob, "retries" | "lockedAt" | "startedAt" | "finishedAt" | "errorMessage">
    >
  ): Promise<void>;
}
