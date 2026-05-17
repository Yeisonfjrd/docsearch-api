import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyMultipart from "@fastify/multipart";

import { getConfig } from "./infrastructure/config.js";
import { createContainer } from "./infrastructure/container.js";
import { registerAuthMiddleware } from "./interface/middleware/auth.js";
import { authRoutes } from "./interface/routes/auth.js";
import { documentRoutes } from "./interface/routes/documents.js";
import { conversationRoutes } from "./interface/routes/conversations.js";
import { statusRoutes } from "./interface/routes/status.js";

export async function buildApp() {
  const config = getConfig();
  const container = createContainer(config);

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === "development" && {
        transport: { target: "pino-pretty", options: { colorize: true } },
      }),
    },
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(fastifyHelmet);
  await app.register(fastifyCors, {
    origin: config.NODE_ENV === "production" ? config.CORS_ORIGIN : true,
    credentials: true,
  });
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  });
  await app.register(fastifyMultipart);

  await registerAuthMiddleware(app);

  await app.register(authRoutes);
  await app.register(documentRoutes, { container });
  await app.register(conversationRoutes, { container });
  await app.register(statusRoutes, { container });

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: config.NODE_ENV,
  }));

  app.setErrorHandler((err, req, reply) => {
    const statusCode = err.statusCode ?? 500;

    if (err.name === "ZodError") {
      return reply.code(400).send({
        error: "Datos de entrada inválidos",
        details: JSON.parse(err.message),
      });
    }

    req.log.error({ err, requestId: req.id }, err.message);

    return reply.code(statusCode).send({
      error: statusCode >= 500 ? "Error interno del servidor" : err.message,
      requestId: req.id,
    });
  });

  return app;
}
