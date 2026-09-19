import { describe, expect, it } from "vitest";
import { createApproval, detectApprovalInvalidation, hashDecisionSnapshot, normalizeDecision } from "./approval";
import type { ApprovalSnapshot } from "@/types/approval";
import type { ProposalDecision } from "@/types/workItem";

const decision: ProposalDecision = { opportunityId: "o", personId: "p", verdict: "fit", readiness: "ready_for_human_review", routeStatus: "clear", intentStatus: "confirmed", duplicateStatus: "none", startDateStatus: "matched", disclosureStatus: "defined", assessedAt: "2026-09-19", evidenceIds: ["b", "a"], blockerMissingInfoIds: [], blockerConflictIds: [] };
const snapshot = (d = decision): ApprovalSnapshot => ({ deliverable: { id: "d", version: 1, hash: "dh", body: "x" }, decision: d });
const approval = (d = decision) => createApproval({ id: "a", workItemId: "w", targetDeliverableId: "d", targetDeliverableVersion: 1, targetDeliverableHash: "dh", targetDecisionSnapshotHash: hashDecisionSnapshot(d), requestedBy: { type: "agent", id: "a" }, requestedAt: "2026-09-19", scope: { fields: ["body", "proposalRoute", "personIntent", "duplicateProposalStatus", "decisionEvidence"], permits: ["prepare-only"], conditions: [] }, expiresAt: "2026-09-20", supersedesApprovalId: null });

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
});
