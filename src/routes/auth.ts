import type { FastifyInstance } from "fastify";
export default async function authRoutes(app: FastifyInstance) {
  app.get("/auth/me", { preHandler: app.auth }, async (req, reply) => {
    const user = req.user!;
    const membership = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id },
      include: { Couple: true },
    });
    return reply.send({
      user,
      couple: membership?.Couple ?? null,
      membership: membership ? { role: membership.role } : null,
    });
  });
}
