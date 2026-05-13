import type { FastifyInstance } from "fastify";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";
import { UploadDocumentUseCase } from "../../application/use-cases/upload-document.js";
import { ProcessDocumentUseCase } from "../../application/use-cases/process-document.js";
import { DocumentParams } from "../schemas/index.js";

// Prisma-based repository adapters (inline for Fase 1 — extraer a infrastructure/ en Fase 2)
import { PrismaDocumentRepository } from "../../infrastructure/database/repositories/document.js";
import { PrismaIngestionJobRepository } from "../../infrastructure/database/repositories/ingestion-job.js";
import { PrismaAuditRepository } from "../../infrastructure/database/repositories/audit.js";
import { PrismaChunkRepository } from "../../infrastructure/database/repositories/chunk.js";
import { getConfig } from "../../infrastructure/config.js";

export async function documentRoutes(app: FastifyInstance) {
  const prisma = getPrismaClient();
  const documentRepo = new PrismaDocumentRepository(prisma);
  const jobRepo = new PrismaIngestionJobRepository(prisma);
  const auditRepo = new PrismaAuditRepository(prisma);
  const chunkRepo = new PrismaChunkRepository(prisma);

  const uploadUseCase = new UploadDocumentUseCase(documentRepo, jobRepo, auditRepo);
  const processUseCase = new ProcessDocumentUseCase(documentRepo, chunkRepo, jobRepo, auditRepo);

  // POST /documents — Upload
  app.post(
    "/documents",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const config = getConfig();
      const data = await req.file({
        limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024 },
      });

      if (!data) {
        return reply.code(400).send({ error: "No se recibió ningún archivo" });
      }

      const result = await uploadUseCase.execute({
        userId: req.user.sub,
        filename: data.filename,
        mimeType: data.mimetype,
        fileStream: data.file,
        ip: req.ip,
      });

      if (result.isDuplicate) {
        return reply.code(200).send({
          message: "Documento ya existente (deduplicado por checksum)",
          document: result.document,
        });
      }

      // Fire-and-forget ingestion (replace with queue in production)
      processUseCase.execute({ documentId: result.document.id }).catch((err) => {
        app.log.error({ err, documentId: result.document.id }, "Error en ingesta");
      });

      return reply.code(202).send({
        message: "Documento recibido. Ingesta en progreso.",
        document: result.document,
      });
    }
  );

  // GET /documents — List user's documents
  app.get(
    "/documents",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const docs = await documentRepo.findByUserId(req.user.sub);
      return reply.send({ documents: docs });
    }
  );

  // GET /documents/:documentId — Status
  app.get(
    "/documents/:documentId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { documentId } = DocumentParams.parse(req.params);
      const doc = await documentRepo.findById(documentId);

      if (!doc || doc.userId !== req.user.sub) {
        return reply.code(404).send({ error: "Documento no encontrado" });
      }

      const job = await jobRepo.findByDocumentId(documentId);

      return reply.send({ document: doc, job });
    }
  );
}
