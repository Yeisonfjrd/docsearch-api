import { createHash } from "crypto";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { join, extname } from "path";
import { pipeline } from "stream/promises";
import { v4 as uuidv4 } from "uuid";
import type { Readable } from "stream";

import type { IDocumentRepository, IIngestionJobRepository, IAuditRepository } from "../../domain/repositories.js";
import type { Document } from "../../domain/entities/index.js";
import { getConfig } from "../../infrastructure/config.js";

export interface UploadDocumentInput {
  userId: string;
  filename: string;
  mimeType: string;
  fileStream: Readable;
  ip?: string;
}

export interface UploadDocumentOutput {
  document: Document;
  isDuplicate: boolean;
}

export class UploadDocumentUseCase {
  constructor(
    private readonly documents: IDocumentRepository,
    private readonly jobs: IIngestionJobRepository,
    private readonly audit: IAuditRepository
  ) {}

  async execute(input: UploadDocumentInput): Promise<UploadDocumentOutput> {
    const config = getConfig();

    if (!config.ALLOWED_MIME_TYPES.includes(input.mimeType)) {
      throw new Error(
        `Tipo de archivo no permitido: ${input.mimeType}. Tipos permitidos: ${config.ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    await mkdir(config.STORAGE_LOCAL_PATH, { recursive: true });

    const tempId = uuidv4();
    const ext = extname(input.filename);
    const storagePath = join(config.STORAGE_LOCAL_PATH, `${tempId}${ext}`);

    const { checksum, sizeBytes } = await this.saveFileAndHash(
      input.fileStream,
      storagePath,
      config.MAX_FILE_SIZE_MB * 1024 * 1024
    );

    const existing = await this.documents.findByChecksum(checksum);
    if (existing) {
      await this.audit.log({
        userId: input.userId,
        action: "DOCUMENT_UPLOAD_DUPLICATE",
        entityType: "document",
        entityId: existing.id,
        ip: input.ip,
        metadataJson: { filename: input.filename, checksum },
      });
      return { document: existing, isDuplicate: true };
    }

    const document = await this.documents.create({
      userId: input.userId,
      filename: input.filename,
      mimeType: input.mimeType,
      checksum,
      sizeBytes,
      status: "UPLOADED",
      sourcePath: storagePath,
    });

    await this.jobs.create({ documentId: document.id });

    await this.audit.log({
      userId: input.userId,
      action: "DOCUMENT_UPLOADED",
      entityType: "document",
      entityId: document.id,
      ip: input.ip,
      metadataJson: { filename: input.filename, sizeBytes, mimeType: input.mimeType },
    });

    return { document, isDuplicate: false };
  }

  private saveFileAndHash(
    stream: Readable,
    dest: string,
    maxBytes: number
  ): Promise<{ checksum: string; sizeBytes: number }> {
    return new Promise((resolve, reject) => {
      const hash = createHash("sha256");
      const out = createWriteStream(dest);
      let sizeBytes = 0;

      stream.on("data", (chunk: Buffer) => {
        sizeBytes += chunk.length;
        if (sizeBytes > maxBytes) {
          stream.destroy();
          out.destroy();
          reject(
            new Error(
              `Archivo demasiado grande. Máximo permitido: ${maxBytes / 1024 / 1024} MB`
            )
          );
        }
        hash.update(chunk);
      });

      pipeline(stream, out)
        .then(() => resolve({ checksum: hash.digest("hex"), sizeBytes }))
        .catch(reject);
    });
  }
}
