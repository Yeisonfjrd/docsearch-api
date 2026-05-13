import type { FastifyInstance } from "fastify";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";
import { RegisterBody, LoginBody } from "../schemas/index.js";

export async function authRoutes(app: FastifyInstance) {
  const prisma = getPrismaClient();

  // POST /auth/register
  app.post("/auth/register", async (req, reply) => {
    const body = RegisterBody.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.code(409).send({ error: "El email ya está registrado" });
    }

    const passwordHash = createHash("sha256").update(body.password).digest("hex");

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: body.email,
        passwordHash,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    const token = app.jwt.sign({ sub: user.id, role: user.role });

    return reply.code(201).send({ user, token });
  });

  // POST /auth/login
  app.post("/auth/login", async (req, reply) => {
    const body = LoginBody.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return reply.code(401).send({ error: "Credenciales inválidas" });
    }

    const passwordHash = createHash("sha256").update(body.password).digest("hex");
    if (user.passwordHash !== passwordHash) {
      return reply.code(401).send({ error: "Credenciales inválidas" });
    }

    const token = app.jwt.sign({ sub: user.id, role: user.role });

    return reply.send({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  });
}
