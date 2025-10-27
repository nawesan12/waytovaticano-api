import type { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/utils";

export default async function questRoutes(app: FastifyInstance) {
  app.get("/quests", { preHandler: app.auth }, async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    const member = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
    });
    if (!member)
      return reply
        .code(409)
        .send({ error: "conflict", message: "Not in a couple" });
    const items = await app.prisma.quest.findMany({
      where: { coupleId: member.coupleId, isActive: true },
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
    const user = requireUser(req, reply);
    if (!user) return;
    const member = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
    });
    if (!member)
      return reply
        .code(409)
        .send({ error: "conflict", message: "Not in a couple" });
    if (member.coupleId !== body.coupleId)
      return reply
        .code(403)
        .send({
          error: "forbidden",
          message: "Cannot create quests for another couple",
        });
    const { coupleId, ...questPayload } = body;
    const {
      title,
      description,
      schedule,
      assignedTo,
      xpReward,
      heartReward,
      requiresConfirm,
    } = questPayload;
    const questData: Prisma.QuestCreateInput = {
      title,
      description,
      schedule,
      assignedTo,
      xpReward,
      heartReward,
      requiresConfirm,
      couple: { connect: { id: member.coupleId } },
    };
    const q = await app.prisma.quest.create({
      data: questData,
    });
    return reply.code(201).send(q);
  });

  app.post(
    "/quests/:questId/entries",
    { preHandler: app.auth },
    async (req, reply) => {
      const { questId } = req.params as any;
      const { note, photoUrl } = (req.body as any) ?? {};
      const user = requireUser(req, reply);
      if (!user) return;
      const member = await app.prisma.coupleMember.findFirst({
        where: { userId: user.id },
      });
      if (!member)
        return reply
          .code(409)
          .send({ error: "conflict", message: "Not in a couple" });
      const quest = await app.prisma.quest.findUnique({ where: { id: questId } });
      if (!quest || quest.coupleId !== member.coupleId)
        return reply
          .code(404)
          .send({ error: "not_found", message: "Quest" });
      const entry = await app.prisma.questEntry.create({
        data: { questId: quest.id, doneBy: user.id, note, photoUrl },
      });
      return reply.code(201).send(entry);
    },
  );

  app.post(
    "/entries/:entryId/confirm",
    { preHandler: app.auth },
    async (req, reply) => {
      const { entryId } = req.params as any;
      const user = requireUser(req, reply);
      if (!user) return;
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
