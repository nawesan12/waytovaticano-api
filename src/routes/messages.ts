import type { FastifyInstance } from "fastify";
import { encodeCursor, decodeCursor } from "../utils/pagination";

export default async function messageRoutes(app: FastifyInstance) {
  app.get("/messages", { preHandler: app.auth }, async (req, reply) => {
    const cur = decodeCursor<{ createdAt: string }>((req.query as any).cursor);
    const take = 25;
    const items = await app.prisma.message.findMany({
      take: take + 1,
      where: {},
      orderBy: { createdAt: "desc" },
      ...(cur && { cursor: { createdAt: new Date(cur.createdAt) }, skip: 1 }),
    });
    const hasMore = items.length > take;
    const page = items.slice(0, take);
    return reply.send({
      items: page,
      meta: {
        nextCursor: hasMore
          ? encodeCursor({ createdAt: page.at(-1)!.createdAt })
          : null,
      },
    });
  });

  app.post("/messages", { preHandler: app.auth }, async (req, reply) => {
    const user = (req as any).user;
    const { toId, kind = "ping", text, push = true } = (req.body as any) ?? {};
    const member = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
    });
    if (!member)
      return reply
        .code(409)
        .send({ error: "conflict", message: "Not in a couple" });
    const msg = await app.prisma.message.create({
      data: { coupleId: member.coupleId, fromId: user.id, toId, kind, text },
    });
    // TODO: enqueue Expo push (optional)
    return reply.code(201).send(msg);
  });
}
