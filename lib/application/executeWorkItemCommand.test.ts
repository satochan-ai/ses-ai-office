import { describe, expect, it } from "vitest";
import type { Approval, ApprovalSnapshot } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import { hashDecisionSnapshot } from "@/lib/workItem/approval";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";

const decision = { opportunityId: "o", personId: "p", verdict: "unknown" as const, readiness: "blocked" as const, routeStatus: "unknown" as const, intentStatus: "unknown" as const, duplicateStatus: "unknown" as const, startDateStatus: "unknown" as const, disclosureStatus: "unknown" as const, assessedAt: "2026-09-19", evidenceIds: [], blockerMissingInfoIds: [], blockerConflictIds: [] };
const snapshot: ApprovalSnapshot = { deliverable: { id: "d", version: 1, hash: "h" }, decision };
const workItem = (status: WorkItem["status"] = "awaiting_approval", overrides: Partial<WorkItem> = {}): WorkItem => ({ id: "w", kind: "matching-proposal", source: { type: "manual", ref: "x" }, sourceVersion: "1", createdAt: "2026-09-19", updatedAt: "2026-09-19", assignedAgentId: null, assignedHumanId: "human", relations: { opportunityIds: ["o"], personIds: ["p"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status, nextAction: { kind: "approve_or_reject", ownerType: "human" }, dueAt: null, missingInfo: [{ id: "m", workItemId: "w", field: "personIntent", subjectPersonId: "p", question: "?", status: "open", raisedAt: "2026-09-19", resolvedAt: null }], conflicts: [], evidenceIds: [], proposalDecisions: [decision], currentDeliverableId: "d", approvalRequired: true, currentApprovalId: "a", execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null }, mode: "real", schemaVersion: 1, ...overrides });
const approval: Approval = { id: "a", workItemId: "w", targetDeliverableId: "d", targetDeliverableVersion: 1, targetDeliverableHash: "h", targetDecisionSnapshotHash: hashDecisionSnapshot(decision), requestedBy: { type: "agent", id: "agent" }, requestedAt: "2026-09-19", approver: null, decidedBy: null, decidedAt: null, scope: { fields: ["body"], permits: ["prepare-only"], conditions: [] }, expiresAt: "2026-09-20", state: "pending", decisionComment: null, rejectionReason: null, supersedesApprovalId: null, invalidation: null };
const base = { actorId: "human", issuedAt: "2026-09-19T12:00:00Z" };
const ctx = (repo: ReturnType<typeof createInMemoryWorkItemRepository>) => ({ command: { ...base, commandId: "c", workItemId: "w", type: "approve-work-item" as const, approvalId: "a" }, repositories: repo, approvalSnapshots: { a: snapshot }, effectContext: { at: base.issuedAt, actor: { type: "human" as const, id: "human" } } });

describe("execute work item command use case", () => {
  it("loads, executes, and saves approve atomically at the application boundary", async () => {
    const repo = createInMemoryWorkItemRepository({ workItems: [workItem()], approvals: [approval] }); const result = await executeWorkItemCommandUseCase(ctx(repo));
    expect(result).toMatchObject({ ok: true, workItem: { status: "preparation_recorded" }, approval: { state: "approved" }, effectsApplied: 0 }); expect((await repo.getApproval("a"))?.state).toBe("approved");
  });
  it("persists MissingInfo WorkItem and Evidence, then applies effects", async () => {
    const repo = createInMemoryWorkItemRepository({ workItems: [workItem("needs_human_input", { currentApprovalId: null, nextAction: { kind: "provide_human_input", ownerType: "human" } })] }); const result = await executeWorkItemCommandUseCase({ ...ctx(repo), command: { commandId: "c", workItemId: "w", actorId: "human", issuedAt: base.issuedAt, type: "provide-missing-info", missingInfoId: "m", value: { field: "personIntent", status: "confirmed" } } });
    expect(result).toMatchObject({ ok: true, evidence: [{ id: "evidence:missing-info:m:2026-09-19T12:00:00Z" }] }); if (result.ok) expect((await repo.listEvidenceByWorkItem("w"))).toHaveLength(1);
  });
  it("returns not found and does not invoke Domain", async () => {
    const repo = createInMemoryWorkItemRepository(); expect(await executeWorkItemCommandUseCase({ ...ctx(repo), command: { ...ctx(repo).command, commandId: "missing" } })).toMatchObject({ ok: false, code: "work-item-not-found" });
  });
  it("turns effect failure into failure", async () => {
    const repo = createInMemoryWorkItemRepository({ workItems: [workItem("awaiting_approval", { currentApprovalId: "a" })], approvals: [approval] }); const result = await executeWorkItemCommandUseCase({ ...ctx(repo), command: { commandId: "c", workItemId: "w", actorId: "human", issuedAt: base.issuedAt, type: "return-for-rework", reason: "修正" } });
    expect(result).toMatchObject({ ok: true, workItem: { status: "returned_for_rework" } });
  });
});
