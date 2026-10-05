import type { FastifyInstance } from "fastify";
import { AskBody, ConversationParams } from "../schemas/index.js";
import type { AppContainer } from "../../infrastructure/container.js";
import { ConversationNotFoundError } from "../../application/use-cases/answer-question.js";

interface RouteOptions {
  container: AppContainer;
}

export async function conversationRoutes(app: FastifyInstance, options: RouteOptions) {
  const { repositories, useCases } = options.container;
  const answerUseCase = useCases.answerQuestion;
  const convRepo = repositories.conversations;
  const msgRepo = repositories.messages;

  // POST /ask — Main RAG endpoint
  app.post(
    "/ask",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = AskBody.parse(req.body);

      try {
        const result = await answerUseCase.execute({
          userId: req.user.sub,
          conversationId: body.conversationId,
          question: body.question,
          documentIds: body.documentIds,
          ip: req.ip,
        });

        return reply.send(result);
      } catch (err) {
        if (err instanceof ConversationNotFoundError) {
          return reply.code(404).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  // GET /conversations — List
  app.get(
    "/conversations",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
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

      const conv = await convRepo.findById(conversationId);
      if (!conv || conv.userId !== req.user.sub) {
        return reply.code(404).send({ error: "Conversación no encontrada" });
      }

      const messages = await msgRepo.findByConversationId(conversationId);
      return reply.send({ conversation: conv, messages });
    }
  );
}
