import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../infrastructure/container.js";

interface RouteOptions {
  container: AppContainer;
}

export async function statusRoutes(app: FastifyInstance, options: RouteOptions) {
  app.get("/status", async () => {
    const ai = await options.container.aiProvider.getStatus();

    return {
      status: ai.available ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      env: options.container.config.NODE_ENV,
      ai,
    };
  });
}
