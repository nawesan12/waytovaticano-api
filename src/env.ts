export const env = {
  PORT: Number(process.env.PORT ?? 8787),
  DATABASE_URL: process.env.DATABASE_URL!,
  SUPABASE_JWT_AUDIENCE: process.env.SUPABASE_JWT_AUDIENCE ?? "authenticated",
  SUPABASE_JWT_ISSUER: process.env.SUPABASE_JWT_ISSUER ?? "",
  SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL ?? "",
  DIRECT_URL: process.env.DIRECT_URL ?? "",
};
