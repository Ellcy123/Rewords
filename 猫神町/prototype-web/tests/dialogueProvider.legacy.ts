// Archived old prompt contract. Active coverage: caseProvider.test.ts.
import { describe, expect, it, vi } from "vitest";
import { demoBootstrap } from "../packages/shared/src/index.ts";
import { DialogueProviderRouter } from "../server/src/dialogueProvider.ts";
import { GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { buildSayaPrompt } from "../server/src/prompts/sayaPrompt.ts";
import { buildTheologyPrompt } from "../server/src/prompts/theologyPrompt.ts";
import { buildEndingPrompt } from "../server/src/prompts/endingPrompt.ts";

function sayaTalkContext() {
  const service = new GameService(new MemoryGameStore());
  service.travel("loc_station");
  const state = service.startEncounter().state;
  const npc = demoBootstrap.npcs.find((candidate) => candidate.id === "npc_saya")!;
  return {
    state,
    npc,
    locationId: "loc_station",
    mode: "talk" as const,
    giftItem: null,
    selectedOption: null
  };
}

function deepSeekResponse(content: unknown) {
  if (content && typeof content === "object" && "options" in content && Array.isArray(content.options)) {
    const draft = content as Record<string, unknown>;
    content = { ...draft, options: content.options.map((option) => ({
      ...option, anchor: option.anchor ?? String(draft.line).slice(0, 6)
    })) };
  }
  return new Response(JSON.stringify({
    choices: [{
      finish_reason: "stop",
      message: { content: typeof content === "string" ? content : JSON.stringify(content) }
    }],
    model: "deepseek-v4-flash"
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function theologyTalkContext(npcId: "npc_koharu" | "npc_genichi") {
  const service = new GameService(new MemoryGameStore());
  const npc = demoBootstrap.npcs.find((candidate) => candidate.id === npcId)!;
  service.travel(npc.initialLocationId);
  const state = service.startEncounter().state;
  return { state, npc, locationId: npc.initialLocationId, mode: "talk" as const, giftItem: null, selectedOption: null };
}

function naturalSayaDraft() {
  return {
    line: "嗯。", stage_direction: "纱夜回头看了你一眼。", emotion: "犹豫",
    continuations: [{ speaker: "npc", line: "这张黑票又回来了。五年前，是我开门让雨宫真昼上的车。", stage_direction: "她锁上失物抽屉。", emotion: "紧张" }],
    npc_action_id: "saya_locks_ticket_drawer", npc_action: "纱夜反锁失物抽屉。",
    options: [
      { id: "saya_open_gentle", text: "票怎么回来的？", intent: "温和追问乘客", anchor: "黑票又回来了" },
      { id: "saya_open_press", text: "为什么放她进去？", intent: "逼问开门责任", anchor: "开门" },
      { id: "saya_open_absurd", text: "它自己长腿了？", intent: "黑色玩笑试探", anchor: "黑票" }
    ],
    used_fact_ids: ["FACT_SAYA_OPENED_GATE", "FACT_BLACK_TICKET_RETURNED"]
  };
}

describe("Saya prompt structure", () => {
  it("separates fact boundaries from persona and does not load the backpack during talk", () => {
    const prompt = buildSayaPrompt(sayaTalkContext());

    expect(prompt.system).toContain("[优先级]");
    expect(prompt.system).toContain("[戏剧规则]");
    expect(prompt.system).toContain("[动作与记忆]");
    expect(prompt.system).toContain("recent_transcript");
    expect(prompt.system).toContain("先接住玩家这句话");
    expect(prompt.system).not.toContain("每段台词15至100");
    expect(prompt.system).not.toContain("整轮最多一个问号");
    expect(prompt.user).toContain('"voice_examples"');
    expect(prompt.user).toContain('"player_attention"');
    expect(prompt.user).not.toContain('"exact_text"');
    expect(prompt.system).toContain("selected_option.player_said");
    expect(prompt.user).toContain("FACT_SAYA_OPENED_GATE");
    expect(prompt.user).not.toContain("FACT_MAHIRU_MESSAGE");
    expect(prompt.user).not.toContain("告诉小春，别来找我");
    expect(prompt.user).toContain("未到公开节拍");
    expect(prompt.user).toContain("FACT_PLAYER_PUBLIC");
    expect(prompt.user).toContain("朝雾遥");
    expect(prompt.user).toContain("雨宫真昼");
    expect(prompt.user).not.toContain("童年照片");
    expect(prompt.user).toContain('"id": "saya_names_passenger"');
    expect(prompt.user).toContain('"current_reflection"');
    expect(prompt.user).toContain('"retrieved_memories"');
    expect(prompt.user).not.toContain("item_potato");
    expect(prompt.allowedOptionIds).toEqual([
      "saya_open_gentle",
      "saya_open_press",
      "saya_open_absurd"
    ]);
    expect(Object.values(prompt.optionTextById).every((text) => [...text].length <= 10)).toBe(true);
  });

  it("gives gift dialogue an explicit inventory and numbering boundary", () => {
    const context = sayaTalkContext();
    const giftItem = demoBootstrap.items.find((item) => item.id === "item_potato")!;
    const prompt = buildSayaPrompt({ ...context, mode: "gift", giftItem });

    expect(prompt.user).toContain("不能只评价礼物代表什么");
    expect(prompt.user).toContain("FACT_GIFT_ITEM_POTATO");
    expect(prompt.user).toContain("saya_bags_gift");
    expect(prompt.user).toContain("所有权已经转移");
  });

  it("passes the public rule effect without revealing its carrier item", () => {
    const context = sayaTalkContext();
    context.state.activeRules.faith = {
      slotId: "faith",
      carrierItemId: "item_potato",
      conceptId: "concept_potato",
      displayText: "土豆是神",
      activatedDay: 1
    };

    const prompt = buildSayaPrompt(context);

    expect(prompt.user).toContain('"faith_rule": "土豆是神"');
    expect(prompt.user).toContain("当前全镇称“土豆是神”");
    expect(prompt.user).not.toContain("carrierItemId");
    expect(prompt.user).not.toContain("item_potato");
  });

  it("uses a memory-led opening on a repeat visit instead of replaying the introduction", async () => {
    const service = new GameService(new MemoryGameStore());
    service.travel("loc_station");
    service.startEncounter();
    await service.selectInteractionMode("talk");
    service.completeEncounter();
    service.travel("loc_station");
    const state = service.startEncounter().state;
    const npc = demoBootstrap.npcs.find((candidate) => candidate.id === "npc_saya")!;
    const prompt = buildSayaPrompt({ state, npc, locationId: "loc_station", mode: "talk", giftItem: null, selectedOption: null });

    expect(prompt.sceneGoal).toContain("承接上次会面");
    expect(prompt.allowedActionIds).toEqual(["saya_updates_ticket_check"]);
    expect(prompt.user).toContain('"is_repeat_opening": true');
    expect(prompt.user).toContain("retrieved_memories");
  });
});

describe("DialogueProviderRouter", () => {
  it("accepts short natural replies and present-day gestures without leaking past secrets", async () => {
    const provider = new DialogueProviderRouter({ apiKey: "test-key", maxAttempts: 1,
      fetchImpl: vi.fn(async () => deepSeekResponse(naturalSayaDraft())) });
    const result = await provider.generate(sayaTalkContext());
    expect(result.debug.provider).toBe("deepseek");
    expect(result.line).toBe("嗯。");
    expect(result.stageDirection).toContain("回头");
    expect(result.options.every((option) => option.text === option.playerLine)).toBe(true);
    expect(result.debug.memoryCandidate).toContain("水野纱夜说");
    expect(result.debug.memoryCandidate).not.toContain("只执行场景计划");
  });

  it("repairs unselected player speech instead of deleting a middle turn", async () => {
    const invalid = naturalSayaDraft();
    invalid.continuations.unshift({ speaker: "player", line: "我答应帮你。", stage_direction: "", emotion: "回应" });
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push(String(init?.body));
      return deepSeekResponse(calls.length === 1 ? invalid : naturalSayaDraft());
    });
    const provider = new DialogueProviderRouter({ apiKey: "test-key", maxAttempts: 2, fetchImpl });
    const result = await provider.generate(sayaTalkContext());
    expect(result.debug.provider).toBe("deepseek");
    expect(result.debug.attemptCount).toBe(2);
    expect(calls[1]).toContain("unselected_player_speech");
    expect(result.debug.memoryCandidate).not.toContain("我答应帮你");
  });

  it("rejects internal strategy labels even with a valid scene anchor", async () => {
    const draft = naturalSayaDraft();
    draft.options[0]!.text = "假装配合，套取消息";
    const provider = new DialogueProviderRouter({ apiKey: "test-key", maxAttempts: 1,
      fetchImpl: vi.fn(async () => deepSeekResponse(draft)) });
    expect((await provider.generate(sayaTalkContext())).debug.fallbackReason).toBe("option_is_strategy_label");
  });

  it("keeps plot action targets explicit without fixing the whole label", () => {
    const context = theologyTalkContext("npc_koharu");
    const prompt = buildTheologyPrompt(context);
    expect(prompt.optionRequiredWordsById.koharu_ask_god).toEqual(["后殿"]);
    expect(prompt.optionRequiredActionsById.koharu_leave_empty).toContain("找");
    expect(prompt.user).toContain('"final_output_check"');
    expect(prompt.system).toContain('"speaker":"npc"');
    expect(prompt.system).not.toContain('"speaker":"npc|player"');
  });

  it.each([
    ["unknown ID", "option_whitelist_mismatch"],
    ["duplicate ID", "duplicate_option_id"],
    ["duplicate text", "duplicate_option_text"],
    ["invented anchor", "option_anchor_not_displayed"],
    ["long option", "invalid_dialogue_json"],
    ["long beat", "invalid_dialogue_json"],
    ["extra beat", "invalid_dialogue_json"]
  ])("rejects %s without silently clipping or rewriting the reply", async (kind, reason) => {
    const draft = naturalSayaDraft();
    if (kind === "unknown ID") draft.options[0]!.id = "take_everything";
    if (kind === "duplicate ID") draft.options[1]!.id = draft.options[0]!.id;
    if (kind === "duplicate text") draft.options[1]!.text = draft.options[0]!.text;
    if (kind === "invented anchor") draft.options[0]!.anchor = "不存在的现场原文";
    if (kind === "long option") draft.options[0]!.text = "这".repeat(13);
    if (kind === "long beat") draft.continuations[0]!.line = "长".repeat(121);
    if (kind === "extra beat") draft.continuations = Array.from({ length: 5 }, () => ({ ...draft.continuations[0]! }));
    const provider = new DialogueProviderRouter({ apiKey: "test-key", maxAttempts: 1,
      fetchImpl: vi.fn(async () => deepSeekResponse(draft)) });
    const result = await provider.generate(sayaTalkContext());
    expect(result.debug.provider).toBe("mock_fallback");
    expect(result.debug.fallbackReason).toBe(reason);
    expect(result.options.every((option) => option.text === option.playerLine)).toBe(true);
  });

  it("keeps casual gift intent in both the prompt and the offline fallback", async () => {
    const context = sayaTalkContext();
    const giftItem = demoBootstrap.items.find((item) => item.id === "item_potato")!;
    const provider = new DialogueProviderRouter({ apiKey: "" });
    const opening = await provider.generate({ ...context, mode: "gift", giftItem });
    const selectedOption = opening.options.find((option) => option.id === "gift_explain")!;
    expect(selectedOption.text).toBe("就是想送给你。");
    const prompt = buildSayaPrompt({ ...context, mode: "gift", giftItem, selectedOption });
    expect(prompt.selectedOutcome).toContain("回应这份心意");
    const reply = await provider.generate({ ...context, mode: "gift", giftItem, selectedOption });
    expect(reply.line).toContain("不多问");
    expect(reply.line).not.toContain("调查");
    expect(reply.options).toHaveLength(0);
  });

  it("keeps grounded AI option wording and uses it verbatim as the player's line", async () => {
    let requestBody: Record<string, unknown> | null = null;
    const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return deepSeekResponse({
        stage_direction: "她反锁失物抽屉。",
        line: "五年前23:47，是我打开零号站台，让雨宫真昼上了车。",
        emotion: "戒备",
        continuations: [
          { speaker: "npc", stage_direction: "她把黑票压进玻璃夹板。", line: "今天，同一编号的票又回来了。你先问乘客，还是问开门的人？", emotion: "戒备" }
        ],
        npc_action_id: "saya_locks_ticket_drawer",
        npc_action: "纱夜反锁失物抽屉。",
        memory_candidate: "纱夜承认自己五年前为雨宫真昼打开零号站台。",
        reflection_candidate: "纱夜暂时把朝雾遥当成需要用黑票继续试探的七日代理。",
        options: [
          { id: "saya_open_gentle", text: "这票哪来的？", intent: "任意值" },
          { id: "saya_open_press", text: "为什么放她进去？", intent: "任意值" },
          { id: "saya_open_absurd", text: "车票还魂了？", intent: "任意值" }
        ],
        used_fact_ids: ["FACT_SAYA_OPENED_GATE", "FACT_BLACK_TICKET_RETURNED"]
      });
    });
    const provider = new DialogueProviderRouter({
      apiKey: "test-key",
      model: "deepseek-v4-flash",
      fetchImpl,
      maxAttempts: 1
    });

    const result = await provider.generate(sayaTalkContext());

    expect(result.debug.provider).toBe("deepseek");
    expect(result.debug.memoryCandidate).toContain("她反锁失物抽屉");
    expect(result.debug.memoryCandidate).not.toContain("依据：");
    expect(result.debug.memoryCandidate).not.toBe("纱夜承认自己五年前为雨宫真昼打开零号站台。");
    expect(result.debug.reflectionCandidate).toContain("当前目标");
    expect(result.stageDirection).toBe("她反锁失物抽屉。");
    expect(result.continuations).toHaveLength(1);
    expect(result.continuations[0]?.line).toContain("开门的人");
    expect(result.continuations[0]?.speakerId).toBe("npc_saya");
    expect(result.options.map((option) => option.id)).toEqual([
      "saya_open_gentle",
      "saya_open_press",
      "saya_open_absurd"
    ]);
    expect(result.options.map((option) => option.intent)).toEqual([
      "温和追问乘客",
      "逼问开门责任",
      "黑色玩笑试探"
    ]);
    expect(result.options.map((option) => option.text)).toEqual([
      "这票哪来的？",
      "为什么放她进去？",
      "车票还魂了？"
    ]);
    expect(result.options[0]?.playerLine).toBe("这票哪来的？");
    expect(result.debug.npcActionId).toBe("saya_locks_ticket_drawer");
    expect(requestBody).toMatchObject({
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      stream: false
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(provider.getLogs()[0]).toMatchObject({ success: true, provider: "deepseek" });
  });

  it("retries invalid output once and falls back without breaking the game", async () => {
    const fetchImpl = vi.fn(async () => deepSeekResponse(""));
    const provider = new DialogueProviderRouter({
      apiKey: "test-key",
      fetchImpl,
      maxAttempts: 2,
      timeoutMs: 100
    });

    const result = await provider.generate(sayaTalkContext());

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.debug.provider).toBe("mock_fallback");
    expect(result.debug.fallbackReason).toBe("empty_output");
    expect(result.options.length).toBeGreaterThanOrEqual(2);
    expect(provider.getLogs()[0]).toMatchObject({ success: false, errorCode: "empty_output" });
  });

  it("uses Mock immediately when the local key is not configured", async () => {
    const fetchImpl = vi.fn();
    const provider = new DialogueProviderRouter({ apiKey: "", fetchImpl });

    const result = await provider.generate(sayaTalkContext());

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.debug.provider).toBe("mock_fallback");
    expect(result.debug.fallbackReason).toBe("not_configured");
  });

  it("connects Koharu to DeepSeek with a concrete incident and action plan", async () => {
    const context = theologyTalkContext("npc_koharu");
    const built = buildTheologyPrompt(context);
    expect(built.system).toContain("先接住玩家这句话");
    expect(built.system).toContain("不得新增人物、证物");
    expect(built.user).toContain("雨宫真昼");
    expect(built.user).toContain("koharu_hands_over_bell");
    expect(built.allowedOptionIds).toContain("koharu_ask_god");

    const fetchImpl = vi.fn(async () => deepSeekResponse({
      stage_direction: "她扣上侧门门闩。",
      line: "我姐姐叫雨宫真昼，五年前猫神祭当晚失踪。",
      emotion: "急切",
      continuations: [
        { speaker: "npc", stage_direction: "她把猫铃按进你手里。", line: "23:47，她拿着九条给的黑票上了零号站台。你先查哪一件？", emotion: "冷下来" }
      ],
      npc_action_id: "koharu_hands_over_bell",
      npc_action: "小春把猫铃交给朝雾遥。",
      memory_candidate: "小春向朝雾遥展示刻有“真昼”的猫铃。",
      reflection_candidate: "小春准备观察朝雾遥是否会立刻追查真昼。",
      options: [
        { id: "ask_memory", text: "铃铛给我看看。", intent: "核对姐姐身份" },
        { id: "koharu_ask_god", text: "带我去后殿。", intent: "立即查后殿" },
        { id: "koharu_doubt_memory", text: "谁见过她？", intent: "寻找目击者" }
      ],
      used_fact_ids: ["FACT_PRIVATE_STORY", "FACT_KOHARU_BELL"]
    }));
    const provider = new DialogueProviderRouter({ apiKey: "test-key", fetchImpl, maxAttempts: 1 });
    const result = await provider.generate(context);

    expect(result.debug.provider).toBe("deepseek");
    expect(result.debug.promptVersion).toBe("agent-dialogue-v4.2-natural");
    expect(result.options.map((option) => option.text)).toContain("带我去后殿。");
  });

  it("makes the newest full player line the sole live response target", async () => {
    const service = new GameService(new MemoryGameStore());
    service.travel("loc_shrine");
    service.startEncounter();
    await service.selectInteractionMode("talk");
    const afterDoubt = await service.chooseTalkOption("koharu_doubt_memory");
    const currentOption = afterDoubt.state.currentDialogue?.options.find(
      (option) => option.id === "koharu_test_god"
    )!;
    const afterTest = await service.chooseTalkOption(currentOption.id);
    const npc = demoBootstrap.npcs.find((candidate) => candidate.id === "npc_koharu")!;
    const built = buildTheologyPrompt({
      state: afterTest.state,
      npc,
      locationId: "loc_shrine",
      mode: "talk",
      giftItem: null,
      selectedOption: currentOption
    });
    const payload = JSON.parse(built.user.slice(built.user.indexOf("{"))) as {
      interaction: { selected_option: { response_priority: string; player_said: string }; settled_prior_choice_count: number };
      recent_transcript: string[];
    };

    expect(payload.interaction.selected_option.response_priority).toBe("highest_live_player_turn_with_transcript_continuity");
    expect(payload.interaction.selected_option.player_said).toBe(currentOption.text);
    expect(payload.interaction.settled_prior_choice_count).toBe(1);
    expect(payload.recent_transcript.join("\n")).toContain("谁见过她？");
    expect(payload.recent_transcript.join("\n")).toContain("先找纱夜");
    expect(payload.recent_transcript.join("\n")).toContain("现场动作");
    expect(built.system).toContain("承接 recent_transcript 最后一段");
  });

  it("rejects an active-god reply that omits the current god fact", async () => {
    const context = theologyTalkContext("npc_genichi");
    context.state.activeRules.faith = {
      slotId: "faith",
      carrierItemId: "item_potato",
      conceptId: "concept_potato",
      displayText: "土豆是神",
      activatedDay: 1
    };
    const fetchImpl = vi.fn(async () => deepSeekResponse({
      stage_direction: "他掀开照片黑布。",
      line: "黑色车票是我给雨宫真昼的。",
      emotion: "愉快",
      continuations: [
        { speaker: "npc", stage_direction: "", line: "未剪辑原片还在保险柜。你今天想拿哪一件？", emotion: "试探" }
      ],
      npc_action_id: "genichi_displays_cropped_photo",
      npc_action: "弦一展示裁掉真昼面孔的照片。",
      memory_candidate: "弦一承认自己把黑色车票交给雨宫真昼。",
      reflection_candidate: "弦一准备判断朝雾遥是否愿意参加重演。",
      options: [
        { id: "ask_gallery", text: "票是你给的？", intent: "追问给票事实" },
        { id: "genichi_ask_power", text: "把原片交出来。", intent: "索要未剪辑原片" },
        { id: "disagree", text: "你知道她会消失。", intent: "指控故意伤害" }
      ],
      used_fact_ids: ["FACT_GENICHI_GAVE_TICKET", "FACT_UNCUT_PHOTOS"]
    }));
    const provider = new DialogueProviderRouter({ apiKey: "test-key", fetchImpl, maxAttempts: 1 });
    const result = await provider.generate(context);

    expect(result.debug.provider).toBe("mock_fallback");
    expect(result.debug.fallbackReason).toBe("required_fact_missing");
  });

  it("generates a Day 7 ending from whitelisted gift, rule, and relationship facts", async () => {
    const service = new GameService(new MemoryGameStore());
    service.travel("loc_shrine");
    service.startEncounter();
    await service.selectInteractionMode("gift");
    await service.confirmGift("item_thread");
    service.completeEncounter();
    service.waitUntilNight();
    service.changeRule("faith", "item_potato");
    const state = service.getState();
    const built = buildEndingPrompt(state);
    const giftFactId = built.facts.find((fact) => fact.text.includes("线团"))!.id;
    const ruleFactId = built.facts.find((fact) => fact.text.includes("土豆是神"))!.id;

    const fetchImpl = vi.fn(async () => deepSeekResponse({
      title: "土豆神与零号站台",
      subtitle: "黑票、旧命令和真昼的照片被摆到了同一张长椅上。",
      narration: "17:47，朝雾遥把线团交给小春，又让土豆成为神。小春用线团把刻着真昼姓名的猫铃系在站台门上，纱夜公开盖有九条家印章的通行令，弦一则举起没有裁掉真昼面孔的原片。零号站台的门停在半空，第二张黑票没能秘密送出。",
      npc_outcomes: [
        { npc_id: "npc_koharu", headline: "真昼被叫出姓名", text: "小春把猫铃挂上站台门，当众说出姐姐的姓名、年龄和失踪时间。" },
        { npc_id: "npc_saya", headline: "她签名作证", text: "纱夜把伪造记录和通行令复写纸钉在一起，承认五年前是自己开的门。" },
        { npc_id: "npc_genichi", headline: "重演被曝光", text: "弦一准备的第二张黑票暴露在人群中，没能让下一位乘客悄悄登车。" }
      ],
      closing_line: "广播第三次催促上车时，猫铃先响了。",
      used_fact_ids: [...built.requiredFactIds, giftFactId, ruleFactId, "REL_npc_koharu"]
    }));
    const provider = new DialogueProviderRouter({ apiKey: "test-key", fetchImpl, maxAttempts: 1 });
    const ending = await provider.generateEnding(state);

    expect(ending.provider).toBe("deepseek");
    expect(ending.factSummary.gifts.join(" ")).toContain("线团");
    expect(ending.factSummary.rules.join(" ")).toContain("土豆是神");
    expect(ending.npcOutcomes.map((outcome) => outcome.npcId)).toEqual([
      "npc_koharu",
      "npc_saya",
      "npc_genichi"
    ]);
    expect(provider.getLogs().at(-1)).toMatchObject({ mode: "ending", success: true });
  });
});
