import { describe, expect, it } from "vitest";
import type { Approval } from "@/types/approval";
import type { Evidence, WorkItem } from "@/types/workItem";
import { applyApprovalInvalidationEffect } from "./workItemRepository";
import { createInMemoryWorkItemRepository } from "./inMemoryWorkItemRepository";

const workItem = (id: string): WorkItem => ({ id, kind: "matching-proposal", source: { type: "manual", ref: "x" }, sourceVersion: "1", createdAt: "2026-09-19", updatedAt: "2026-09-19", assignedAgentId: null, assignedHumanId: "h", relations: { opportunityIds: [], personIds: [], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status: "needs_human_input", nextAction: null, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: [], proposalDecisions: [], currentDeliverableId: null, approvalRequired: true, currentApprovalId: null, execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1 });
const approval = (id: string, workItemId: string): Approval => ({ id, workItemId, targetDeliverableId: "d", targetDeliverableVersion: 1, targetDeliverableHash: "h", targetDecisionSnapshotHash: "s", requestedBy: { type: "agent", id: "a" }, requestedAt: "2026-09-19", approver: null, decidedBy: null, decidedAt: null, scope: { fields: [], permits: ["prepare-only"], conditions: [] }, expiresAt: "2026-09-20", state: "pending", decisionComment: null, rejectionReason: null, supersedesApprovalId: null, invalidation: null });
const evidence = (id: string, workItemId: string): Evidence => ({ id, workItemId, kind: "human_confirmation", claim: "x", sourceRef: "human:h", sourceVersion: "1", excerpt: "x", producedBy: { type: "human", id: "h" }, producedAt: "2026-09-19", observedAt: null, verifiedAt: "2026-09-19", validUntil: null });

describe("in-memory work item repository", () => {
  it("saves, gets, updates, lists deterministically, and returns null when missing", async () => {
    const repo = createInMemoryWorkItemRepository(); await repo.saveWorkItem(workItem("b")); await repo.saveWorkItem(workItem("a"));
    expect((await repo.getWorkItem("a"))?.id).toBe("a"); expect(await repo.getWorkItem("missing")).toBeNull(); expect((await repo.listWorkItems()).map(item => item.id)).toEqual(["a", "b"]);
    await repo.saveWorkItem({ ...workItem("a"), updatedAt: "later" }); expect((await repo.getWorkItem("a"))?.updatedAt).toBe("later");
  });
  it("clones WorkItem, Approval, and Evidence on save and get", async () => {
    const w = workItem("w"); const a = approval("a", "w"); const e = evidence("e", "w"); const repo = createInMemoryWorkItemRepository(); await repo.saveWorkItem(w); await repo.saveApproval(a); await repo.saveEvidence(e);
    w.status = "closed"; a.state = "rejected"; e.claim = "changed";
    const gotW = await repo.getWorkItem("w"); const gotA = await repo.getApproval("a"); const gotE = await repo.getEvidence("e");
    expect(gotW?.status).toBe("needs_human_input"); expect(gotA?.state).toBe("pending"); expect(gotE?.claim).toBe("x");
    if (gotW && gotA && gotE) { gotW.status = "closed"; gotA.state = "rejected"; gotE.claim = "changed"; }
    expect((await repo.getWorkItem("w"))?.status).toBe("needs_human_input"); expect((await repo.getApproval("a"))?.state).toBe("pending"); expect((await repo.getEvidence("e"))?.claim).toBe("x");
  });
  it("lists approvals and evidence by WorkItem", async () => {
    const repo = createInMemoryWorkItemRepository({ approvals: [approval("a2", "w2"), approval("a1", "w1")], evidence: [evidence("e2", "w2"), evidence("e1", "w1")] });
    expect((await repo.listApprovalsByWorkItem("w1")).map(item => item.id)).toEqual(["a1"]); expect((await repo.listEvidenceByWorkItem("w1")).map(item => item.id)).toEqual(["e1"]);
  });
  it("applies invalidation effects through the Approval Domain API", async () => {
    const repo = createInMemoryWorkItemRepository({ approvals: [approval("a1", "w1")] }); await applyApprovalInvalidationEffect({ type: "invalidate-approval", approvalId: "a1", reason: "proposal_decision_changed" }, repo, { at: "2026-09-19T12:00:00Z", actor: { type: "human", id: "h" } });
    expect(await repo.getApproval("a1")).toMatchObject({ state: "invalidated", decisionComment: "proposal_decision_changed", invalidation: { changedBy: { id: "h" } } });
    await expect(applyApprovalInvalidationEffect({ type: "invalidate-approval", approvalId: "missing", reason: "expired" }, repo, { at: "now", actor: { type: "system", id: "s" } })).rejects.toThrow("approval-not-found");
  });
});
