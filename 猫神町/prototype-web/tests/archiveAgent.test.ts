import { describe, expect, it, vi } from "vitest";
import {
  GameEventSchema,
  GameStateSchema,
  type GameEvent,
  type GameState
} from "../packages/shared/src/index.ts";
import {
  ARCHIVE_AGENT_SYSTEM,
  ARCHIVE_AGENT_VERSION,
  buildArchiveBatch,
  mergeArchivePatch,
  validateArchivePatch,
  type ArchivePatch
} from "../server/src/archiveAgent.ts";
import { CaseDialogueProvider } from "../server/src/caseProvider.ts";
import { createInitialState, GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { showSpeech } from "./playback.ts";

function event(
  sequence: number,
  text: string,
  overrides: Partial<GameEvent> = {}
): GameEvent {
  return GameEventSchema.parse({
    id: `archive_event_${sequence}`,
    sequence,
    day: 1,
    minute: 540 + sequence,
    period: "morning",
    type: "dialogue_generated",
    actorId: "npc_koharu",
    targetId: "player",
    itemId: null,
    locationId: "loc_shrine",
    audience: ["player"],
    details: { text },
    ...overrides
  });
}

function stateWithEvents(events: GameEvent[]): GameState {
  const state = createInitialState();
  state.eventLog = events;
  return state;
}

function claim(sourceEventIds: string[], text = "明确出现的一条信息") {
  return { text, status: "reported" as const, source_event_ids: sourceEventIds };
}

function archiveCharacter(key = "npc_koharu", name = "雨宫小春") {
  return {
    key,
    name,
    identity: "寻人者",
    summary: "玩家已从现场对话中认识此人。",
    claims: [claim(["archive_event_0"])],
    related_event_keys: []
  };
}

function archiveEvent(key = "new:missing", participantKeys: string[] = ["npc_koharu"]) {
  return {
    key,
    title: "一件明确发生的事",
    summary: "事件的发生经过仍待核对。",
    status: "investigating" as const,
    participant_keys: participantKeys,
    claims: [claim(["archive_event_0"], "这件事在现场被明确提到。")]
  };
}

describe("档案官AI输入与安全校验", () => {
  it("提示词明确要求面向玩家的自然、具体档案摘要", () => {
    expect(ARCHIVE_AGENT_VERSION).toBe("archive-agent-v2-readable-dossiers");
    expect(ARCHIVE_AGENT_SYSTEM).toContain("档案是写给玩家看的");
    expect(ARCHIVE_AGENT_SYSTEM).toContain("1至3个短句");
    expect(ARCHIVE_AGENT_SYSTEM).toContain("直接写人名、物品和行动");
    expect(ARCHIVE_AGENT_SYSTEM).toContain("少用‘该人员’");
  });

  it("只摄入玩家已经看过的可归档事件，并用批次游标标记较早待整理内容", () => {
    const state = stateWithEvents([
      event(0, "小春说她看见了旧车票。"),
      event(1, "NPC私下说出不能让玩家知道的内容。", { audience: ["npc_koharu"] }),
      event(2, "玩家只是点击了人物。", { type: "encounter_started" }),
      event(3, "纱夜在玩家面前提到一份值班簿。", { actorId: "npc_saya" })
    ]);
    state.investigationArchive.cursorSequence = -1;

    const batch = buildArchiveBatch(state, 1);
    expect(batch.input.events.map(e => e.id)).toEqual(["archive_event_0"]);
    expect(JSON.stringify(batch.input)).not.toContain("不能让玩家知道");
    expect(batch.throughSequence).toBe(0);
    expect(batch.pending).toBe(true);

    const next = stateWithEvents(state.eventLog);
    next.investigationArchive.cursorSequence = batch.throughSequence;
    const nextBatch = buildArchiveBatch(next);
    expect(nextBatch.input.events.map(e => e.id)).toEqual(["archive_event_3"]);
    expect(nextBatch.throughSequence).toBe(3);
    expect(nextBatch.pending).toBe(false);
  });

  it("不因名单存在就解锁人物：本批原文必须明确出现该人物姓名", () => {
    const state = stateWithEvents([event(0, "玩家在空房间里只听见风声。", { actorId: "player", targetId: null })]);
    const input = buildArchiveBatch(state).input;
    expect(() => validateArchivePatch({
      character_updates: [archiveCharacter()],
      event_updates: []
    }, input)).toThrow("archive_unknown_character");

    state.eventLog[0]!.details.text = "雨宫小春在门外喊了一声。";
    const visibleInput = buildArchiveBatch(state).input;
    expect(validateArchivePatch({ character_updates: [archiveCharacter()], event_updates: [] }, visibleInput)).toEqual({
      character_updates: [archiveCharacter()], event_updates: []
    });
  });

  it("新人物必须在玩家可见原文中被明确提名，模糊称谓不能建档", () => {
    const state = stateWithEvents([event(0, "一个记者留下了一张名片。", { actorId: "player", targetId: null })]);
    const input = buildArchiveBatch(state).input;
    const update = archiveCharacter("new:unknown_reporter", "藤崎律");
    expect(() => validateArchivePatch({ character_updates: [update], event_updates: [] }, input)).toThrow("archive_unknown_character");

    state.eventLog[0]!.details.text = "藤崎律留下了一张名片。";
    expect(validateArchivePatch({ character_updates: [update], event_updates: [] }, buildArchiveBatch(state).input)).toEqual({
      character_updates: [update], event_updates: []
    });
  });

  it("所有claim来源必须属于本批事件，且事件参与者必须来自档案人物", () => {
    const state = stateWithEvents([event(0, "雨宫小春提到了一件事。")]);
    const input = buildArchiveBatch(state).input;
    expect(() => validateArchivePatch({
      character_updates: [{ ...archiveCharacter(), claims: [claim(["not_in_batch"])] }], event_updates: []
    }, input)).toThrow("archive_unknown_source");

    expect(() => validateArchivePatch({
      character_updates: [archiveCharacter()], event_updates: [archiveEvent("new:event", ["new:unmentioned"])]
    }, input)).toThrow("archive_invalid_link");
  });

  it("角色关联的事件键也必须有效，不能写入悬空双向链接", () => {
    const state = stateWithEvents([event(0, "雨宫小春提到了一件事。")]);
    const input = buildArchiveBatch(state).input;
    expect(() => validateArchivePatch({
      character_updates: [{ ...archiveCharacter(), related_event_keys: ["new:ghost_event"] }], event_updates: []
    }, input)).toThrow("archive_invalid_link");
  });
});

describe("档案官AI合并与去重", () => {
  it("把事件参与者反向挂回人物，并合并重复claim与关联键", () => {
    const state = stateWithEvents([event(0, "雨宫小春提到一件事。"), event(1, "雨宫小春再次提到一件事。")]);
    const batch = buildArchiveBatch(state);
    const patch: ArchivePatch = {
      character_updates: [{ ...archiveCharacter(), related_event_keys: ["new:case"] }, {
        ...archiveCharacter(), related_event_keys: ["new:case"]
      }],
      event_updates: [{
        key: "new:case", title: "同一件事", summary: "正在调查。", status: "investigating",
        participant_keys: ["npc_koharu"], claims: [claim(["archive_event_0"], "明确出现的一条信息")]
      }]
    };
    // Two updates intentionally exercise idempotent merge behavior, while the
    // second source adds evidence to the same normalized claim.
    patch.character_updates[1]!.claims = [claim(["archive_event_1"], "明确出现的一条信息")];
    const validated = validateArchivePatch(patch, batch.input);
    mergeArchivePatch(state, validated, batch);

    expect(state.investigationArchive.characters).toHaveLength(1);
    expect(state.investigationArchive.characters[0]!.claims).toHaveLength(1);
    expect(state.investigationArchive.characters[0]!.claims[0]!.sourceEventIds).toEqual(["archive_event_0", "archive_event_1"]);
    expect(state.investigationArchive.characters[0]!.relatedEventIds).toEqual(["event_case"]);
    expect(state.investigationArchive.events).toHaveLength(1);
    expect(state.investigationArchive.events[0]!.participantIds).toEqual(["npc_koharu"]);
  });
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(body) } }] }), { status });
}

