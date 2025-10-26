import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../env";
import type { AuthenticatedUser } from "./types";

const JWKS = env.SUPABASE_JWKS_URL
  ? createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL))
  : null;

export async function authHook(req: FastifyRequest, reply: FastifyReply) {
  if (!JWKS) {
    req.log.error("Supabase JWKS URL not configured");
    return reply
      .code(500)
      .send({
        error: "server_error",
        message: "Authentication is not configured",
      });
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return reply
      .code(401)
      .send({ error: "unauthorized", message: "Missing token" });
  const token = auth.slice(7);
  const jwks = JWKS;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.SUPABASE_JWT_ISSUER,
      audience: env.SUPABASE_JWT_AUDIENCE,
    });
    const user: AuthenticatedUser = {
      id: String(payload.sub),
      email: String(payload.email ?? ""),
    };
    req.user = user;
  } catch (e) {
    return reply
      .code(401)
      .send({ error: "unauthorized", message: "Invalid token" });
  }
}
