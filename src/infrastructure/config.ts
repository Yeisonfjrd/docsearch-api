import { z } from "zod";

const configSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith("sk-"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),

  // Storage
  STORAGE_TYPE: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./uploads"),

  // File limits
  MAX_FILE_SIZE_MB: z.coerce.number().default(20),
  ALLOWED_MIME_TYPES: z
    .string()
    .default("application/pdf,text/plain")
    .transform((s) => s.split(",").map((t) => t.trim())),

  // Rate limiting
  RATE_LIMIT_UPLOAD_PER_MINUTE: z.coerce.number().default(10),
  RATE_LIMIT_QUERY_PER_MINUTE: z.coerce.number().default(30),

  // RAG
  RAG_TOP_K: z.coerce.number().default(5),
  RAG_SIMILARITY_THRESHOLD: z.coerce.number().default(0.75),
  RAG_MAX_CONTEXT_TOKENS: z.coerce.number().default(3000),

  // Observability
  OTEL_SERVICE_NAME: z.string().default("docsearch"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

let _config: Config | undefined;

export function getConfig(): Config {
  if (_config) return _config;

  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`❌ Variables de entorno inválidas:\n${errors}`);
  }

  _config = result.data;
  return _config;
}
