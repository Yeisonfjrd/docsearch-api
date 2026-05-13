import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ─── Documents ────────────────────────────────────────────────────────────────

export const DocumentParams = z.object({
  documentId: z.string().uuid(),
});

// ─── Conversations ────────────────────────────────────────────────────────────

export const AskBody = z.object({
  question: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  documentIds: z.array(z.string().uuid()).optional(),
});

export const ConversationParams = z.object({
  conversationId: z.string().uuid(),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type RegisterBodyType = z.infer<typeof RegisterBody>;
export type LoginBodyType = z.infer<typeof LoginBody>;
export type AskBodyType = z.infer<typeof AskBody>;
