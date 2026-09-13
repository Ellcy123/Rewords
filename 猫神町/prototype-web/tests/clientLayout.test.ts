import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appSource = readFileSync(fileURLToPath(new URL("../client/src/App.tsx", import.meta.url)), "utf8");
const stylesSource = readFileSync(fileURLToPath(new URL("../client/src/styles.css", import.meta.url)), "utf8");

function sectionBetween(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("档案与材料页面拆分", () => {
  it("档案页只呈现人物/事件档案，不再渲染材料或原始事件流水", () => {
    const journal = sectionBetween(appSource, '{view === "journal" && (', '{view === "shrine" && (');
    expect(journal).toContain("人物档案");
    expect(journal).toContain("事件档案");
    expect(journal).not.toContain("evidenceJournal");
    expect(journal).not.toContain("eventLog");
    expect(journal).not.toContain("原始材料与亲历记录");
    expect(journal).not.toContain("亲历与证词");
  });

  it("背包页承接已读材料、明确原件状态，移动端材料列表单列", () => {
    const inventory = sectionBetween(appSource, '{view === "inventory" && (', '{view === "journal" && (');
    expect(inventory).toContain("已读材料记录");
    expect(inventory).toContain("原件目前由你保管");
    expect(inventory).toContain("只保留了阅读记录，原件不在背包");

    const mobileStyles = stylesSource.slice(stylesSource.indexOf("@media (max-width: 720px)"));
    expect(mobileStyles).toContain(".material-record-grid { grid-template-columns: 1fr; }");
  });
});
