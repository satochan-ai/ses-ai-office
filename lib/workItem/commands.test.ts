import { describe, expect, it } from "vitest";
import type { Approval, ApprovalSnapshot } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import { executeWorkItemCommand } from "./commands";
import { hashDecisionSnapshot } from "./approval";

const item = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: "w1", kind: "opportunity_proposal", source: { type: "manual", ref: "x" }, sourceVersion: "1", createdAt: "2026-09-19T00:00:00.000Z", updatedAt: "2026-09-19T00:00:00.000Z", assignedAgentId: null, assignedHumanId: "human-1", relations: { opportunityIds: ["o1"], personIds: ["p1"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status: "awaiting_approval", nextAction: { kind: "approve_or_reject", ownerType: "human" }, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: ["e1"], proposalDecisions: [], currentDeliverableId: "d1", approvalRequired: true, currentApprovalId: "ap1", execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1, ...overrides,
});
const decision = { opportunityId: "o1", personId: "p1", verdict: "unknown" as const, readiness: "blocked" as const, routeStatus: "unknown" as const, intentStatus: "unknown" as const, duplicateStatus: "unknown" as const, startDateStatus: "unknown" as const, disclosureStatus: "unknown" as const, assessedAt: "2026-09-19", evidenceIds: ["e1"], blockerMissingInfoIds: [], blockerConflictIds: [] };
const snapshot: ApprovalSnapshot = { deliverable: { id: "d1", version: 1, hash: "hash" }, decision };
const approval = (overrides: Partial<Approval> = {}): Approval => ({ id: "ap1", workItemId: "w1", targetDeliverableId: "d1", targetDeliverableVersion: 1, targetDeliverableHash: "hash", targetDecisionSnapshotHash: hashDecisionSnapshot(decision), requestedBy: { type: "agent", id: "agent-1" }, requestedAt: "2026-09-19T00:00:00.000Z", approver: null, decidedBy: null, decidedAt: null, scope: { fields: ["body"], permits: ["prepare-only"], conditions: [] }, expiresAt: "2026-09-20T00:00:00.000Z", state: "pending", decisionComment: null, rejectionReason: null, supersedesApprovalId: null, invalidation: null, ...overrides });
const context = (overrides: Partial<WorkItem> = {}, approvals: Approval[] = [approval()]) => ({ workItem: item(overrides), approvals, approvalSnapshots: { ap1: snapshot } });
const base = { workItemId: "w1", actorId: "human-1", issuedAt: "2026-09-19T12:00:00.000Z" };

describe("human work item commands", () => {
  it("approves through the state machine without external execution", () => {
    const result = executeWorkItemCommand({ ...base, type: "approve-work-item", commandId: "c1", approvalId: "ap1" }, context());
    expect(result).toMatchObject({ ok: true, commandId: "c1", workItem: { status: "preparation_recorded" } });
    if (result.ok) expect(result.workItem.execution.lastError).toBeNull();
  });
  it("rejects approval mismatch, unauthorized actor, and invalid approval state", () => {
    expect(executeWorkItemCommand({ ...base, type: "approve-work-item", commandId: "c1", approvalId: "missing" }, context())).toMatchObject({ ok: false, code: "approval-not-found" });
    expect(executeWorkItemCommand({ ...base, actorId: "other", type: "approve-work-item", commandId: "c2", approvalId: "ap1" }, context())).toMatchObject({ ok: false, code: "actor-not-authorized" });
    expect(executeWorkItemCommand({ ...base, type: "approve-work-item", commandId: "c3", approvalId: "ap1" }, context({}, [approval({ state: "approved" })]))).toMatchObject({ ok: false, code: "invalid-state" });
  });
  it("rejects with a reason through the state machine", () => {
    const result = executeWorkItemCommand({ ...base, type: "reject-work-item", commandId: "c1", approvalId: "ap1", reason: "条件を見直す" }, context());
    expect(result).toMatchObject({ ok: true, workItem: { status: "returned_for_rework" } });
    expect(executeWorkItemCommand({ ...base, type: "reject-work-item", commandId: "c2", approvalId: "ap1", reason: " " }, context())).toMatchObject({ ok: false, code: "missing-reason" });
  });
  it("reports unsupported domain capabilities safely", () => {
    expect(executeWorkItemCommand({ ...base, type: "return-for-rework", commandId: "c1", reason: "修正" }, context())).toMatchObject({ ok: true, workItem: { status: "returned_for_rework" } });
    expect(executeWorkItemCommand({ ...base, type: "provide-missing-info", commandId: "c2", missingInfoId: "unknown", value: { field: "personIntent", status: "confirmed" } }, context())).toMatchObject({ ok: false, code: "missing-info-not-found" });
    expect(executeWorkItemCommand({ ...base, type: "provide-missing-info", commandId: "c3", missingInfoId: "m1", value: { field: "personIntent", status: "confirmed" } }, context({ proposalDecisions: [decision], missingInfo: [{ id: "m1", workItemId: "w1", field: "personIntent", subjectPersonId: null, question: "?", status: "open", raisedAt: base.issuedAt, resolvedAt: null }] }))).toMatchObject({ ok: true, data: { evidenceId: "evidence:missing-info:m1:2026-09-19T12:00:00.000Z" } });
    expect(executeWorkItemCommand({ ...base, type: "provide-missing-info", commandId: "c4", missingInfoId: "m1", value: { field: "availabilityStart", status: "matched" } }, context({ missingInfo: [{ id: "m1", workItemId: "w1", field: "availabilityStart", subjectPersonId: null, question: "?", status: "open", raisedAt: base.issuedAt, resolvedAt: null }] }))).toMatchObject({ ok: false, code: "invalid-command" });
  });
  it("does not mutate command context and works for real mode", () => {
    const ctx = context({ mode: "real" }); const before = JSON.stringify(ctx);
    executeWorkItemCommand({ ...base, type: "approve-work-item", commandId: "c1", approvalId: "ap1" }, ctx);
    expect(JSON.stringify(ctx)).toBe(before);
  });
});
