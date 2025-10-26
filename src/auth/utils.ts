import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "./types";

export function requireUser(
  req: FastifyRequest,
  reply: FastifyReply,
): AuthenticatedUser | null {
  const user = req.user ?? null;
  if (!user) {
    reply
      .code(500)
      .send({ error: "server_error", message: "Missing user context" });
    return null;
  }
  return user;
}
