import { describe, expect, it, vi } from "vitest";
import { demoBootstrap } from "../packages/shared/src/index.ts";
import { DialogueProviderRouter } from "../server/src/dialogueProvider.ts";
import { GameService } from "../server/src/gameService.ts";
import { MemoryGameStore } from "../server/src/persistence.ts";
import { buildSayaPrompt } from "../server/src/prompts/sayaPrompt.ts";

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
  return new Response(JSON.stringify({
    choices: [{
      finish_reason: "stop",
      message: { content: typeof content === "string" ? content : JSON.stringify(content) }
    }],
    model: "deepseek-v4-flash"
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("Saya prompt structure", () => {
  it("separates fact boundaries from persona and does not load the backpack during talk", () => {
    const prompt = buildSayaPrompt(sayaTalkContext());

    expect(prompt.system).toContain("[系统行为契约]");
    expect(prompt.system).toContain("[人物固定核心与生活质感]");
    expect(prompt.system).toContain("[结构化 JSON 输出契约]");
    expect(prompt.system).toContain("像人在眼前说话");
    expect(prompt.system).toContain("玩家会逐次点击“下一句”阅读");
    expect(prompt.system).toContain("语义走廊");
    expect(prompt.user).toContain("FACT_SAYA_METHOD");
    expect(prompt.user).toContain("FACT_PLAYER_PUBLIC_IDENTITY");
    expect(prompt.user).toContain("朝雾遥");
    expect(prompt.user).toContain("first_formal_meeting");
    expect(prompt.user).not.toContain("童年照片");
    expect(prompt.user).toContain('"id": "hook"');
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

    expect(prompt.system).toContain("不得为了接住礼物而虚构单位库存");
    expect(prompt.system).toContain("具体存放设施");
    expect(prompt.user).toContain("FACT_STATION_INVENTORY_UNKNOWN");
    expect(prompt.user).toContain("尚未决定最终用途");
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

    expect(prompt.user).toContain("当前公共信仰规则为“土豆是神”");
    expect(prompt.user).not.toContain("carrierItemId");
    expect(prompt.user).not.toContain("item_potato");
  });
});

describe("DialogueProviderRouter", () => {
  it("uses DeepSeek JSON mode and accepts only the complete option whitelist", async () => {
    let requestBody: Record<string, unknown> | null = null;
    const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return deepSeekResponse({
        stage_direction: "她把车票压在指尖下面。",
        line: "昨晚 23:47，这张票出现在失物抽屉里。本站没有那班车——所以，先告诉我你昨晚在哪里。",
        emotion: "审视",
        continuations: [
          { speaker: "player", stage_direction: "", line: "我是朝雾遥。告示上写的身份没有错。", emotion: "平静" },
          { speaker: "npc", stage_direction: "她把收取单往回抽了半寸。", line: "先告诉我，你想从哪件事问起？", emotion: "审视" }
        ],
        options: [
          { id: "saya_open_gentle", text: "你看起来一夜没睡。先坐下，再说那张票。", intent: "任意值" },
          { id: "saya_open_press", text: "不存在的班次却有真的车票。你漏了什么？", intent: "任意值" },
          { id: "saya_open_absurd", text: "也许那辆车自己还不知道它不存在。", intent: "任意值" }
        ],
        used_fact_ids: ["FACT_TICKET_FOUND", "FACT_TICKET_NO_TRAIN"]
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
    expect(result.stageDirection).toBe("她把车票压在指尖下面。");
    expect(result.continuations).toHaveLength(2);
    expect(result.continuations[1]?.line).toContain("哪件事");
    expect(result.continuations[0]?.speakerId).toBe(demoBootstrap.player.id);
    expect(result.options.map((option) => option.id)).toEqual([
      "saya_open_gentle",
      "saya_open_press",
      "saya_open_absurd"
    ]);
    expect(result.options.map((option) => option.intent)).toEqual([
      "温和靠近",
      "直接逼问",
      "荒诞玩笑"
    ]);
    expect(result.options.map((option) => option.text)).toEqual([
      "你没睡好？",
      "到底漏了什么？",
      "车票迷路了？"
    ]);
    expect(result.options[0]?.playerLine).toContain("告诉我这张票");
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
});
