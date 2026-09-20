import { describe, expect, it } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";
import type { Approval } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";

const base = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: "wi-1", kind: "matching-proposal", source: { type: "demo-seed", ref: "demo" }, sourceVersion: "v1", createdAt: "2026-09-20T00:00:00Z", updatedAt: "2026-09-20T00:00:00Z", assignedAgentId: "sales", assignedHumanId: "demo-human", relations: { opportunityIds: ["opp-1"], personIds: ["person-1"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status: "preparation_recorded", nextAction: null, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: ["e1"], proposalDecisions: [{ opportunityId: "opp-1", personId: "person-1", verdict: "fit", readiness: "ready_for_human_review", routeStatus: "clear", intentStatus: "confirmed", duplicateStatus: "none", startDateStatus: "matched", disclosureStatus: "defined", assessedAt: "2026-09-20T00:00:00Z", evidenceIds: ["e1"], blockerMissingInfoIds: [], blockerConflictIds: [] }], currentDeliverableId: null, approvalRequired: true, currentApprovalId: null, execution: { attempt: 1, lastAgentId: "sales", lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1, ...overrides });

describe("prepareWorkItemApproval", () => {
  it("creates and persists a pending prepare-only approval with bindings", async () => {
    const repository = createInMemoryWorkItemRepository(); const item = base();
    const approval = await prepareWorkItemApproval(item, repository, "2026-09-20T01:00:00Z");
    expect(approval).toMatchObject({ id: "approval:wi-1", state: "pending", scope: { permits: ["prepare-only"] }, targetDeliverableId: "deliverable:wi-1", targetDeliverableVersion: 1, targetDeliverableHash: "demo-v1" });
    expect((await repository.getWorkItem(item.id))?.currentApprovalId).toBe(approval?.id);
    expect(await repository.getApproval(approval!.id)).toMatchObject({ workItemId: item.id, targetDecisionSnapshotHash: approval!.targetDecisionSnapshotHash });
    const snapshot = approvalSnapshotForWorkItem(item); expect(snapshot.deliverable.hash).toBe(approval?.targetDeliverableHash);
    item.proposalDecisions[0].routeStatus = "conflict"; expect((await repository.getApproval(approval!.id))?.targetDecisionSnapshotHash).toBe(approval?.targetDecisionSnapshotHash);
  });

  it.each<[string, Partial<WorkItem>]>([
    ["blocked readiness", { proposalDecisions: [{ ...base().proposalDecisions[0], readiness: "blocked" }] }],
    ["approval not required", { approvalRequired: false } as unknown as Partial<WorkItem>],
    ["current approval exists", { currentApprovalId: "approval:wi-1" }],
  ])("does not create approval when %s", async (_label, overrides) => {
    const repository = createInMemoryWorkItemRepository(); expect(await prepareWorkItemApproval(base(overrides), repository, "2026-09-20T01:00:00Z")).toBeNull(); expect(await repository.listApprovalsByWorkItem("wi-1")).toHaveLength(0);
  });

  it("does not replace an existing approved or invalidated approval", async () => {
    const item = base({ currentApprovalId: "approval:wi-1" });
    const existing = { ...({} as Approval), id: "approval:wi-1", workItemId: item.id, state: "approved" } as Approval;
    const repository = createInMemoryWorkItemRepository({ approvals: [existing] });
    expect(await prepareWorkItemApproval(item, repository, "2026-09-20T01:00:00Z")).toBeNull(); expect((await repository.getApproval(existing.id))?.state).toBe("approved");
  });

  it("surfaces repository failures without reporting success", async () => {
    const repository = createInMemoryWorkItemRepository(); const failing = { ...repository, saveWorkItem: async () => { throw new Error("repository-error"); } };
    await expect(prepareWorkItemApproval(base(), failing, "2026-09-20T01:00:00Z")).rejects.toThrow("repository-error");
  });
});
