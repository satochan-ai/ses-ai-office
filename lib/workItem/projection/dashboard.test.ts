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
  it("classifies blocked decisions with unresolved missing info and preserves all deterministic reasons", () => {
    const fields = ["proposalRoute", "personIntent", "availabilityStart", "informationFreshness", "duplicateProposal", "disclosureScope"] as const;
    const item = base("preparation_recorded", {
      missingInfo: fields.map((field, index) => ({ id: `m${index}`, workItemId: "w1", field, subjectPersonId: null, question: "?", status: "open" as const, raisedAt: now, resolvedAt: null })),
      proposalDecisions: [{ opportunityId: "opp-1", personId: "p", verdict: "unknown", readiness: "blocked", routeStatus: "unknown", intentStatus: "unknown", duplicateStatus: "unknown", startDateStatus: "unknown", disclosureStatus: "unknown", assessedAt: now, evidenceIds: [], blockerMissingInfoIds: [], blockerConflictIds: [] }],
      nextAction: { kind: "provide_human_input", ownerType: "human", label: "提案内容を確認する" },
    });
    const card = projectWorkItemToDecisionCard(item, now);
    expect(card).toMatchObject({ bucket: "missing_info", severity: "warning", requiredHumanAction: "不足情報を確認する" });
    expect(card?.reasonSummary).toEqual(expect.arrayContaining(["提案経路が未確認", "本人意向が未確認", "稼働開始日が未確認", "情報の鮮度を確認する必要があります", "重複提案の確認が必要", "開示範囲が未確認"]));
    expect(new Set(card?.reasonSummary).size).toBe(card?.reasonSummary.length);
  });
  it.each([
    ["new-client-outreach", "顧客への次対応を確認する"],
    ["candidate-screening", "候補者対応を確認する"],
    ["bp-alliance", "BP対応を確認する"],
  ] as const)("uses the human next action label for %s", (kind, label) => {
    const card = projectWorkItemToDecisionCard(base("needs_human_input", { kind, nextAction: { kind: "provide_human_input", ownerType: "human", label } }), now);
    expect(card).toMatchObject({ bucket: "awaiting_human", requiredHumanAction: label });
  });
  it("falls back when a human next action has no label", () => {
    expect(projectWorkItemToDecisionCard(base("needs_human_input", { nextAction: { kind: "provide_human_input", ownerType: "human" } }), now)?.requiredHumanAction).toBe("次の人間タスクを実行する");
  });
  it("keeps higher priority buckets ahead of blocked missing info", () => {
    const blocked = { readiness: "blocked" as const, routeStatus: "unknown" as const, intentStatus: "unknown" as const, duplicateStatus: "unknown" as const, startDateStatus: "unknown" as const, disclosureStatus: "unknown" as const, verdict: "unknown" as const, opportunityId: "o", personId: "p", assessedAt: now, evidenceIds: [], blockerMissingInfoIds: [], blockerConflictIds: [] };
    const missing = [{ id: "m", workItemId: "w1", field: "personIntent" as const, subjectPersonId: null, question: "?", status: "open" as const, raisedAt: now, resolvedAt: null }];
    expect(projectWorkItemToDecisionCard(base("failed_execution", { missingInfo: missing, proposalDecisions: [blocked] }), now)?.bucket).toBe("execution_failed");
    expect(projectWorkItemToDecisionCard(base("awaiting_approval", { missingInfo: missing, proposalDecisions: [blocked] }), now)?.bucket).toBe("awaiting_approval");
    expect(projectWorkItemToDecisionCard(base("needs_human_input", { dueAt: "2026-09-18T00:00:00.000Z", missingInfo: missing, proposalDecisions: [blocked] }), now)?.bucket).toBe("overdue");
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
