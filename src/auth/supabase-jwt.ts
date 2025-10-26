import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../env";

const JWKS = env.SUPABASE_JWKS_URL
  ? createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL))
  : undefined;

export async function authHook(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return reply
      .code(401)
      .send({ error: "unauthorized", message: "Missing token" });
  const token = auth.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS!, {
      issuer: env.SUPABASE_JWT_ISSUER,
      audience: env.SUPABASE_JWT_AUDIENCE,
    });
    req.user = {
      id: String(payload.sub),
      email: String(payload.email ?? ""),
    };
  } catch (e) {
    return reply
      .code(401)
      .send({ error: "unauthorized", message: "Invalid token" });
  }
}
