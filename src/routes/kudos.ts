import type { FastifyInstance } from "fastify";
import { z } from "zod";

export default async function kudosRoutes(app: FastifyInstance) {
  app.get("/kudos", { preHandler: app.auth }, async (req, reply) => {
    const items = await app.prisma.kudos.findMany({
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
    const user = req.user!;
    const member = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
    });
    if (!member)
      return reply
        .code(409)
        .send({ error: "conflict", message: "Not in a couple" });
    const kudos = await app.prisma.kudos.create({
      data: { coupleId: member.coupleId, fromId: user.id, toId, text, tags },
    });
    return reply.code(201).send(kudos);
  });
}
