import { describe, expect, it } from "vitest";
import { projectWorkItemToDecisionCard, projectWorkItemsToDecisionQueue } from "./dashboard";
import type { WorkItem, WorkItemStatus } from "@/types/workItem";

const base = (status: WorkItemStatus = "needs_human_input", overrides: Partial<WorkItem> = {}): WorkItem => ({ id: "w1", kind: "opportunity_proposal", source: { type: "manual", ref: "x" }, sourceVersion: "1", createdAt: "2026-09-19T00:00:00.000Z", updatedAt: "2026-09-19T00:00:00.000Z", assignedAgentId: "a", assignedHumanId: "h", relations: { opportunityIds: ["opp-1"], personIds: ["p"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status, nextAction: { kind: "provide_human_input", ownerType: "human" }, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: ["ev"], proposalDecisions: [], currentDeliverableId: null, approvalRequired: true, currentApprovalId: null, execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1, ...overrides });
const now = "2026-09-19T12:00:00.000Z";
describe("dashboard decision queue projection", () => {
  it.each(["failed_execution", "failed_intake"] as const)("projects %s to execution_failed", status => expect(projectWorkItemToDecisionCard(base(status), now)?.bucket).toBe("execution_failed"));
  it("uses bucket priority and excludes terminal work", () => {
    const item = base("awaiting_approval", { dueAt: "2026-09-18T00:00:00.000Z", execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null } });
    expect(projectWorkItemToDecisionCard(item, now)?.bucket).toBe("overdue");
    expect(projectWorkItemToDecisionCard(base("closed"), now)).toBeNull();
  });
  it("projects approval, missing info, conflict, and awaiting human", () => {
    expect(projectWorkItemToDecisionCard(base("approval_invalidated"), now)?.bucket).toBe("awaiting_approval");
    expect(projectWorkItemToDecisionCard(base("blocked_missing_info", { missingInfo: [{ id: "m", workItemId: "w1", field: "personIntent", subjectPersonId: "p", question: "?", status: "open", raisedAt: now, resolvedAt: null }], proposalDecisions: [{ opportunityId: "opp-1", personId: "p", verdict: "unknown", readiness: "blocked", routeStatus: "unknown", intentStatus: "unknown", duplicateStatus: "none", startDateStatus: "unknown", disclosureStatus: "unknown", assessedAt: now, evidenceIds: [], blockerMissingInfoIds: ["m"], blockerConflictIds: [] }] }), now)).toMatchObject({ bucket: "missing_info", severity: "warning" });
    expect(projectWorkItemToDecisionCard(base("blocked_conflict"), now)?.bucket).toBe("missing_info");
    expect(projectWorkItemToDecisionCard(base("needs_human_input"), now)?.bucket).toBe("awaiting_human");
  });
  it("selects the safer decision summary and emits deterministic reasons/actions", () => {
    const card = projectWorkItemToDecisionCard(base("awaiting_approval", { status: "approval_invalidated", proposalDecisions: [{ opportunityId: "o", personId: "p", verdict: "fit", readiness: "ready_for_human_review", routeStatus: "clear", intentStatus: "confirmed", duplicateStatus: "none", startDateStatus: "matched", disclosureStatus: "defined", assessedAt: now, evidenceIds: ["e"], blockerMissingInfoIds: [], blockerConflictIds: [] }, { opportunityId: "o", personId: "p2", verdict: "unknown", readiness: "blocked", routeStatus: "unknown", intentStatus: "stale", duplicateStatus: "possible", startDateStatus: "unknown", disclosureStatus: "unknown", assessedAt: now, evidenceIds: [], blockerMissingInfoIds: [], blockerConflictIds: [] }] }), now);
    expect(card?.proposalDecision?.verdict).toBe("unknown"); expect(card?.severity).toBe("critical"); expect(card?.reasonSummary).toContain("承認後に判断条件が変更"); expect(card?.requiredHumanAction).toContain("再承認");
  });
  it("sets needsDecisionToday, demo flag, and prevents duplicate cards", () => {
    const queue = projectWorkItemsToDecisionQueue([base(), base("failed_execution", { id: "w2", mode: "real" }), base()], now);
    expect(queue.cards).toHaveLength(2); expect(queue.needsDecisionTodayCount).toBe(1); expect(queue.cards.find(card => card.workItemId === "w1")?.isDemo).toBe(true); expect(queue.cards.find(card => card.workItemId === "w2")?.isDemo).toBe(false); expect(queue.buckets.execution_failed).toBe(1);
  });
  it("does not mutate the input", () => { const item = base(); const before = JSON.stringify(item); projectWorkItemToDecisionCard(item, now); expect(JSON.stringify(item)).toBe(before); });
});
