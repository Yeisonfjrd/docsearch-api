# docsearch

**Plataforma de consulta y análisis de documentos técnicos con búsqueda semántica, trazabilidad y auditoría.**

## Stack

| Capa | Tecnología |
|---|---|
| API | Fastify + TypeScript |
| ORM | Prisma + PostgreSQL |
| Vectores | pgvector |
| IA | OpenAI (embeddings + chat) |
| Cache / Rate limit | Redis |
| Tests | Vitest |
| Observabilidad | OpenTelemetry |

## Arquitectura

```
src/
├── interface/          # Rutas, middleware, schemas de validación
├── application/        # Casos de uso (lógica de negocio)
├── domain/             # Entidades y contratos (ports)
└── infrastructure/     # Implementaciones concretas (DB, AI, cache, parsers)
```

## Setup local

### 1. Prerrequisitos

- Node.js 20+
- Docker y Docker Compose

### 2. Clonar e instalar dependencias

```bash
git clone <repo>
cd docsearch
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editá .env y completá OPENAI_API_KEY y JWT_SECRET
```

### 4. Levantar infraestructura (Postgres + Redis)

```bash
docker compose up -d
```

### 5. Migrar base de datos

```bash
npm run db:generate
npm run db:migrate
```

### 6. Correr en desarrollo

```bash
npm run dev
```

El servidor queda en `http://localhost:3000`.

---

## API — Endpoints principales

### Auth

```
POST /auth/register   { email, password }
POST /auth/login      { email, password }
```

### Documentos

```
POST   /documents              (multipart/form-data, campo: file)
GET    /documents
GET    /documents/:documentId
```

### RAG

```
POST /ask   { question, conversationId?, documentIds? }
GET  /conversations
GET  /conversations/:conversationId/messages
```

### Health

```
GET /health
```

---

## Roadmap

- **Fase 1** ✅ — Auth JWT, modelos Prisma, upload, healthcheck
- **Fase 2** ✅ — Parser PDF, chunking, embeddings, indexación vectorial
- **Fase 3** ✅ — Búsqueda semántica, RAG, citas trazables, historial
- **Fase 4** — Rate limiting Redis, OpenTelemetry, Docker multi-stage, métricas

---

## Tests

```bash
npm test              # watch mode
npm run test:run      # una pasada
npm run test:coverage # con cobertura
```
