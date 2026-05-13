import { buildApp } from "./app.js";
import { getConfig } from "./infrastructure/config.js";
import { disconnectPrisma } from "./infrastructure/database/prisma.js";
import { disconnectRedis } from "./infrastructure/cache/redis.js";

async function main() {
  const config = getConfig();
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`🚀 docsearch corriendo en http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info(`Señal ${signal} recibida, apagando...`);
    await app.close();
    await disconnectPrisma();
    await disconnectRedis();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
