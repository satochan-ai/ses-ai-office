import { describe, expect, it } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";
import type { Approval } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";

const base = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: "wi-1", kind: "matching-proposal", source: { type: "demo-seed", ref: "demo" }, sourceVersion: "v1", createdAt: "2026-09-20T00:00:00Z", updatedAt: "2026-09-20T00:00:00Z", assignedAgentId: "sales", assignedHumanId: "demo-human", relations: { opportunityIds: ["opp-1"], personIds: ["person-1"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status: "preparation_recorded", nextAction: null, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: ["e1"], proposalDecisions: [{ opportunityId: "opp-1", personId: "person-1", verdict: "fit", readiness: "ready_for_human_review", routeStatus: "clear", intentStatus: "confirmed", duplicateStatus: "none", startDateStatus: "matched", disclosureStatus: "defined", assessedAt: "2026-09-20T00:00:00Z", evidenceIds: ["e1"], blockerMissingInfoIds: [], blockerConflictIds: [] }], currentDeliverableId: null, approvalRequired: true, currentApprovalId: null, execution: { attempt: 1, lastAgentId: "sales", lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1, ...overrides });

describe("prepareWorkItemApproval", () => {
  it("uses eligible repository state despite a blocked stale caller", async () => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base({ sourceVersion: "latest" })] });
    const caller = base({ status: "returned_for_rework", currentApprovalId: "stale" });
    expect(await prepareWorkItemApproval(caller, repository, "2026-09-20T01:00:00Z")).toMatchObject({ state: "pending", targetDeliverableHash: "demo-latest" });
  });
  it("respects blocked repository state despite an eligible caller", async () => {
    const current = base({ proposalDecisions: [{ ...base().proposalDecisions[0], readiness: "blocked" }] });
    const repository = createInMemoryWorkItemRepository({ workItems: [current] });
    expect(await prepareWorkItemApproval(base(), repository, "2026-09-20T01:00:00Z")).toBeNull();
    expect(await repository.getWorkItem(current.id)).toEqual(current);
    expect(await repository.listApprovalsByWorkItem(current.id)).toEqual([]);
  });
  it("respects the current repository approval id instead of duplicating preparation", async () => {
    const current = base({ currentApprovalId: "already-existing" });
    const repository = createInMemoryWorkItemRepository({ workItems: [current] });
    expect(await prepareWorkItemApproval(base(), repository, "2026-09-20T01:00:00Z")).toBeNull();
    expect(await repository.getWorkItem(current.id)).toEqual(current);
    expect(await repository.listApprovalsByWorkItem(current.id)).toEqual([]);
  });
  it("throws the existing not-found error when repository WorkItem is absent", async () => {
    const repository = createInMemoryWorkItemRepository();
    await expect(prepareWorkItemApproval(base(), repository, "2026-09-20T01:00:00Z")).rejects.toThrow("work-item-not-found");
    expect(await repository.listWorkItems()).toEqual([]);
    expect(await repository.listApprovalsByWorkItem("wi-1")).toEqual([]);
  });
  it.each(["approve-work-item", "reject-work-item", "return-for-rework"] as const)("executes %s after preparation and preserves its decision on bootstrap", async type => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base()] });
    const approval = await prepareWorkItemApproval(base(), repository, "2026-09-20T01:00:00Z");
    const prepared = (await repository.getWorkItem("wi-1"))!;
    const reason = "提案条件を再確認してください";
    const command = { type, commandId: `test-${type}`, workItemId: prepared.id, approvalId: approval!.id, actorId: "demo-human", issuedAt: "2026-09-20T02:00:00Z", reason };
    expect(await executeWorkItemCommandUseCase({ command, repositories: repository, approvalSnapshots: { [approval!.id]: approvalSnapshotForWorkItem(prepared) }, effectContext: { at: command.issuedAt, actor: { type: "human", id: "demo-human" } } })).toMatchObject({ ok: true });
    const saved = (await repository.getWorkItem(prepared.id))!;
    expect(saved.status).toBe(type === "approve-work-item" ? "preparation_recorded" : "returned_for_rework");
    expect(await repository.getApproval(approval!.id)).toMatchObject({ state: type === "approve-work-item" ? "approved" : type === "reject-work-item" ? "rejected" : "invalidated" });
    if (type === "return-for-rework") {
      expect(saved).toMatchObject({ currentApprovalId: null, reworkInfo: { reason, returnedBy: "demo-human", returnedAt: command.issuedAt } });
      expect(await repository.getApproval(approval!.id)).toMatchObject({ decisionComment: "returned_for_rework" });
    }
    if (type === "reject-work-item") expect(await repository.getApproval(approval!.id)).toMatchObject({ rejectionReason: reason });
    expect(await prepareWorkItemApproval(saved, repository, "2026-09-20T03:00:00Z")).toBeNull();
    expect(await repository.listApprovalsByWorkItem(saved.id)).toHaveLength(1);
  });

  it("creates and persists a pending prepare-only approval with bindings", async () => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base()] }); const item = base();
    const approval = await prepareWorkItemApproval(item, repository, "2026-09-20T01:00:00Z");
    expect(approval).toMatchObject({ id: "approval:wi-1", state: "pending", scope: { permits: ["prepare-only"] }, targetDeliverableId: "deliverable:wi-1", targetDeliverableVersion: 1, targetDeliverableHash: "demo-v1" });
    expect(await repository.getWorkItem(item.id)).toMatchObject({ currentApprovalId: approval?.id, status: "awaiting_approval" });
    expect(await repository.getApproval(approval!.id)).toMatchObject({ workItemId: item.id, targetDecisionSnapshotHash: approval!.targetDecisionSnapshotHash });
    const snapshot = approvalSnapshotForWorkItem(item); expect(snapshot.deliverable.hash).toBe(approval?.targetDeliverableHash);
    item.proposalDecisions[0].routeStatus = "conflict"; expect((await repository.getApproval(approval!.id))?.targetDecisionSnapshotHash).toBe(approval?.targetDecisionSnapshotHash);
  });

  it.each<[string, Partial<WorkItem>]>([
    ["returned for rework", { status: "returned_for_rework" }],
    ["unresolved information", { missingInfo: [{ status: "open" } as WorkItem["missingInfo"][number]] }],
    ["blocked readiness", { proposalDecisions: [{ ...base().proposalDecisions[0], readiness: "blocked" }] }],
    ["approval not required", { approvalRequired: false } as unknown as Partial<WorkItem>],
    ["current approval exists", { currentApprovalId: "approval:wi-1" }],
  ])("does not create approval when %s", async (_label, overrides) => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base(overrides)] }); expect(await prepareWorkItemApproval(base(overrides), repository, "2026-09-20T01:00:00Z")).toBeNull(); expect(await repository.listApprovalsByWorkItem("wi-1")).toHaveLength(0);
  });

  it("does not replace an existing approved or invalidated approval", async () => {
    const item = base({ currentApprovalId: "approval:wi-1" });
    const existing = { ...({} as Approval), id: "approval:wi-1", workItemId: item.id, state: "approved" } as Approval;
    const repository = createInMemoryWorkItemRepository({ workItems: [item], approvals: [existing] });
    expect(await prepareWorkItemApproval(item, repository, "2026-09-20T01:00:00Z")).toBeNull(); expect((await repository.getApproval(existing.id))?.state).toBe("approved");
  });

  it("surfaces repository failures without reporting success", async () => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base()] }); const failing = { ...repository, saveWorkItem: async () => { throw new Error("repository-error"); } };
    await expect(prepareWorkItemApproval(base(), failing, "2026-09-20T01:00:00Z")).rejects.toThrow("repository-error");
  });
});
