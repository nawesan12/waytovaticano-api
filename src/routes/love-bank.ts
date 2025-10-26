import type { FastifyInstance } from "fastify";
import { z } from "zod";

export default async function loveBankRoutes(app: FastifyInstance) {
  app.get(
    "/love-bank/rewards",
    { preHandler: app.auth },
    async (req, reply) => {
      const rewards = await app.prisma.reward.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
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
      const reward = await app.prisma.reward.create({ data: body });
      reply.code(201).send(reward);
    },
  );
  app.post(
    "/love-bank/redeem",
    { preHandler: app.auth },
    async (req, reply) => {
      const { rewardId } = (req.body as any) ?? {};
      const reward = await app.prisma.reward.findUnique({
        where: { id: rewardId },
      });
      if (!reward)
        return reply.code(404).send({ error: "not_found", message: "Reward" });
      // Minimal spend check: ensure hearts >= cost
      const member = await app.prisma.coupleMember.findFirst({
        where: { userId: req.user.id },
      });
      if (!member)
        return reply
          .code(409)
          .send({ error: "conflict", message: "Not in a couple" });
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
          rewardId: reward.id,
          coupleId: member.coupleId,
          claimedBy: req.user.id,
          status: "pending",
        },
      });
      reply.code(201).send(redemption);
    },
  );
}
