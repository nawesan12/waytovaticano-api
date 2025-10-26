import type { FastifyInstance } from "fastify";
import { z } from "zod";

export default async function loveBankRoutes(app: FastifyInstance) {
  app.get(
    "/love-bank/rewards",
    { preHandler: app.auth },
    async (req, reply) => {
      const user = (req as any).user;
      const member = await app.prisma.coupleMember.findFirst({
        where: { userId: user.id },
      });
      if (!member)
        return reply
          .code(409)
          .send({ error: "conflict", message: "Not in a couple" });
      const rewards = await app.prisma.reward.findMany({
        where: { coupleId: member.coupleId, active: true },
        orderBy: { createdAt: "asc" },
      });
      reply.send(rewards);
    },
  );
  const RewardBody = z.object({
    title: z.string(),
    costHearts: z.number().int().positive(),
    description: z.string().optional(),
    active: z.boolean().default(true),
  });
  app.post(
    "/love-bank/rewards",
    { preHandler: app.auth },
    async (req, reply) => {
      const body = RewardBody.parse(req.body ?? {});
      const user = (req as any).user;
      const member = await app.prisma.coupleMember.findFirst({
        where: { userId: user.id },
      });
      if (!member)
        return reply
          .code(409)
          .send({ error: "conflict", message: "Not in a couple" });
      const reward = await app.prisma.reward.create({
        data: { ...body, coupleId: member.coupleId },
      });
      reply.code(201).send(reward);
    },
  );
  app.post(
    "/love-bank/redeem",
    { preHandler: app.auth },
    async (req, reply) => {
      const { rewardId } = (req.body as any) ?? {};
      const user = (req as any).user;
      const member = await app.prisma.coupleMember.findFirst({
        where: { userId: user.id },
      });
      if (!member)
        return reply
          .code(409)
          .send({ error: "conflict", message: "Not in a couple" });
      const reward = await app.prisma.reward.findFirst({
        where: { id: rewardId, coupleId: member.coupleId, active: true },
      });
      if (!reward)
        return reply.code(404).send({ error: "not_found", message: "Reward" });
      // Minimal spend check: ensure hearts >= cost
      const stats = await app.prisma.coupleStats.findUnique({
        where: { coupleId: member.coupleId },
      });
      if ((stats?.hearts ?? 0) < reward.costHearts)
        return reply
          .code(402)
          .send({ error: "payment_required", message: "Not enough hearts" });
      await app.prisma.coupleStats.update({
        where: { coupleId: member.coupleId },
        data: { hearts: { decrement: reward.costHearts } },
      });
      const redemption = await app.prisma.redemption.create({
        data: {
          coupleId: member.coupleId,
          rewardId: reward.id,
          claimedBy: user.id,
          status: "pending",
        },
      });
      reply.code(201).send(redemption);
    },
  );
}
