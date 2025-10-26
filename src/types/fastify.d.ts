import type { PrismaClient } from "@prisma/client";
import type { authHook } from "../auth/supabase-jwt";
import type { AuthenticatedUser } from "../auth/types";
import type { confirmQuestEntry } from "../services/gamification";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    auth: typeof authHook;
    services: {
      confirmQuestEntry: typeof confirmQuestEntry;
    };
  }
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
