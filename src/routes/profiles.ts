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
    const user = req.user!;
    const profile = await app.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });
    return reply.send(profile ?? {});
  });

  app.put("/profiles/me", { preHandler: app.auth }, async (req, reply) => {
    const data = Profile.parse(req.body ?? {});
    const user = req.user!;
    const payload = {
      ...data,
      birthday: normalizeDate(data.birthday),
      favorites: normalizeJson(data.favorites),
      dislikes: normalizeJson(data.dislikes),
    };
    const saved = await app.prisma.userProfile.upsert({
      where: { userId: user.id },
      update: payload,
      create: { userId: user.id, ...payload },
    });
    return reply.send(saved);
  });
}

function normalizeJson(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === null) return Prisma.JsonNull;
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

function normalizeDate(value: string | null | undefined) {
  if (value === null) return null;
  if (!value) return undefined;
  return new Date(value);
}
