# DocSearch — API

Fastify · Node.js 22 · TypeScript · PostgreSQL + pgvector · Ollama.  
Pipeline RAG completo con ingesta documental, búsqueda semántica y respuestas con citas trazables.

## Desarrollo

```bash
cp .env.example .env
# Completar JWT_SECRET (mínimo 32 chars)

docker compose up -d
pnpm exec prisma generate
pnpm exec prisma migrate dev
pnpm dev
```

Corre en `http://localhost:3000`.

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Clave para firmar tokens | — (requerida) |
| `AI_PROVIDER` | Proveedor de IA | `ollama` |
| `LLM_MODEL` | Modelo de chat | `llama3.1` |
| `EMBEDDING_MODEL` | Modelo de embeddings | `nomic-embed-text` |
| `EMBEDDING_DIMENSIONS` | Dimensiones del vector | `768` |
| `DATABASE_URL` | PostgreSQL connection string | — (requerida) |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `OLLAMA_BASE_URL` | URL de Ollama | `http://localhost:11434` |
| `MAX_FILE_SIZE_MB` | Tamaño máximo de archivo | `20` |

Ver `.env.example` para la lista completa.

## Endpoints

```
POST   /auth/register
POST   /auth/login

POST   /documents              ← upload (multipart)
GET    /documents
GET    /documents/:id

POST   /ask                    ← consulta RAG
GET    /conversations
GET    /conversations/:id/messages

GET    /health
GET    /status                 ← estado de DB, Redis y Ollama
```

## Tests

```bash
pnpm test:run    # 55+ tests
pnpm typecheck
```

## Arquitectura

```
src/
├── domain/          → entidades e interfaces (sin dependencias externas)
├── application/     → casos de uso con inyección de dependencias
│   └── use-cases/   → UploadDocument, ProcessDocument, AnswerQuestion
├── infrastructure/  → implementaciones concretas
│   ├── ai/          → providers Ollama y OpenAI intercambiables
│   ├── database/    → Prisma + repositorios + pgvector
│   ├── parsers/     → PDF, DOCX, TXT, MD, CSV, PPTX
│   ├── cache/       → Redis (rate limiting)
│   └── container.ts → composition root (wiring de dependencias)
└── interface/       → rutas Fastify, middleware, schemas
```

## Formatos soportados

PDF · TXT · MD · DOCX · CSV · PPTX

## Requisitos

- Node.js 22+
- Docker (PostgreSQL 16 + pgvector, Redis 7)
- Ollama con `llama3.1` y `nomic-embed-text`
