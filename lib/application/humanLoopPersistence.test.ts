import { describe, expect, it } from "vitest";
import { createSessionStorageWorkItemRepository } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import { projectWorkItemsToDecisionQueue } from "@/lib/workItem/projection/dashboard";
import type { MissingInfoResolutionValue } from "@/types/workItemResolution";
import { initializeDemoWorkItemsFromResults } from "./initializeDemoWorkItems";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";

class FakeStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const at = "2026-09-30T12:00:00.000Z";
const actorId = "demo-human";
const reason = "提案条件を再確認してください";
const values: MissingInfoResolutionValue[] = [
  { field: "proposalRoute", status: "clear" },
  { field: "personIntent", status: "confirmed" },
  { field: "availabilityStart", status: "matched", date: "2026-10-01" },
  { field: "duplicateProposal", status: "none" },
  { field: "disclosureScope", status: "defined" },
  { field: "informationFreshness", note: "確認済み" },
];

describe("Human Loop session repository persistence", () => {
  it.each(["approve-work-item", "reject-work-item", "return-for-rework"] as const)("preserves %s from Result through Human commands, recreated repository and Dashboard", async type => {
    const storage = new FakeStorage();
    const repository = createSessionStorageWorkItemRepository(storage);
    const options = { now: at };
    expect(await initializeDemoWorkItemsFromResults([QA_SEED_RESULT], repository, options)).toMatchObject({ ok: true, created: 1 });
    const initial = await repository.listWorkItems();
    expect(initial).toHaveLength(1);
    const id = "wi-demo-matching-proposal";
    expect(initial[0]).toMatchObject({ id, assignedAgentId: "matching", mode: "demo" });
    expect(initial[0].missingInfo.filter(info => info.status === "open")).toHaveLength(6);
    expect(projectWorkItemsToDecisionQueue(initial, at).cards).toMatchObject([{ workItemId: id, bucket: "missing_info" }]);
    const reopened = createSessionStorageWorkItemRepository(storage);
    expect(await initializeDemoWorkItemsFromResults([QA_SEED_RESULT], reopened, options)).toMatchObject({ created: 0, skippedExisting: 1 });
    expect(await reopened.listWorkItems()).toEqual(initial);

    for (const value of values) {
      const info = initial[0].missingInfo.find(candidate => candidate.field === value.field)!;
      expect(await executeWorkItemCommandUseCase({
        repositories: repository,
        command: { type: "provide-missing-info", commandId: `resolve-${value.field}`, workItemId: id, missingInfoId: info.id, actorId, issuedAt: at, value },
        effectContext: { at, actor: { type: "human", id: actorId } },
      })).toMatchObject({ ok: true });
    }
    const resolved = (await reopened.listWorkItems())[0];
    expect(resolved.id).toBe(id);
    expect(resolved.missingInfo.filter(info => info.status === "open")).toHaveLength(0);
    const approval = await prepareWorkItemApproval(resolved, repository, at);
    expect(approval).not.toBeNull();
    const prepared = (await reopened.getWorkItem(id))!;
    expect(prepared).toMatchObject({ approvalRequired: true, currentApprovalId: approval!.id, status: "awaiting_approval" });
    expect(approval).toMatchObject({ workItemId: id, state: "pending", scope: { permits: ["prepare-only"] } });
    const snapshot = approvalSnapshotForWorkItem(prepared);
    expect(approval).toMatchObject({ targetDeliverableId: snapshot.deliverable.id, targetDeliverableVersion: snapshot.deliverable.version, targetDeliverableHash: snapshot.deliverable.hash });
    expect(await executeWorkItemCommandUseCase({
      repositories: repository,
      command: { type, commandId: type, workItemId: id, approvalId: approval!.id, actorId, issuedAt: at, reason },
      approvalSnapshots: { [approval!.id]: snapshot },
      effectContext: { at, actor: { type: "human", id: actorId } },
    })).toMatchObject({ ok: true });

    const savedItem = (await repository.getWorkItem(id))!;
    const savedApprovals = await repository.listApprovalsByWorkItem(id);
    expect(savedApprovals).toHaveLength(1);
    expect(savedApprovals.filter(current => current.state === "pending")).toHaveLength(0);
    const savedApproval = savedApprovals[0];
    expect(savedItem).toMatchObject({ id, status: type === "approve-work-item" ? "preparation_recorded" : "returned_for_rework", nextAction: { ownerType: type === "approve-work-item" ? "system" : "agent" } });
    expect(savedApproval).toMatchObject({ id: approval!.id, workItemId: id, state: type === "approve-work-item" ? "approved" : type === "reject-work-item" ? "rejected" : "invalidated", targetDeliverableId: approval!.targetDeliverableId, targetDeliverableVersion: approval!.targetDeliverableVersion, targetDeliverableHash: approval!.targetDeliverableHash, targetDecisionSnapshotHash: approval!.targetDecisionSnapshotHash, scope: approval!.scope });
    if (type === "return-for-rework") {
      expect(savedItem.currentApprovalId).toBeNull();
      expect(savedItem.reworkInfo).toEqual({ reason, returnedAt: at, returnedBy: actorId });
      expect(savedApproval).toMatchObject({ decisionComment: "returned_for_rework", invalidation: { detectedAt: at, changedBy: { type: "human", id: actorId } } });
    } else {
      expect(savedItem.currentApprovalId).toBe(type === "approve-work-item" ? approval!.id : null);
      expect(savedApproval).toMatchObject({ decidedAt: at, decidedBy: { type: "human", id: actorId } });
      if (type === "reject-work-item") expect(savedApproval.rejectionReason).toBe(reason);
    }

    for (const results of [[QA_SEED_RESULT], []]) {
      const reloaded = createSessionStorageWorkItemRepository(storage);
      expect(await initializeDemoWorkItemsFromResults(results, reloaded, options)).toMatchObject({ ok: true, created: 0 });
      expect(await prepareWorkItemApproval((await reloaded.getWorkItem(id))!, reloaded, at)).toBeNull();
      const items = await reloaded.listWorkItems();
      expect(items).toEqual([savedItem]);
      expect(new Set(items.map(item => item.id)).size).toBe(1);
      expect(await reloaded.listApprovalsByWorkItem(id)).toEqual(savedApprovals);
      expect(projectWorkItemsToDecisionQueue(items, at).cards).toEqual([]);
    }
  });
});
