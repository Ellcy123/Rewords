import cors from "@fastify/cors";
import dotenv from "dotenv";
import Fastify from "fastify";
import { fileURLToPath } from "node:url";
import {
  DemoBootstrapSchema,
  DialogueChoiceRequestSchema,
  GiftRequestSchema,
  InteractionModeRequestSchema,
  RuleChangeRequestSchema,
  TravelRequestSchema,
  demoBootstrap
} from "../../packages/shared/src/index.ts";
import { GameRuleError, GameService } from "./gameService.ts";
import { CaseDialogueProvider, CASE_PROMPT_STRUCTURE, CASE_PROMPT_VERSION } from "./caseProvider.ts";
import { z } from "zod";
import { SqliteGameStore } from "./persistence.ts";

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true });
const app = Fastify({ logger: true });
const dialogueProvider = new CaseDialogueProvider();
const gameService = new GameService(new SqliteGameStore(), dialogueProvider);
let gameActionQueue: Promise<void> = Promise.resolve();

await app.register(cors, {
  origin: true
});

app.get("/api/health", async () => ({
  ok: true,
  provider: dialogueProvider.getStatus().provider,
  phase: demoBootstrap.meta.phase
}));

app.get("/api/ai/status", async () => dialogueProvider.getStatus());

app.get("/api/ai/logs", async () => dialogueProvider.getLogs());

app.get("/api/ai/prompt-structure", async () => ({
  npcId: "all_demo_npcs",
  promptVersion: CASE_PROMPT_VERSION,
  layers: CASE_PROMPT_STRUCTURE
}));

app.get("/api/bootstrap", async () => DemoBootstrapSchema.parse(demoBootstrap));

app.get("/api/game/state", async () => gameService.getState());

app.post("/api/game/reset", async (_request, reply) =>
  runGameAction(() => gameService.reset(), reply)
);

function parseBody<T>(schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: { issues: unknown } } }, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new GameRuleError(`请求数据无效：${JSON.stringify(parsed.error.issues)}`);
  }
  return parsed.data;
}

function enqueueGameAction<T>(action: () => T | Promise<T>): Promise<T> {
  const pending = gameActionQueue.then(action);
  gameActionQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

async function runGameAction(action: () => unknown | Promise<unknown>, reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  try {
    return await enqueueGameAction(action);
  } catch (error) {
    if (error instanceof GameRuleError) {
      return reply.status(409).send({ error: "game_rule_error", message: error.message });
    }
    throw error;
  }
}

app.post("/api/game/travel", async (request, reply) =>
  runGameAction(() => {
    const body = parseBody(TravelRequestSchema, request.body);
    return gameService.travel(body.locationId);
  }, reply)
);

app.post("/api/game/start-encounter", async (request, reply) =>
  runGameAction(() => gameService.startEncounter(parseBody(z.object({ npcId: z.string().min(1) }), request.body).npcId), reply)
);

app.post("/api/game/next-beat", async (_request, reply) => runGameAction(() => gameService.nextDialogueBeat(), reply));
app.post("/api/game/inspect", async (request, reply) => runGameAction(() => {
  const b = parseBody(z.object({ itemId: z.string(), take: z.boolean().default(false) }), request.body);
  return gameService.inspectItem(b.itemId, b.take);
}, reply));
app.post("/api/game/present", async (request, reply) => runGameAction(() =>
  gameService.presentEvidence(parseBody(GiftRequestSchema, request.body).itemId), reply));
app.post("/api/game/tell-retraction", async (_request, reply) => runGameAction(() => gameService.tellRetraction(), reply));
app.post("/api/game/incident-choice", async (request, reply) => runGameAction(() =>
  gameService.resolvePlayerIncident(parseBody(DialogueChoiceRequestSchema, request.body).optionId), reply));
app.post("/api/game/wait", async (request, reply) => runGameAction(() =>
  gameService.wait(parseBody(z.object({ minutes: z.number().int().min(1).max(120) }), request.body).minutes), reply));

app.post("/api/game/leave-location", async (_request, reply) =>
  runGameAction(() => gameService.leaveLocation(), reply)
);

app.post("/api/game/wait-until-night", async (_request, reply) =>
  runGameAction(() => gameService.waitUntilNight(), reply)
);

app.post("/api/game/interaction-mode", async (request, reply) =>
  runGameAction(() => {
    const body = parseBody(InteractionModeRequestSchema, request.body);
    return gameService.selectInteractionMode(body.mode);
  }, reply)
);

app.post("/api/game/cancel-interaction-mode", async (_request, reply) =>
  runGameAction(() => gameService.cancelInteractionMode(), reply)
);

app.post("/api/game/dialogue-choice", async (request, reply) =>
  runGameAction(() => {
    const body = parseBody(DialogueChoiceRequestSchema, request.body);
    return gameService.chooseTalkOption(body.optionId);
  }, reply)
);

app.post("/api/game/gift", async (request, reply) =>
  runGameAction(() => {
    const body = parseBody(GiftRequestSchema, request.body);
    return gameService.confirmGift(body.itemId);
  }, reply)
);

app.post("/api/game/gift-response", async (request, reply) =>
  runGameAction(() => {
    const body = parseBody(DialogueChoiceRequestSchema, request.body);
    return gameService.respondToGift(body.optionId);
  }, reply)
);

app.post("/api/game/complete-encounter", async (_request, reply) =>
  runGameAction(() => gameService.completeEncounter(), reply)
);

app.post("/api/game/rule", async (request, reply) =>
  runGameAction(() => {
    const body = parseBody(RuleChangeRequestSchema, request.body);
    return gameService.changeRule(body.slotId, body.itemId);
  }, reply)
);

app.post("/api/game/end-day", async (_request, reply) =>
  runGameAction(() => gameService.endDay(), reply)
);

const port = Number(process.env.PORT ?? 8787);

try {
  await app.listen({ host: "127.0.0.1", port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
