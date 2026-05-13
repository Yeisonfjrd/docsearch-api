import type { FastifyInstance } from "fastify";
import { AnswerQuestionUseCase } from "../../application/use-cases/answer-question.js";
import { AskBody, ConversationParams } from "../schemas/index.js";
import { PrismaChunkRepository } from "../../infrastructure/database/repositories/chunk.js";
import { PrismaConversationRepository } from "../../infrastructure/database/repositories/conversation.js";
import { PrismaMessageRepository } from "../../infrastructure/database/repositories/message.js";
import { PrismaCitationRepository } from "../../infrastructure/database/repositories/citation.js";
import { PrismaAuditRepository } from "../../infrastructure/database/repositories/audit.js";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";

export async function conversationRoutes(app: FastifyInstance) {
  const prisma = getPrismaClient();

  const answerUseCase = new AnswerQuestionUseCase(
    new PrismaChunkRepository(prisma),
    new PrismaConversationRepository(prisma),
    new PrismaMessageRepository(prisma),
    new PrismaCitationRepository(prisma),
    new PrismaAuditRepository(prisma)
  );

  // POST /ask — Main RAG endpoint
  app.post(
    "/ask",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = AskBody.parse(req.body);

      const result = await answerUseCase.execute({
        userId: req.user.sub,
        conversationId: body.conversationId,
        question: body.question,
        documentIds: body.documentIds,
        ip: req.ip,
      });

      return reply.send(result);
    }
  );

  // GET /conversations — List
  app.get(
    "/conversations",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const convRepo = new PrismaConversationRepository(prisma);
      const convs = await convRepo.findByUserId(req.user.sub);
      return reply.send({ conversations: convs });
    }
  );

  // GET /conversations/:conversationId/messages — History
  app.get(
    "/conversations/:conversationId/messages",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { conversationId } = ConversationParams.parse(req.params);
      const convRepo = new PrismaConversationRepository(prisma);
      const msgRepo = new PrismaMessageRepository(prisma);

      const conv = await convRepo.findById(conversationId);
      if (!conv || conv.userId !== req.user.sub) {
        return reply.code(404).send({ error: "Conversación no encontrada" });
      }

      const messages = await msgRepo.findByConversationId(conversationId);
      return reply.send({ conversation: conv, messages });
    }
  );
}
