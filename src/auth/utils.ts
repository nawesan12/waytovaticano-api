import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "./types";

export function requireUser(
  req: FastifyRequest,
  reply: FastifyReply,
): AuthenticatedUser | null {
  const user = req.user ?? null;
  if (!user) {
    reply
      .code(401)
      .send({ error: "unauthorized", message: "Missing user context" });
    return null;
  }
  return user;
}
