import type { FastifyInstance } from "fastify";
import { z } from "zod";

export default async function coupleRoutes(app: FastifyInstance) {
  const createBody = z.object({
    inviteCode: z.string().min(4).max(16).optional(),
  });
  app.post("/couple", { preHandler: app.auth }, async (req, reply) => {
    const { inviteCode } = createBody.parse(req.body ?? {});
    const user = req.user!;
    const existing = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
    });
    if (existing)
      return reply
        .code(409)
        .send({ error: "conflict", message: "Already in a couple" });
    const code =
      inviteCode ?? Math.random().toString(36).slice(2, 10).toUpperCase();
    const couple = await app.prisma.couple.create({
      data: { code, members: { create: { userId: user.id } } },
    });
    return reply.code(201).send(couple);
  });

  const joinBody = z.object({ code: z.string().min(4) });
  app.post("/couple/join", { preHandler: app.auth }, async (req, reply) => {
    const { code } = joinBody.parse(req.body ?? {});
    const user = req.user!;
    const exists = await app.prisma.couple.findUnique({ where: { code } });
    if (!exists)
      return reply
        .code(404)
        .send({ error: "not_found", message: "Code not found" });
    const already = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
    });
    if (already)
      return reply
        .code(409)
        .send({ error: "conflict", message: "Already linked" });
    await app.prisma.coupleMember.create({
      data: { coupleId: exists.id, userId: user.id },
    });
    return reply.send(exists);
  });

  app.get(
    "/couple/:coupleId/stats",
    { preHandler: app.auth },
    async (req, reply) => {
      const { coupleId } = req.params as any;
      const stats = await app.prisma.coupleStats.findUnique({
        where: { coupleId },
      });
      return reply.send(
        stats ?? {
          level: 1,
          xp: 0,
          hearts: 0,
          dayStreak: 0,
          weekStreak: 0,
          affinity: 0,
        },
      );
    },
  );
}
