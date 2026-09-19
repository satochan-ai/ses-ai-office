import { describe, expect, it } from "vitest";
import { createApproval, decideApproval, detectApprovalInvalidation, hashDecisionSnapshot, normalizeDecision } from "./approval";
import type { ApprovalSnapshot } from "@/types/approval";
import type { ProposalDecision, WorkItem } from "@/types/workItem";

const decision: ProposalDecision = { opportunityId: "o", personId: "p", verdict: "fit", readiness: "ready_for_human_review", routeStatus: "clear", intentStatus: "confirmed", duplicateStatus: "none", startDateStatus: "matched", disclosureStatus: "defined", assessedAt: "2026-09-19", evidenceIds: ["b", "a"], blockerMissingInfoIds: [], blockerConflictIds: [] };
const snapshot = (d = decision): ApprovalSnapshot => ({ deliverable: { id: "d", version: 1, hash: "dh", body: "x" }, decision: d });
const approval = (d = decision) => createApproval({ id: "a", workItemId: "w", targetDeliverableId: "d", targetDeliverableVersion: 1, targetDeliverableHash: "dh", targetDecisionSnapshotHash: hashDecisionSnapshot(d), requestedBy: { type: "agent", id: "a" }, requestedAt: "2026-09-19", scope: { fields: ["body", "proposalRoute", "personIntent", "duplicateProposalStatus", "decisionEvidence"], permits: ["prepare-only"], conditions: [] }, expiresAt: "2026-09-20", supersedesApprovalId: null });
const item = (overrides: Partial<WorkItem> = {}): WorkItem => ({ id: "w", kind: "opportunity_proposal", source: { type: "manual", ref: "x" }, sourceVersion: "1", createdAt: "2026-09-19", updatedAt: "2026-09-19", assignedAgentId: null, assignedHumanId: "h", relations: { opportunityIds: ["o"], personIds: ["p"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status: "awaiting_approval", nextAction: { kind: "approve_or_reject", ownerType: "human" }, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: ["a"], proposalDecisions: [decision], currentDeliverableId: "d", approvalRequired: true, currentApprovalId: "a", execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null }, mode: "real", schemaVersion: 1, ...overrides });

describe("approval domain", () => {
  it("normalizes evidence order for the decision snapshot hash", () => {
    expect(hashDecisionSnapshot(decision)).toBe(hashDecisionSnapshot({ ...decision, evidenceIds: ["a", "b"] }));
    expect(normalizeDecision(decision)).toContain("opportunityId");
  });
  it("rejects future permits", () => {
    expect(() => createApproval({ ...approval(), scope: { fields: [], permits: ["send-external"] as never, conditions: [] } })).toThrow();
  });
  it.each(["deliverable", "decision"] as const)("invalidates when %s changes", kind => {
    const a = approval();
    const current = kind === "deliverable" ? { ...snapshot(), deliverable: { ...snapshot().deliverable, hash: "changed" } } : snapshot({ ...decision, routeStatus: "conflict" });
    expect(detectApprovalInvalidation(a, current, { type: "human", id: "h" }, "2026-09-19")?.changedFields.length).toBeGreaterThan(0);
  });
  it("keeps unchanged approval valid", () => expect(detectApprovalInvalidation(approval(), snapshot(), { type: "human", id: "h" }, "now")).toBeNull());
  it("atomically approves the Work Item and Approval while retaining prepare-only", () => {
    const result = decideApproval({ workItem: item(), approval: approval(), actor: { type: "human", id: "h" }, decision: "approve", issuedAt: "2026-09-19T12:00:00Z", snapshot: snapshot() });
    expect(result).toMatchObject({ ok: true, workItem: { status: "preparation_recorded" }, approval: { state: "approved", decidedAt: "2026-09-19T12:00:00Z", decidedBy: { id: "h" }, scope: { permits: ["prepare-only"] } } });
  });
  it("rejects binding or actor mismatches without mutating inputs", () => {
    const a = approval(); const w = item(); const before = JSON.stringify({ a, w });
    expect(decideApproval({ workItem: w, approval: a, actor: { type: "human", id: "other" }, decision: "approve", issuedAt: "now", snapshot: snapshot() })).toMatchObject({ ok: false, code: "actor-not-authorized" });
    expect(decideApproval({ workItem: w, approval: a, actor: { type: "human", id: "h" }, decision: "approve", issuedAt: "now", snapshot: { ...snapshot(), deliverable: { ...snapshot().deliverable, hash: "changed" } } })).toMatchObject({ ok: false, code: "binding-mismatch" });
    expect(JSON.stringify({ a, w })).toBe(before);
  });
  it("rejects with a reason and records rejection history", () => {
    const result = decideApproval({ workItem: item(), approval: approval(), actor: { type: "human", id: "h" }, decision: "reject", issuedAt: "2026-09-19T12:00:00Z", reason: "条件を見直す", snapshot: snapshot() });
    expect(result).toMatchObject({ ok: true, workItem: { status: "returned_for_rework" }, approval: { state: "rejected", rejectionReason: "条件を見直す", decisionComment: "条件を見直す" } });
    expect(decideApproval({ workItem: item(), approval: approval(), actor: { type: "human", id: "h" }, decision: "reject", issuedAt: "now", reason: " ", snapshot: snapshot() })).toMatchObject({ ok: false, code: "missing-reason" });
  });
});