describe("档案官provider与同步边界", () => {
  it("archive mode使用独立temperature/额度并通过mock fetch返回结构化档案", async () => {
    const state = stateWithEvents([event(0, "雨宫小春提到了一件事。")]);
    const patch = { character_updates: [archiveCharacter()], event_updates: [] };
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("deepseek-v4-flash");
      expect(body.temperature).toBe(0.2);
      expect(body.max_tokens).toBe(2600);
      expect(body.messages[0].content).toContain("独立的调查档案官AI");
      return response(patch);
    }) as unknown as typeof fetch;
    const provider = new CaseDialogueProvider({ apiKey: "test-only", maxAttempts: 1, fetchImpl });
    const result = await provider.summarizeArchive!(state);
    expect(result?.patch).toEqual(patch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "archive", success: true, provider: "deepseek" });
  });

  it("空API key走无网络mock分支，不伪造档案并保留待整理批次", async () => {
    const state = stateWithEvents([event(0, "雨宫小春提到了一件事。")]);
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const provider = new CaseDialogueProvider({ apiKey: "", fetchImpl });
    const result = await provider.summarizeArchive!(state);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("同步失败不丢已有档案，不消耗玩法revision，也不让心绪预览失效", async () => {
    class ArchiveProvider extends CaseDialogueProvider {
      async summarizeArchive(state: GameState) {
        return { patch: { character_updates: [], event_updates: [] }, batch: buildArchiveBatch(state) };
      }
    }
    const store = new MemoryGameStore();
    const provider = new ArchiveProvider({ apiKey: "" });
    const game = new GameService(store, provider, { heartTestPack: true });
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);
    // Opening's final beat has a heart choice in the deterministic test pack.
    await showSpeech(game);
    const before = game.getState();
    const card = before.heartCards[0]!;
    const preview = await game.previewHeart(card.id, before.revision);
    const beforeRevision = game.getState().revision;
    const synced = await game.syncInvestigationArchive(beforeRevision);
    expect(synced.state.revision).toBe(beforeRevision);
    expect(game.getState().revision).toBe(beforeRevision);
    expect(game.getState().currentDialogue).toEqual(before.currentDialogue);
    await game.useHeart(card.id, beforeRevision, preview.id);
    expect(game.getState().heartCards.some(c => c.id === card.id)).toBe(false);

    class FailingArchiveProvider extends ArchiveProvider {
      async summarizeArchive() { return null; }
    }
    const archiveState = store.load()!;
    archiveState.investigationArchive.characters = [{
      id: "npc_koharu", name: "雨宫小春", identity: "寻人者", summary: "旧档案", unlockedAtEventId: "archive_event_0", claims: [], relatedEventIds: []
    }];
    store.save(GameStateSchema.parse(archiveState));
    const failing = new GameService(store, new FailingArchiveProvider({ apiKey: "" }));
    const failed = await failing.syncInvestigationArchive(failing.getState().revision);
    expect(failed.state.investigationArchive.characters[0]!.summary).toBe("旧档案");
    expect(failed.state.investigationArchive.status).toBe("unavailable");
  });

  it("拒绝过期修订号，不调用档案官也不改档案", async () => {
    const summarizeArchive = vi.fn();
    class ArchiveProvider extends CaseDialogueProvider {
      async summarizeArchive(state: GameState) {
        summarizeArchive(state);
        return { patch: { character_updates: [], event_updates: [] }, batch: buildArchiveBatch(state) };
      }
    }
    const store = new MemoryGameStore();
    const game = new GameService(store, new ArchiveProvider({ apiKey: "" }));
    const before = game.getState();
    await expect(game.syncInvestigationArchive(before.revision - 1)).rejects.toThrow("进度已变化");
    expect(summarizeArchive).not.toHaveBeenCalled();
    expect(game.getState()).toEqual(before);
  });
});

describe("旧存档档案默认迁移", () => {
  it("缺少investigationArchive时补空档案，不重置其他进度", () => {
    const old = createInitialState() as unknown as Record<string, unknown>;
    delete old.investigationArchive;
    old.currentMinute = 777;
    const migrated = GameStateSchema.parse(old);
    expect(migrated.currentMinute).toBe(777);
    expect(migrated.investigationArchive).toEqual({
      cursorSequence: -1, status: "idle", promptVersion: "", pending: false, characters: [], events: []
    });
  });
});
