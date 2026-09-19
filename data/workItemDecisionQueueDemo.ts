import type { WorkItem } from "@/types/workItem";

const base = (id: string, status: WorkItem["status"], dueAt: string | null, overrides: Partial<WorkItem> = {}): WorkItem => ({
  id, kind: "opportunity_proposal", source: { type: "manual", ref: `demo-${id}` }, sourceVersion: "demo-v1", createdAt: "2026-09-19T08:00:00.000Z", updatedAt: "2026-09-19T08:00:00.000Z", assignedAgentId: "demo-agent-sales", assignedHumanId: "demo-human-1",
  relations: { opportunityIds: [`demo-opportunity-${id}`], personIds: ["demo-person-1"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status, nextAction: { kind: "provide_human_input", ownerType: "human" }, dueAt, missingInfo: [], conflicts: [], evidenceIds: ["demo-evidence-1"], proposalDecisions: [], currentDeliverableId: null, approvalRequired: true, currentApprovalId: null, execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1, ...overrides,
});
const decision = (overrides: Partial<NonNullable<WorkItem["proposalDecisions"]>[number]> = {}) => ({ opportunityId: "demo-opportunity", personId: "demo-person-1", verdict: "unknown" as const, readiness: "ready_for_human_review" as const, routeStatus: "unknown" as const, intentStatus: "unknown" as const, duplicateStatus: "none" as const, startDateStatus: "matched" as const, disclosureStatus: "defined" as const, assessedAt: "2026-09-19T08:00:00.000Z", evidenceIds: ["demo-evidence-1"], blockerMissingInfoIds: [], blockerConflictIds: [], ...overrides });
export const WORK_ITEM_DECISION_QUEUE_DEMO_NOW = "2026-09-19T12:00:00.000Z";
export const workItemDecisionQueueDemo: WorkItem[] = [
  base("demo-failed", "failed_execution", null, { execution: { attempt: 1, lastAgentId: "demo-agent-sales", lastError: { code: "DEMO_TIMEOUT", message: "デモ処理がタイムアウトしました", at: "2026-09-19T11:40:00.000Z" }, resumeStatus: "quality_check" } }),
  base("demo-overdue", "needs_human_input", "2026-09-18T17:00:00.000Z", { nextAction: { kind: "provide_human_input", ownerType: "human" }, proposalDecisions: [decision({ verdict: "fit", routeStatus: "clear" })] }),
  base("demo-approval", "awaiting_approval", "2026-09-19T18:00:00.000Z", { nextAction: { kind: "approve_or_reject", ownerType: "human" }, proposalDecisions: [decision({ verdict: "fit", routeStatus: "clear", intentStatus: "confirmed" })] }),
  base("demo-missing", "blocked_missing_info", null, { missingInfo: [{ id: "demo-missing-info", workItemId: "demo-missing", field: "personIntent", subjectPersonId: "demo-person-1", question: "本人の提案意向を確認", status: "open", raisedAt: "2026-09-19T08:00:00.000Z", resolvedAt: null }], proposalDecisions: [decision({ readiness: "blocked", blockerMissingInfoIds: ["demo-missing-info"] })] }),
  base("demo-duplicate", "needs_human_input", "2026-09-19T20:00:00.000Z", { proposalDecisions: [decision({ verdict: "unknown", duplicateStatus: "possible", intentStatus: "stale", routeStatus: "unknown" })] }),
  base("demo-human", "needs_human_input", null, { nextAction: { kind: "provide_human_input", ownerType: "human" }, proposalDecisions: [decision({ verdict: "unknown", intentStatus: "stale" })] }),
];
