import cors from "@fastify/cors";
import dotenv from "dotenv";
import Fastify from "fastify";
import { fileURLToPath } from "node:url";
import {
  DemoBootstrapSchema,
  DialogueChoiceRequestSchema,
  DialogueRequestSchema,
  GiftRequestSchema,
  InteractionModeRequestSchema,
  RuleChangeRequestSchema,
  TravelRequestSchema,
  demoBootstrap
} from "../../packages/shared/src/index.ts";
import { GameRuleError, GameService } from "./gameService.ts";
import { DialogueProviderRouter } from "./dialogueProvider.ts";
import { createMockDialogue } from "./mockDialogueProvider.ts";
import { SqliteGameStore } from "./persistence.ts";
import { SAYA_PROMPT_STRUCTURE, SAYA_PROMPT_VERSION } from "./prompts/sayaPrompt.ts";
import { DAY4_PROMPT_STRUCTURE, THEOLOGY_PROMPT_VERSION } from "./prompts/theologyPrompt.ts";
import { ENDING_PROMPT_VERSION } from "./prompts/endingPrompt.ts";

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true });
const app = Fastify({ logger: true });
const dialogueProvider = new DialogueProviderRouter();
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
  promptVersion: `multi:${SAYA_PROMPT_VERSION}+${THEOLOGY_PROMPT_VERSION}+${ENDING_PROMPT_VERSION}`,
  layers: [...new Set([...SAYA_PROMPT_STRUCTURE, ...DAY4_PROMPT_STRUCTURE, "第七天事实摘要与动态结局"])]
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

app.post("/api/game/start-encounter", async (_request, reply) =>
  runGameAction(() => gameService.startEncounter(), reply)
);

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
