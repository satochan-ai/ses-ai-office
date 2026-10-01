import { describe, expect, it } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import { demoResultsToWorkItems } from "@/lib/runtime/demoAdapter";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import { approvalSnapshotForWorkItem } from "@/lib/application/prepareWorkItemApproval";
import { decideApproval, invalidateApproval } from "@/lib/workItem/approval";
import { returnWorkItemForRework } from "@/lib/workItem/rework";
import { authorizeWorkItemCommand } from "@/lib/server/authorization/workItemAuthorization";
import type { WorkItem } from "@/types/workItem";
import { prepareServerWorkItemApproval } from "./prepareServerWorkItemApproval";

const at = "2026-10-01T00:00:00Z";
const source = demoResultsToWorkItems([QA_SEED_RESULT], { now: at, createWorkItemId: () => "w" })[0];
const ready: WorkItem = { ...source, assignedHumanId: "human-A", missingInfo: [], proposalDecisions: source.proposalDecisions.map(d => ({ ...d, readiness: "ready_for_human_review", verdict: "fit", routeStatus: "clear", intentStatus: "confirmed", duplicateStatus: "none", startDateStatus: "matched", disclosureStatus: "defined" })) };
const fixture = (workItem = ready) => {
  const repository = createInMemoryWorkItemRepository({ workItems: [workItem] });
  const unitOfWork = getWorkItemUnitOfWork(repository);
  return { repository, input: { workItemId: "w", approvalId: "A", unitOfWork, requestedBy: { type: "system" as const, id: "preparer" }, at, expiresAt: "2026-10-02T00:00:00Z", resolveSnapshot: approvalSnapshotForWorkItem } };
};

describe("Server approval preparation alignment", () => {
  it.each(["approve", "reject"] as const)("assigns the latest Human and supports policy + Domain %s", async decision => {
    const { repository, input } = fixture();
    await repository.saveWorkItem({ ...ready, assignedHumanId: "latest-human" });
    const result = await prepareServerWorkItemApproval(input);
    expect(result.status).toBe("prepared");
    if (result.status !== "prepared") throw new Error("expected-prepared");
    expect(result.approval).toMatchObject({ requestedBy: input.requestedBy, approver: { type: "human", id: "latest-human" }, decidedBy: null, scope: { permits: ["prepare-only"] } });
    const policy = { tenantId: "tenant", workItem: result.workItem, approval: result.approval, command: { type: decision === "approve" ? "approve-work-item" as const : "reject-work-item" as const, workItemId: "w", approvalId: "A" } };
    expect(authorizeWorkItemCommand({ ...policy, context: { actor: { actorId: "latest-human", actorType: "human", tenantId: "tenant" }, permissions: [] } })).toEqual({ allowed: true });
    expect(authorizeWorkItemCommand({ ...policy, context: { actor: { actorId: "human-B", actorType: "human", tenantId: "tenant" }, permissions: ["resolve-missing-info"] } })).toMatchObject({ allowed: false, reason: "not_approver" });
    expect(decideApproval({ workItem: result.workItem, approval: result.approval, actor: { type: "human", id: "latest-human" }, decision, issuedAt: at, snapshot: approvalSnapshotForWorkItem(result.workItem), reason: "修正が必要" })).toMatchObject({ ok: true, approval: { approver: { id: "latest-human" }, decidedBy: { id: "latest-human" } } });
  });
  it("does not prepare without an assignee", async () => {
    const current = { ...ready, assignedHumanId: null };
    const { repository, input } = fixture(current);
    expect(await prepareServerWorkItemApproval(input)).toEqual({ status: "not-prepared", reason: "assignee-required" });
    expect(await repository.getWorkItem("w")).toEqual(current);
    expect(await repository.listApprovalsByWorkItem("w")).toEqual([]);
  });
  it("skips duplicate preparation and respects blocked latest state", async () => {
    const { repository, input } = fixture();
    await prepareServerWorkItemApproval(input);
    expect(await prepareServerWorkItemApproval({ ...input, approvalId: "B" })).toEqual({ status: "not-prepared", reason: "current-approval-exists" });
    expect(await repository.listApprovalsByWorkItem("w")).toHaveLength(1);
    await repository.saveWorkItem({ ...ready, proposalDecisions: ready.proposalDecisions.map(d => ({ ...d, readiness: "blocked" })) });
    expect(await prepareServerWorkItemApproval({ ...input, approvalId: "B" })).toEqual({ status: "not-prepared", reason: "not-ready" });
  });
  it("keeps invalidated A unchanged when preparing B and rejects reused IDs", async () => {
    const { repository, input } = fixture();
    const first = await prepareServerWorkItemApproval(input);
    if (first.status !== "prepared") throw new Error("expected-prepared");
    const old = invalidateApproval(first.approval, "superseded", at, { type: "system", id: "preparer" });
    await input.unitOfWork.run(async tx => { await tx.saveApproval(old); await tx.saveWorkItem({ ...first.workItem, currentApprovalId: null }); });
    await expect(prepareServerWorkItemApproval(input)).rejects.toThrow("approval-id-already-exists");
    expect(await prepareServerWorkItemApproval({ ...input, approvalId: "B" })).toMatchObject({ status: "prepared", approval: { id: "B", state: "pending" } });
    expect(await repository.getApproval("A")).toEqual(old);
    expect(await repository.getWorkItem("w")).toMatchObject({ currentApprovalId: "B" });
    expect(await repository.listApprovalsByWorkItem("w")).toHaveLength(2);
  });
  it("rolls back a WorkItem and Approval when Approval save fails", async () => {
    const { repository, input } = fixture();
    const unitOfWork = { run: <T>(operation: Parameters<typeof input.unitOfWork.run<T>>[0]) => input.unitOfWork.run(tx => operation({ ...tx, async saveApproval(approval) { await tx.saveApproval(approval); throw new Error("save-failed"); } })) };
    await expect(prepareServerWorkItemApproval({ ...input, unitOfWork })).rejects.toThrow("save-failed");
    expect(await repository.getWorkItem("w")).toEqual(ready);
    expect(await repository.listApprovalsByWorkItem("w")).toEqual([]);
  });
  it("fails a missing WorkItem without saving", async () => {
    const { repository, input } = fixture();
    await expect(prepareServerWorkItemApproval({ ...input, workItemId: "absent" })).rejects.toThrow("work-item-not-found");
    expect(await repository.listApprovalsByWorkItem("w")).toEqual([]);
  });
  it("keeps the authenticated Return actor identity and denies non-assignees", () => {
    const workItem = { ...ready, status: "quality_check" as const };
    const policy = (actorId: string) => authorizeWorkItemCommand({ tenantId: "tenant", workItem, command: { type: "return-for-rework", workItemId: "w" }, context: { actor: { actorId, actorType: "human", tenantId: "tenant" }, permissions: ["resolve-missing-info"] } });
    expect(policy("human-A")).toEqual({ allowed: true });
    expect(policy("human-B")).toMatchObject({ allowed: false });
    expect(returnWorkItemForRework({ workItem, actorId: "human-A", returnedAt: at, reason: "修正" })).toMatchObject({ ok: true, workItem: { reworkInfo: { returnedBy: "human-A" } } });
  });
});
