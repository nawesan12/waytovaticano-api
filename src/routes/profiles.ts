import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const Profile = z.object({
  birthday: z.string().date().nullable().optional().or(z.string().optional()),
  favorites: z.record(z.any()).nullish(),
  dislikes: z.record(z.any()).nullish(),
  allergies: z.array(z.string()).default([]),
  loveLanguages: z.array(z.string()).default([]),
  hobbies: z.array(z.string()).default([]),
  noGoList: z.array(z.string()).default([]),
  aboutMe: z.string().nullish(),
});

export default async function profileRoutes(app: FastifyInstance) {
  app.get("/profiles/me", { preHandler: app.auth }, async (req, reply) => {
    const user = req.user;
    const profile = await app.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });
    return reply.send(profile ?? {});
  });

  app.put("/profiles/me", { preHandler: app.auth }, async (req, reply) => {
    const data = Profile.parse(req.body ?? {});
    const user = req.user;
    const toJson = (value: unknown) => {
      if (value === undefined) return undefined;
      if (value === null) return Prisma.JsonNull;
      return value as Prisma.InputJsonValue;
    };
    const payload = {
      ...data,
      favorites: toJson(data.favorites),
      dislikes: toJson(data.dislikes),
    };
    const saved = await app.prisma.userProfile.upsert({
      where: { userId: user.id },
      update: payload,
      create: { userId: user.id, ...payload },
    });
    return reply.send(saved);
  });
}
