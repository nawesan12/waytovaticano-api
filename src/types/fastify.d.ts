import type { authHook } from "../auth/supabase-jwt";
import type { confirmQuestEntry } from "../services/gamification";
import type { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    auth: typeof authHook;
    services: {
      confirmQuestEntry: typeof confirmQuestEntry;
    };
  }

  interface FastifyRequest {
    user: {
      id: string;
      email: string;
    };
  }
}
