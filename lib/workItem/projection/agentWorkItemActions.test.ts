import { describe, expect, it } from "vitest";
import { canRejectWorkItem, canReturnForRework, hasCommandReason, nextActionState } from "./agentWorkItemActions";
import type { Approval } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";

const item = (status: WorkItem["status"] = "awaiting_approval", id = "wi-1"): WorkItem => ({ id, kind: "matching-proposal", source: { type: "manual", ref: "x" }, sourceVersion: "1", createdAt: "2026-09-20", updatedAt: "2026-09-20", assignedAgentId: "agent", assignedHumanId: "demo-human", relations: { opportunityIds: [], personIds: [], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status, nextAction: null, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: [], proposalDecisions: [], currentDeliverableId: "d", approvalRequired: true, currentApprovalId: "approval:wi-1", execution: { attempt: 1, lastAgentId: "agent", lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1 });
const approval = (state: Approval["state"] = "pending", workItemId = "wi-1"): Approval => ({ id: "approval:wi-1", workItemId, targetDeliverableId: "d", targetDeliverableVersion: 1, targetDeliverableHash: "h", targetDecisionSnapshotHash: "s", requestedBy: { type: "agent", id: "agent" }, requestedAt: "2026-09-20", approver: null, decidedBy: null, decidedAt: null, scope: { fields: [], permits: ["prepare-only"], conditions: [] }, expiresAt: "2099-01-01", state, decisionComment: null, rejectionReason: null, supersedesApprovalId: null, invalidation: null });

describe("Visual Office WorkItem action boundaries", () => {
  it.each([["pending", "pending"], ["approved", "approved"], ["rejected", "rejected"], ["invalidated", "invalidated"]] as const)("reject is based on current pending approval: %s", (_label, state) => {
    expect(canRejectWorkItem(item(), approval(state))).toBe(state === "pending");
  });
  it("reject rejects missing or mismatched approvals", () => {
    expect(canRejectWorkItem(item(), null)).toBe(false);
    expect(canRejectWorkItem(item(), approval("pending", "other"))).toBe(false);
  });
  it("return uses the existing transition rules", () => {
    expect(canReturnForRework(item("awaiting_approval"))).toBe(true);
    expect(canReturnForRework(item("quality_check"))).toBe(true);
    expect(canReturnForRework(item("closed"))).toBe(false);
  });
  it("requires a non-blank reason", () => { expect(hasCommandReason("")).toBe(false); expect(hasCommandReason(" ")).toBe(false); expect(hasCommandReason("修正理由")).toBe(true); });
  it("keeps reject and return actions mutually exclusive while submitting", () => { expect(nextActionState(nextActionState("idle", "edit"), "submit")).toBe("submitting"); expect(nextActionState("submitting", "submit")).toBe("submitting"); });
  it("supports cancel and keeps failed commands out of success state", () => { expect(nextActionState("editing", "cancel")).toBe("idle"); expect(nextActionState("submitting", "error")).toBe("error"); });
});
