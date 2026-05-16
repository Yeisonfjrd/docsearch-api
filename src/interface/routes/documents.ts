import type { FastifyInstance } from "fastify";
import { DocumentParams } from "../schemas/index.js";
import type { AppContainer } from "../../infrastructure/container.js";

interface RouteOptions {
  container: AppContainer;
}

export async function documentRoutes(app: FastifyInstance, options: RouteOptions) {
  const { config, repositories, useCases } = options.container;
  const documentRepo = repositories.documents;
  const jobRepo = repositories.jobs;
  const uploadUseCase = useCases.uploadDocument;
  const processUseCase = useCases.processDocument;

  // POST /documents — Upload
  app.post(
    "/documents",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
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
