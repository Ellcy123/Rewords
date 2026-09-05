import { describe, expect, it } from "vitest";
import { DemoBootstrapSchema, GameStateSchema, demoBootstrap } from "../packages/shared/src/index.ts";
import { characters, evidence, locationAliases } from "../server/src/caseData.ts";
import { createInitialState } from "../server/src/gameService.ts";
describe("murder chapter public contract", () => {
  it("has seven distinct people, eight places and two rule slots", () => {
    const b = DemoBootstrapSchema.parse(demoBootstrap);
    expect(b.npcs).toHaveLength(7); expect(b.locations).toHaveLength(8); expect(b.ruleSlots).toHaveLength(2);
    expect(new Set(b.npcs.map(n => n.age)).size).toBe(7);
    expect(b.items.length).toBeLessThanOrEqual(30);
  });
  it("does not publish the killer or authoring secrets", () => {
    expect(JSON.stringify(demoBootstrap)).not.toMatch(/故意.*推|本人推人|千代.*撒谎|零号站台|17:47/);
    expect(demoBootstrap.npcs.every(n => n.persona.secret === "尚未了解")).toBe(true);
  });
  it("only Ritsu knows the murder itself", () => {
    expect(Object.entries(characters).filter(([,n]) => n.known.includes("F08")).map(([id])=>id)).toEqual(["npc_ritsu"]);
    expect(characters.npc_ritsu.known).not.toContain("R01");
    expect(characters.npc_chiyo.known).not.toContain("F02");
  });
  it("has eleven initial carriers and two uncreated statements", () => {
    expect(Object.keys(evidence)).toHaveLength(13);
    const s = createInitialState();
    expect(s.itemOwners.E12).toBe("uncreated"); expect(s.itemOwners.E13).toBe("uncreated");
    expect(s.discoveredLocationIds).toHaveLength(3);
  });
  it("all items have concepts and every location has a discovery alias", () => {
    for (const i of demoBootstrap.items) expect(demoBootstrap.concepts.some(c => c.id === i.carriedConceptId)).toBe(true);
    for (const l of demoBootstrap.locations) expect(locationAliases[l.id]).toContain(l.name);
  });
  it("rejects old save versions instead of mixing memory", () => {
    expect(GameStateSchema.safeParse({ ...createInitialState(), saveVersion: 2 }).success).toBe(false);
  });
});
