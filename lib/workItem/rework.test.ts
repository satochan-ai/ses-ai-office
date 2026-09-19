import { describe, expect, it } from "vitest";
import type { WorkItem } from "@/types/workItem";
import { returnWorkItemForRework } from "./rework";

const item = (status: WorkItem["status"] = "quality_check", overrides: Partial<WorkItem> = {}): WorkItem => ({ id: "w", kind: "matching-proposal", source: { type: "manual", ref: "x" }, sourceVersion: "1", createdAt: "2026-09-19", updatedAt: "2026-09-19", assignedAgentId: "a", assignedHumanId: "h", relations: { opportunityIds: ["o"], personIds: ["p"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status, nextAction: { kind: "run_agent", ownerType: "agent" }, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: ["e"], proposalDecisions: [{ opportunityId: "o", personId: "p", verdict: "unknown", readiness: "blocked", routeStatus: "unknown", intentStatus: "unknown", duplicateStatus: "unknown", startDateStatus: "unknown", disclosureStatus: "unknown", assessedAt: "2026-09-19", evidenceIds: [], blockerMissingInfoIds: [], blockerConflictIds: [] }], currentDeliverableId: "d", approvalRequired: true, currentApprovalId: null, execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null }, mode: "real", schemaVersion: 1, ...overrides });
const input = { actorId: "h", returnedAt: "2026-09-19T12:00:00Z", reason: "  内容を修正する  " };

describe("standalone return for rework", () => {
  it("uses the formal trigger and preserves deliverable, decisions, and missing info", () => {
    const workItem = item("awaiting_approval", { currentApprovalId: "ap1" }); const before = JSON.stringify(workItem);
    const result = returnWorkItemForRework({ ...input, workItem });
    expect(result).toMatchObject({ ok: true, workItem: { status: "returned_for_rework", reworkInfo: { reason: "内容を修正する", returnedAt: input.returnedAt, returnedBy: "h" } } });
    if (result.ok) expect(result.effects).toEqual(expect.arrayContaining([expect.objectContaining({ type: "invalidate-approval", reason: "returned_for_rework" })]));
    expect(JSON.stringify(workItem)).toBe(before);
    if (result.ok) { expect(result.workItem.currentDeliverableId).toBe("d"); expect(result.workItem.proposalDecisions).toEqual(workItem.proposalDecisions); expect(result.workItem.missingInfo).toEqual(workItem.missingInfo); }
  });
  it.each(["closed", "cancelled", "superseded", "intake_received"] as const)("rejects invalid status %s", status => expect(returnWorkItemForRework({ ...input, workItem: item(status) })).toMatchObject({ ok: false, code: "invalid-state" }));
  it("rejects blank reasons, unauthorized actors, and avoids invalidation without approval", () => {
    expect(returnWorkItemForRework({ ...input, reason: "   ", workItem: item() })).toMatchObject({ ok: false, code: "missing-reason" });
    expect(returnWorkItemForRework({ ...input, actorId: "other", workItem: item() })).toMatchObject({ ok: false, code: "actor-not-authorized" });
    const result = returnWorkItemForRework({ ...input, workItem: item("preparation_recorded") });
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.effects.some(effect => effect.type === "invalidate-approval")).toBe(false);
  });
});
