// ─── Domain Entities ─────────────────────────────────────────────────────────
// Tipos puros del dominio, sin dependencias de infraestructura

export type UserRole = "ADMIN" | "USER";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

// ─── Document ────────────────────────────────────────────────────────────────

export type DocumentStatus =
  | "UPLOADED"
  | "PARSING"
  | "INDEXING"
  | "READY"
  | "FAILED";

export interface Document {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  checksum: string;
  sizeBytes: number;
  status: DocumentStatus;
  pageCount?: number;
  sourcePath: string;
  createdAt: Date;
  processedAt?: Date;
  errorMessage?: string;
}

// ─── Chunk ───────────────────────────────────────────────────────────────────

export interface DocumentChunk {
  id: string;
  documentId: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  embeddingVector?: number[];
  tokenCount: number;
  startOffset: number;
  endOffset: number;
}

// ─── Conversation ────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";
export type QueryStatus =
  | "QUEUED"
  | "RETRIEVING"
  | "GENERATING"
  | "ANSWERED"
  | "FAILED";

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  model?: string;
  latencyMs?: number;
  queryStatus: QueryStatus;
  createdAt: Date;
}

// ─── Citation ────────────────────────────────────────────────────────────────

export interface Citation {
  id: string;
  messageId: string;
  documentId: string;
  chunkId: string;
  pageNumber: number;
  paragraphRef?: string;
  similarityScore: number;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  metadataJson?: Record<string, unknown>;
  createdAt: Date;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface IngestionJob {
  id: string;
  documentId: string;
  status: JobStatus;
  retries: number;
  lockedAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  errorMessage?: string;
}
