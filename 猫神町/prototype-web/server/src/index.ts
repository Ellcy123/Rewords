import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  DemoBootstrapSchema,
  DialogueRequestSchema,
  demoBootstrap
} from "../../packages/shared/src/index.ts";
import { createMockDialogue } from "./mockDialogueProvider.ts";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true
});

app.get("/api/health", async () => ({
  ok: true,
  provider: "mock",
  phase: demoBootstrap.meta.phase
}));

app.get("/api/bootstrap", async () => DemoBootstrapSchema.parse(demoBootstrap));

app.post("/api/dialogue/mock", async (request, reply) => {
  const parsed = DialogueRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      error: "invalid_dialogue_request",
      issues: parsed.error.issues
    });
  }

  return createMockDialogue(parsed.data);
});

const port = Number(process.env.PORT ?? 8787);

try {
  await app.listen({ host: "127.0.0.1", port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

