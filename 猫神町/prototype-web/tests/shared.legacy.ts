// Archived pre-refactor baseline. Active coverage: caseShared.test.ts.
import { describe, expect, it } from "vitest";
import {
  DemoBootstrapSchema,
  DialogueRequestSchema,
  demoBootstrap
} from "../packages/shared/src/index.ts";
import { createMockDialogue } from "../server/src/mockDialogueProvider.ts";

describe("locked demo data", () => {
  it("matches the locked 3/3/6/2 scope", () => {
    const parsed = DemoBootstrapSchema.parse(demoBootstrap);

    expect(parsed.locations).toHaveLength(3);
    expect(parsed.npcs).toHaveLength(3);
    expect(parsed.dailyEvents).toHaveLength(7);
    expect(parsed.player.name).toBe("朝雾遥");
    expect(parsed.player.publicRole).toContain("七日代理");
    expect(parsed.items).toHaveLength(6);
    expect(parsed.ruleSlots).toHaveLength(2);
  });

  it("resolves every item carrier to one authored concept", () => {
    const conceptIds = new Set(demoBootstrap.concepts.map((concept) => concept.id));

    for (const item of demoBootstrap.items) {
      expect(conceptIds.has(item.carriedConceptId)).toBe(true);
    }
  });

  it("provides authored text for every concept and rule slot", () => {
    for (const concept of demoBootstrap.concepts) {
      expect(concept.slotText.faith.length).toBeGreaterThan(0);
      expect(concept.slotText.beauty.length).toBeGreaterThan(0);
    }
  });
});

describe("MockDialogueProvider", () => {
  it("introduces the authored protagonist during Saya's first meeting", () => {
    const result = createMockDialogue({
      npcId: "npc_saya",
      locationId: "loc_station",
      day: 1,
      period: "morning",
      activeRules: { faith: null, beauty: null },
      isFirstMeeting: true
    });

    expect(result.line).toContain("水野纱夜");
    expect([result.line, ...result.continuations.map((beat) => beat.line)].join("")).toContain("朝雾遥");
    expect(result.continuations.length).toBeGreaterThanOrEqual(1);
    expect(result.options.every((option) => Boolean(option.playerLine))).toBe(true);
  });

  it("returns structured options for each NPC", () => {
    for (const npc of demoBootstrap.npcs) {
      const request = DialogueRequestSchema.parse({
        npcId: npc.id,
        locationId: npc.initialLocationId,
        day: 1,
        period: "morning",
        activeRules: { faith: null, beauty: null }
      });
      const result = createMockDialogue(request);

      expect(result.speakerId).toBe(npc.id);
      expect(result.options.length).toBeGreaterThanOrEqual(2);
      expect(result.options.every((option) => Boolean(option.playerLine))).toBe(true);
      expect(result.debug.provider).toBe("mock");
    }
  });

  it("changes the available options after a player choice", () => {
    const npc = demoBootstrap.npcs[0];
    const opening = createMockDialogue({
      npcId: npc.id,
      locationId: npc.initialLocationId,
      day: 1,
      period: "morning",
      activeRules: { faith: null, beauty: null }
    });
    const selected = opening.options[0];
    const followup = createMockDialogue({
      npcId: npc.id,
      locationId: npc.initialLocationId,
      day: 1,
      period: "morning",
      activeRules: { faith: null, beauty: null },
      selectedOptionId: selected.id
    });

    expect(followup.line).not.toBe(opening.line);
    expect(followup.options.map((option) => option.id)).not.toContain(selected.id);
    expect(followup.continuations.some((beat) => beat.speakerId === demoBootstrap.player.id)).toBe(true);
  });
});
