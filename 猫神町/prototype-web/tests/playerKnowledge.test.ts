import { describe, expect, it } from "vitest";
import { DialogueResultSchema, demoBootstrap, type DialogueResult, type GameState } from "../packages/shared/src/index.ts";
import { CaseDialogueProvider, buildCasePrompt, type CaseContext } from "../server/src/caseProvider.ts";
import { evidence, facts } from "../server/src/caseData.ts";
import { GameService, createInitialState } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import type { HeartContext } from "../server/src/heartDialogue.ts";

class DisclosureProvider extends CaseDialogueProvider {
  constructor(private readonly disclosedFacts: string[], private readonly usedFacts = disclosedFacts) {
    super({ apiKey: "" });
  }

  async generate(context: CaseContext): Promise<DialogueResult> {
    return DialogueResultSchema.parse({
      speakerId: context.npcId,
      line: "我把那两张离开的车票一直留着。",
      emotion: "克制",
      continuations: [{ speakerId: context.npcId, line: "本来是姐姐和我一起离开猫神町用的。", emotion: "难过" }],
      options: [],
      debug: {
        provider: "mock",
        decision: "测试玩家知识仅在本段完整播放后结算。",
        usedFacts: this.usedFacts,
        disclosedFacts: this.disclosedFacts
      }
    });
  }
}

class HeartDisclosureProvider extends CaseDialogueProvider {
  constructor(private readonly disclosures: { factId: string; beatIndex: number }[] = []) {
    super({ apiKey: "" });
  }

  async generateHearts(context: HeartContext): Promise<DialogueResult> {
    return DialogueResultSchema.parse({
      speakerId: context.npcId,
      line: "我先把能说的说清楚。",
      emotion: "认真",
      continuations: [
        { speakerId: context.npcId, line: "姐姐原本想带我一起离开。", emotion: "认真" },
        { speakerId: context.npcId, line: "这件事我还没有告诉别人。", emotion: "迟疑" },
        { speakerId: context.npcId, line: "现在我愿意把它交给你知道。", emotion: "克制" }
      ],
      options: [],
      heart: { canContinue: true, choicePoint: { quote: "现在我愿意把它交给你知道。", reason: "小春等待遥回应这件事。" }, consequence: null, actionPlan: null, pickups: [] },
      debug: {
        provider: "mock",
        decision: "测试心绪段内事实揭露游标。",
        usedFacts: ["F02", "F09"],
        disclosedFacts: ["F02", "F09"],
        disclosures: this.disclosures
      }
    });
  }
}

function service(state = createInitialState(), provider = new DisclosureProvider(["F02"])) {
  const store = new MemoryGameStore();
  store.save(state);
  return { store, game: new GameService(store, provider) };
}

describe("player knowledge ledger", () => {
  it("starts a new investigation with only the opening fact F01", () => {
    expect(createInitialState().playerKnownFactIds).toEqual(["F01"]);
  });

  it("migrates an old save by retaining only certain visible knowledge", () => {
    const legacy = structuredClone(createInitialState()) as Record<string, unknown>;
    delete legacy.playerKnownFactIds;
    legacy.evidenceJournal = [{ id: "E09", name: "录音备份", text: evidence.E09.text, source: evidence.E09.source, day: 1 }];
    const store = new MemoryGameStore();
    store.save(legacy as GameState);

    const migrated = new GameService(store).getState();
    expect(migrated.playerKnownFactIds).toEqual(expect.arrayContaining(["F01", "F03", "F12"]));
    expect(migrated.playerKnownFactIds).not.toContain("F08");
    expect(store.load()!.playerKnownFactIds).toEqual(migrated.playerKnownFactIds);
  });

  it("records exactly the facts attached to evidence when the player reads it", () => {
    const state = createInitialState();
    state.discoveredLocationIds.push("loc_home");
    const { game, store } = service(state);
    game.travel("loc_home");
    game.inspectItem("E09");

    expect(store.load()!.playerKnownFactIds).toEqual(expect.arrayContaining(["F01", "F03", "F12"]));
    expect(store.load()!.playerKnownFactIds).not.toContain("F08");
  });

  it("writes old unanchored dialogue facts only after the final spoken beat is played", async () => {
    const { game, store } = service();
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.selectInteractionMode("talk");

    expect(store.load()!.playerKnownFactIds).toEqual(["F01"]);
    await game.nextDialogueBeat();
    expect(store.load()!.playerKnownFactIds).toEqual(expect.arrayContaining(["F01", "F02"]));
  });

  it("writes anchored heart disclosures when their NPC beat is played", async () => {
    const state = createInitialState();
    const { game, store } = service(state, new HeartDisclosureProvider([
      { factId: "F02", beatIndex: 1 },
      { factId: "F09", beatIndex: 3 }
    ]));
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);

    expect(store.load()!.playerKnownFactIds).toEqual(["F01"]);
    await game.nextDialogueBeat(game.getState().revision);
    expect(store.load()!.playerKnownFactIds).toEqual(expect.arrayContaining(["F01", "F02"]));
    expect(store.load()!.playerKnownFactIds).not.toContain("F09");
    await game.nextDialogueBeat(game.getState().revision);
    expect(store.load()!.playerKnownFactIds).not.toContain("F09");
    await game.nextDialogueBeat(game.getState().revision);
    expect(store.load()!.playerKnownFactIds).toEqual(expect.arrayContaining(["F01", "F02", "F09"]));
  });

  it("keeps legacy heart disclosures unanchored until the segment ends", async () => {
    const state = createInitialState();
    const { game, store } = service(state, new HeartDisclosureProvider());
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.startHeartEncounter(game.getState().revision);

    expect(store.load()!.playerKnownFactIds).toEqual(["F01"]);
    await game.nextDialogueBeat(game.getState().revision);
    expect(store.load()!.playerKnownFactIds).toEqual(["F01"]);
    await game.nextDialogueBeat(game.getState().revision);
    expect(store.load()!.playerKnownFactIds).toEqual(["F01"]);
    await game.nextDialogueBeat(game.getState().revision);
    expect(store.load()!.playerKnownFactIds).toEqual(expect.arrayContaining(["F01", "F02", "F09"]));
  });

  it("does not promote a private used fact unless it was disclosed to the player", async () => {
    const { game, store } = service(createInitialState(), new DisclosureProvider([], ["F02"]));
    game.travel("loc_shrine");
    game.startEncounter("npc_koharu");
    await game.selectInteractionMode("talk");
    await game.nextDialogueBeat();

    expect(store.load()!.playerKnownFactIds).toEqual(["F01"]);
  });

  it("gives generation only the ledger facts, not the protagonist's starting mystery", () => {
    const state = createInitialState();
    state.playerKnownFactIds.push("F02");
    state.phase = "encounter";
    state.currentLocationId = "loc_shrine";
    state.activeNpcId = "npc_koharu";
    const prompt = buildCasePrompt({ state, npcId: "npc_koharu", mode: "talk", selectedOption: null, giftItem: null, effect: "" });
    const input = JSON.parse(prompt.user);

    expect(input.player_known_facts).toEqual({ F01: facts.F01, F02: facts.F02 });
    expect(input.protagonist).not.toHaveProperty("startingMystery");
    expect(JSON.stringify(input)).not.toContain(demoBootstrap.player.startingMystery);
  });
});
