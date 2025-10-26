import Fastify from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { env } from "./env";
import { db } from "./db/client";
import { authHook } from "./auth/supabase-jwt";
import authRoutes from "./routes/auth";
import coupleRoutes from "./routes/couple";
import profileRoutes from "./routes/profiles";
import questRoutes from "./routes/quests";
import kudosRoutes from "./routes/kudos";
import messageRoutes from "./routes/messages";
import loveBankRoutes from "./routes/love-bank";
import * as gamification from "./services/gamification";

const app = Fastify({ logger: true });

// Decorators (DI-lite)
app.decorate("prisma", prisma);
app.decorate("auth", authHook);
app.decorate("services", { confirmQuestEntry: gamification.confirmQuestEntry });

await app.register(sensible);
await app.register(cors, { origin: true });
await app.register(swagger, {
  openapi: { info: { title: "Couple RPG API", version: "1.0.0" } },
});
await app.register(swaggerUI, { routePrefix: "/docs" });

await app.register(authRoutes);
await app.register(coupleRoutes);
await app.register(profileRoutes);
await app.register(questRoutes);
await app.register(kudosRoutes);
await app.register(messageRoutes);
await app.register(loveBankRoutes);

app.get("/health", async () => ({ ok: true }));

app.listen({ port: env.PORT, host: "0.0.0.0" }).then(() => {
  app.log.info(`Listening on http://localhost:${env.PORT}`);
});
