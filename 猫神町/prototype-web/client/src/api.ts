import {
  DemoBootstrapSchema,
  AiLogEntrySchema,
  AiPromptStructureSchema,
  AiProviderStatusSchema,
  GameActionResponseSchema,
  GameStateSchema,
  type DemoBootstrap,
  type AiLogEntry,
  type AiPromptStructure,
  type AiProviderStatus,
  type GameActionResponse,
  type GameState,
  type InteractionMode,
  type RuleSlotId
} from "../../packages/shared/src/index.ts";

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { message?: string };
    return body.message ?? `请求失败（HTTP ${response.status}）`;
  } catch {
    return `请求失败（HTTP ${response.status}）`;
  }
}

async function request<T>(path: string, schema: { parse: (input: unknown) => T }, body?: unknown): Promise<T> {
  let response: Response | undefined;
  // Only retry idempotent reads during the local dev server's hot-restart window.
  // Never replay a gift, choice or time-consuming action.
  for (let attempt = 0; attempt < (body === undefined ? 4 : 1); attempt++) {
    try {
      response = await fetch(path, {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (response.status < 500 || body !== undefined) break;
    } catch (e) { if (body !== undefined || attempt === 3) throw e; }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
  }
  if (!response) throw new Error("服务暂时不可用，请稍后刷新。");
  if (!response.ok) throw new Error(await readError(response));
  return schema.parse(await response.json());
}

export const gameApi = {
  bootstrap: (): Promise<DemoBootstrap> => request("/api/bootstrap", DemoBootstrapSchema),
  state: (): Promise<GameState> => request("/api/game/state", GameStateSchema),
  aiStatus: (): Promise<AiProviderStatus> => request("/api/ai/status", AiProviderStatusSchema),
  aiLogs: (): Promise<AiLogEntry[]> => request("/api/ai/logs", AiLogEntrySchema.array()),
  aiPromptStructure: (): Promise<AiPromptStructure> =>
    request("/api/ai/prompt-structure", AiPromptStructureSchema),
  reset: (): Promise<GameActionResponse> => request("/api/game/reset", GameActionResponseSchema, {}),
  travel: (locationId: string): Promise<GameActionResponse> =>
    request("/api/game/travel", GameActionResponseSchema, { locationId }),
  startEncounter: (npcId: string): Promise<GameActionResponse> =>
    request("/api/game/start-encounter", GameActionResponseSchema, { npcId }),
  nextBeat: (): Promise<GameActionResponse> => request("/api/game/next-beat", GameActionResponseSchema, {}),
  inspect: (itemId: string, take = false): Promise<GameActionResponse> => request("/api/game/inspect", GameActionResponseSchema, { itemId, take }),
  present: (itemId: string): Promise<GameActionResponse> => request("/api/game/present", GameActionResponseSchema, { itemId }),
  tellRetraction: (): Promise<GameActionResponse> => request("/api/game/tell-retraction", GameActionResponseSchema, {}),
  incidentChoice: (optionId: string): Promise<GameActionResponse> => request("/api/game/incident-choice", GameActionResponseSchema, { optionId }),
  wait: (minutes = 30): Promise<GameActionResponse> => request("/api/game/wait", GameActionResponseSchema, { minutes }),
  leaveLocation: (): Promise<GameActionResponse> =>
    request("/api/game/leave-location", GameActionResponseSchema, {}),
  waitUntilNight: (): Promise<GameActionResponse> =>
    request("/api/game/wait-until-night", GameActionResponseSchema, {}),
  selectMode: (mode: InteractionMode): Promise<GameActionResponse> =>
    request("/api/game/interaction-mode", GameActionResponseSchema, { mode }),
  cancelMode: (): Promise<GameActionResponse> =>
    request("/api/game/cancel-interaction-mode", GameActionResponseSchema, {}),
  chooseTalk: (optionId: string): Promise<GameActionResponse> =>
    request("/api/game/dialogue-choice", GameActionResponseSchema, { optionId }),
  gift: (itemId: string): Promise<GameActionResponse> =>
    request("/api/game/gift", GameActionResponseSchema, { itemId }),
  answerGift: (optionId: string): Promise<GameActionResponse> =>
    request("/api/game/gift-response", GameActionResponseSchema, { optionId }),
  completeEncounter: (): Promise<GameActionResponse> =>
    request("/api/game/complete-encounter", GameActionResponseSchema, {}),
  changeRule: (slotId: RuleSlotId, itemId: string): Promise<GameActionResponse> =>
    request("/api/game/rule", GameActionResponseSchema, { slotId, itemId }),
  endDay: (): Promise<GameActionResponse> =>
    request("/api/game/end-day", GameActionResponseSchema, {})
};
