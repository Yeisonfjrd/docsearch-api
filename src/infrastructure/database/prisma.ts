import { PrismaClient } from "@prisma/client";
import { getConfig } from "../config.js";

let _client: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (_client) return _client;

  const { NODE_ENV } = getConfig();

  _client = new PrismaClient({
    log:
      NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

  return _client;
}

export async function disconnectPrisma(): Promise<void> {
  await _client?.$disconnect();
  _client = undefined;
}
