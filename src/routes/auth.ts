import type { FastifyInstance } from "fastify";
import { requireUser } from "../auth/utils";

export default async function authRoutes(app: FastifyInstance) {
  app.get("/auth/me", { preHandler: app.auth }, async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    const membership = await app.prisma.coupleMember.findFirst({
      where: { userId: user.id }, //@ts-expect-error bla
      include: { couple: true },
    });
    return reply.send({
      user, //@ts-expect-error bla
      couple: membership?.couple ?? null,
      membership: membership ? { role: membership.role } : null,
    });
  });
}
