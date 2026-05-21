# DocSearch API

Backend Fastify con pipeline RAG completo.

## Desarrollo
```bash
cp .env.example .env   # completar JWT_SECRET
docker compose up -d
pnpm exec prisma generate
pnpm exec prisma migrate dev
pnpm dev
```

## Variables de entorno clave
| Variable | Descripción |
|----------|-------------|
| `JWT_SECRET` | Mínimo 32 chars |
| `AI_PROVIDER` | `ollama` (default) o `openai` |
| `LLM_MODEL` | `llama3.1` (default) |
| `EMBEDDING_MODEL` | `nomic-embed-text` (default) |
| `DATABASE_URL` | PostgreSQL connection string |

## Tests
```bash
pnpm test:run
pnpm typecheck
```

## Arquitectura
```
domain/          → entidades e interfaces (sin deps)
application/     → casos de uso (inyección de dependencias)
infrastructure/  → Prisma, Redis, Ollama/OpenAI, parsers
interface/       → rutas Fastify, schemas, middleware
```
