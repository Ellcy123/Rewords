import { describe, expect, it } from "vitest";
import {
  DemoBootstrapSchema,
  DialogueRequestSchema,
  demoBootstrap
} from "../packages/shared/src/index.ts";
import { createMockDialogue } from "../server/src/mockDialogueProvider.ts";

describe("Day 1 demo data", () => {
  it("matches the locked 3/3/6/2 scope", () => {
    const parsed = DemoBootstrapSchema.parse(demoBootstrap);

    expect(parsed.locations).toHaveLength(3);
    expect(parsed.npcs).toHaveLength(3);
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
  });
});
