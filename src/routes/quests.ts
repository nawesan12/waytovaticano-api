import type { FastifyInstance } from "fastify";
import { z } from "zod";

export default async function questRoutes(app: FastifyInstance) {
  app.get("/quests", { preHandler: app.auth }, async (req, reply) => {
    const items = await app.prisma.quest.findMany({
      where: { isActive: true },
    });
    return reply.send(items);
  });

  const QuestBody = z.object({
    coupleId: z.string(),
    title: z.string().min(2),
    description: z.string().optional(),
    schedule: z.string().optional(),
    assignedTo: z.string().optional(),
    xpReward: z.number().int().default(10),
    heartReward: z.number().int().default(1),
    requiresConfirm: z.boolean().default(true),
  });

  app.post("/quests", { preHandler: app.auth }, async (req, reply) => {
    const body = QuestBody.parse(req.body ?? {});
    const q = await app.prisma.quest.create({ data: body });
    return reply.code(201).send(q);
  });

  app.post(
    "/quests/:questId/entries",
    { preHandler: app.auth },
    async (req, reply) => {
      const { questId } = req.params as any;
      const { note, photoUrl } = (req.body as any) ?? {};
      const user = req.user;
      const entry = await app.prisma.questEntry.create({
        data: { questId, doneBy: user.id, note, photoUrl },
      });
      return reply.code(201).send(entry);
    },
  );

  app.post(
    "/entries/:entryId/confirm",
    { preHandler: app.auth },
    async (req, reply) => {
      const { entryId } = req.params as any;
      const user = req.user;
      const entry = await app.services.confirmQuestEntry(entryId, user.id);
      const quest = await app.prisma.quest.findUnique({
        where: { id: entry.questId },
      });
      const stats = await app.prisma.coupleStats.findUnique({
        where: { coupleId: quest!.coupleId },
      });
      return reply.send({ entry, stats });
    },
  );
}
