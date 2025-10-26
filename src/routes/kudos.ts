import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/utils";

export default async function kudosRoutes(app: FastifyInstance) {
  app.get("/kudos", { preHandler: app.auth }, async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    const member = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
    });
    if (!member)
      return reply
        .code(409)
        .send({ error: "conflict", message: "Not in a couple" });
    const items = await app.prisma.kudos.findMany({
      where: { coupleId: member.coupleId },
      orderBy: { createdAt: "desc" },
    });
    return reply.send(items);
  });
  const Body = z.object({
    toId: z.string(),
    text: z.string().min(1),
    tags: z.array(z.string()).default([]),
  });
  app.post("/kudos", { preHandler: app.auth }, async (req, reply) => {
    const { toId, text, tags } = Body.parse(req.body ?? {});
    const user = requireUser(req, reply);
    if (!user) return;
    const member = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
    });
    if (!member)
      return reply
        .code(409)
        .send({ error: "conflict", message: "Not in a couple" });
    const recipient = await app.prisma.coupleMember.findFirst({
      where: { coupleId: member.coupleId, userId: toId },
    });
    if (!recipient)
      return reply
        .code(404)
        .send({ error: "not_found", message: "Recipient" });
    const kudos = await app.prisma.kudos.create({
      data: { coupleId: member.coupleId, fromId: user.id, toId, text, tags },
    });
    return reply.code(201).send(kudos);
  });
}
