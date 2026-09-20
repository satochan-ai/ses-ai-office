import { describe, expect, it } from "vitest";
import { SESSION_WORK_ITEM_REPOSITORY_KEY } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { readOfficeV3DemoResultStore } from "@/lib/officeV3DemoResult";
import { createSessionStorageWorkItemRepository } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { initializeDemoWorkItemsFromResults } from "@/lib/application/initializeDemoWorkItems";
import { isHumanLoopQaSeedEnabled, QA_SEED_RESULT, resetHumanLoopDemoSeed, seedHumanLoopDemoResult } from "./demoQaSeed";

class FakeStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
}

describe("human loop QA seed", () => {
  it("requires development mode and the explicit query parameter", () => {
    expect(isHumanLoopQaSeedEnabled("?qaSeed=human-loop", "development")).toBe(true);
    expect(isHumanLoopQaSeedEnabled("", "development")).toBe(false);
    expect(isHumanLoopQaSeedEnabled("?qaSeed=human-loop", "production")).toBe(false);
  });
  it("uses a deterministic official matching agent result", () => {
    expect(QA_SEED_RESULT).toMatchObject({ scenarioId: "matching-proposal", finalAgentId: "matching", completedAt: "2026-09-20T00:00:00.000Z" });
  });
  it("seeds once and reset removes only the QA work item", () => {
    const storage = new FakeStorage();
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
    expect(seedHumanLoopDemoResult()).toBe(true);
    expect(seedHumanLoopDemoResult()).toBe(false);
    expect(readOfficeV3DemoResultStore()?.results.matching).toEqual(QA_SEED_RESULT);
    storage.setItem(SESSION_WORK_ITEM_REPOSITORY_KEY, JSON.stringify({
      version: 1,
      workItems: [{ id: "wi-demo-matching-proposal" }, { id: "human-edited" }],
      approvals: [{ workItemId: "wi-demo-matching-proposal" }, { workItemId: "human-edited" }],
      evidence: [{ workItemId: "wi-demo-matching-proposal" }, { workItemId: "human-edited" }],
    }));
    resetHumanLoopDemoSeed(storage);
    expect(readOfficeV3DemoResultStore()?.results.matching).toBeUndefined();
    expect(JSON.parse(storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY)!).workItems).toEqual([{ id: "human-edited" }]);
    expect(seedHumanLoopDemoResult()).toBe(true);
    expect(readOfficeV3DemoResultStore()?.results.matching).toEqual(QA_SEED_RESULT);
  });
  it("bootstraps one repository WorkItem from empty and reset storage deterministically", async () => {
    const storage = new FakeStorage();
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
    seedHumanLoopDemoResult();
    const repo = createSessionStorageWorkItemRepository(storage);
    const results = [QA_SEED_RESULT];
    expect((await initializeDemoWorkItemsFromResults(results, repo, { now: "2026-09-20T00:00:00.000Z" })).created).toBe(1);
    expect((await repo.listWorkItems()).map(item => item.id)).toEqual(["wi-demo-matching-proposal"]);
    expect((await initializeDemoWorkItemsFromResults(results, createSessionStorageWorkItemRepository(storage), { now: "2026-09-20T00:00:01.000Z" })).created).toBe(0);
    expect((await createSessionStorageWorkItemRepository(storage).listWorkItems())).toHaveLength(1);
  });
});
