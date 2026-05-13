import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: { sub: string; role: string };
  }
}

export async function registerAuthMiddleware(app: FastifyInstance) {
  app.decorate(
    "authenticate",
    async function (req: FastifyRequest, reply: FastifyReply) {
      try {
        await req.jwtVerify();
      } catch {
        reply.code(401).send({ error: "Token inválido o expirado" });
      }
    }
  );
}
