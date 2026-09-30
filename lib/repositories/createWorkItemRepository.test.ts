import { describe, expect, it } from "vitest";
import { createWorkItemRepository } from "./createWorkItemRepository";
import { createSessionStorageWorkItemRepository, SESSION_WORK_ITEM_REPOSITORY_KEY } from "./sessionStorageWorkItemRepository";
import { demoResultToWorkItem } from "@/lib/runtime/demoAdapter";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import { prepareWorkItemApproval } from "@/lib/application/prepareWorkItemApproval";
import type { WorkItemRepository } from "@/types/workItemRepository";
import type { Evidence } from "@/types/workItem";
class FakeStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const at = "2026-09-30T12:00:00.000Z";
describe("createWorkItemRepository", () => {
  it("delegates all entity operations to the existing storage shared across instances", async () => {
    const storage = new FakeStorage();
    const legacy = createSessionStorageWorkItemRepository(storage);
    const item = demoResultToWorkItem(QA_SEED_RESULT, { now: at, createWorkItemId: () => "factory-work" });
    item.missingInfo = []; item.proposalDecisions = [];
    await legacy.saveWorkItem(item);
    const repository: WorkItemRepository = createWorkItemRepository({ storage });
    expect(await repository.getWorkItem(item.id)).toEqual(item);
    const approval = await prepareWorkItemApproval(item, repository, at);
    expect(approval).not.toBeNull();
    const evidence: Evidence = { id: "factory-evidence", workItemId: item.id, kind: "human_confirmation", claim: "Demo", sourceRef: "human:demo", sourceVersion: "1", excerpt: "Demo", producedBy: { type: "human", id: "demo" }, producedAt: at, observedAt: at, verifiedAt: at, validUntil: null };
    await repository.saveEvidence(evidence);
    const reopened = createWorkItemRepository({ storage });
    const saved = await repository.getWorkItem(item.id);
    expect(await reopened.listWorkItems()).toEqual([saved]);
    expect(await reopened.getApproval(approval!.id)).toEqual(approval);
    expect(await reopened.listApprovalsByWorkItem(item.id)).toEqual([approval]);
    expect(await reopened.getEvidence(evidence.id)).toEqual(evidence);
    expect(await reopened.listEvidenceByWorkItem(item.id)).toEqual([evidence]);
    expect(await legacy.getWorkItem(item.id)).toEqual(saved);
    expect(JSON.parse(storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY)!).version).toBe(1);
  });
  it("preserves storage failures without silently returning an empty repository", async () => {
    const storage = { getItem() { throw new Error("storage-unavailable"); }, setItem() { throw new Error("storage-unavailable"); } };
    const repository = createWorkItemRepository({ storage });
    await expect(repository.listWorkItems()).rejects.toThrow("storage-unavailable");
  });
});
