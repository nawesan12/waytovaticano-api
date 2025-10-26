import type { FastifyInstance } from "fastify";
import { requireUser } from "../auth/utils";
import { encodeCursor, decodeCursor } from "../utils/pagination";

export default async function messageRoutes(app: FastifyInstance) {
  app.get("/messages", { preHandler: app.auth }, async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    const member = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
    });
    if (!member)
      return reply
        .code(409)
        .send({ error: "conflict", message: "Not in a couple" });
    const cur = decodeCursor<{ id: string; createdAt: string }>(
      (req.query as any).cursor,
    );
    const take = 25;
    const items = await app.prisma.message.findMany({
      take: take + 1,
      where: { coupleId: member.coupleId },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      ...(cur && { cursor: { id: cur.id }, skip: 1 }),
    });
    const hasMore = items.length > take;
    const page = items.slice(0, take);
    return reply.send({
      items: page,
      meta: {
        nextCursor:
          hasMore && page.length
            ? encodeCursor({
                id: page.at(-1)!.id,
                createdAt: page.at(-1)!.createdAt.toISOString(),
              })
            : null,
      },
    });
  });

  app.post("/messages", { preHandler: app.auth }, async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
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
