import { describe, it, expect } from "vitest";
import type { WorkItem } from "@/types/workItem";
import type { WorkItemSaveResult, VersionedWorkItem } from "@/types/serverWorkItemPersistence";
export type CoreHarness = {
  get(tenant: string, id: string): Promise<VersionedWorkItem | null>;
  save(tenant: string, item: WorkItem, expected: number): Promise<WorkItemSaveResult>;
  rollback(item: WorkItem): Promise<void>;
  close(): Promise<void>;
};
// Same assertions on Fake and PostgreSQL; no existing suite rewrite.
export function coreContracts(name: string, create: () => Promise<CoreHarness>) {
  describe(name, () => {
    it("tenant isolation and same ID", async () => {
      const h = await create();
      try { expect((await h.get("a", "w"))?.workItem.assignedHumanId).toBe("human-a"); expect((await h.get("b", "w"))?.workItem.assignedHumanId).toBe("human-b"); expect(await h.get("other", "w")).toBeNull(); }
      finally { await h.close(); }
    });
    it("CAS increment, stale and missing", async () => {
      const h = await create();
      try {
        const current = (await h.get("a", "w"))!;
        const savedItem: WorkItem = { ...current.workItem, status: "cancelled" };
        expect(await h.save("a", savedItem, 1)).toEqual({ status: "saved", revision: 2 });
        expect(await h.save("a", { ...current.workItem, status: "needs_human_input" }, 1)).toEqual({ status: "conflict" });
        expect(await h.get("a", "w")).toEqual({ workItem: savedItem, revision: 2 });
        expect(await h.save("a", { ...current.workItem, id: "absent" }, 1)).toEqual({ status: "not_found" });
      } finally { await h.close(); }
    });
    it("failed transaction preserves revision and entity", async () => {
      const h = await create();
      try { const before = await h.get("a", "w"); await expect(h.rollback({ ...before!.workItem, status: "cancelled" })).rejects.toThrow("injected"); expect(await h.get("a", "w")).toEqual(before); }
      finally { await h.close(); }
    });
  });
}
