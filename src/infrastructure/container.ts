import type { Config } from "./config.js";
import { getConfig } from "./config.js";
import { getPrismaClient } from "./database/prisma.js";
import { createAiProvider } from "./ai/factory.js";
import type { AiProvider } from "./ai/factory.js";
import { UploadDocumentUseCase } from "../application/use-cases/upload-document.js";
import { ProcessDocumentUseCase } from "../application/use-cases/process-document.js";
import { AnswerQuestionUseCase } from "../application/use-cases/answer-question.js";
import {
  PrismaAuditRepository,
  PrismaChunkRepository,
  PrismaCitationRepository,
  PrismaConversationRepository,
  PrismaDocumentRepository,
  PrismaIngestionJobRepository,
  PrismaMessageRepository,
} from "./database/repositories/document.js";

export interface AppContainer {
  config: Config;
  aiProvider: AiProvider;
  repositories: {
    documents: PrismaDocumentRepository;
    chunks: PrismaChunkRepository;
    jobs: PrismaIngestionJobRepository;
    audit: PrismaAuditRepository;
    conversations: PrismaConversationRepository;
    messages: PrismaMessageRepository;
    citations: PrismaCitationRepository;
  };
  useCases: {
    uploadDocument: UploadDocumentUseCase;
    processDocument: ProcessDocumentUseCase;
    answerQuestion: AnswerQuestionUseCase;
  };
}

export function createContainer(config: Config = getConfig()): AppContainer {
  const prisma = getPrismaClient();
  const aiProvider = createAiProvider(config);

  const repositories = {
    documents: new PrismaDocumentRepository(prisma),
    chunks: new PrismaChunkRepository(prisma),
    jobs: new PrismaIngestionJobRepository(prisma),
    audit: new PrismaAuditRepository(prisma),
    conversations: new PrismaConversationRepository(prisma),
    messages: new PrismaMessageRepository(prisma),
    citations: new PrismaCitationRepository(prisma),
  };

  return {
    config,
    aiProvider,
    repositories,
    useCases: {
      uploadDocument: new UploadDocumentUseCase(
        repositories.documents,
        repositories.jobs,
        repositories.audit
      ),
      processDocument: new ProcessDocumentUseCase(
        repositories.documents,
        repositories.chunks,
        repositories.jobs,
        repositories.audit,
        aiProvider
      ),
      answerQuestion: new AnswerQuestionUseCase(
        repositories.chunks,
        repositories.conversations,
        repositories.messages,
        repositories.citations,
        repositories.audit,
        aiProvider
      ),
    },
  };
}
