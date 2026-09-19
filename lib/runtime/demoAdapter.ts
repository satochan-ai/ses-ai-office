import type { OfficeV3DemoResult } from "@/types/officeV3ClaudeDemo";
import type { Evidence, MissingInfo, NextAction, ProposalDecision, WorkItem, WorkItemKind } from "@/types/workItem";
import type { DecisionQueue } from "@/types/decisionQueue";
import { projectWorkItemsToDecisionQueue } from "@/lib/workItem/projection/dashboard";

export type DemoAdapterOptions = {
  now: string;
  createWorkItemId: (result: OfficeV3DemoResult, index?: number) => string;
};

function stableVersion(result: OfficeV3DemoResult): string {
  return `demo-v2-${result.scenarioId}-${result.completedAt}-${result.resultTitle}`;
}

function nextAction(result: OfficeV3DemoResult): NextAction {
  const labels: Record<OfficeV3DemoResult["scenarioId"], string> = {
    "matching-proposal": "提案内容を確認する",
    "new-client-outreach": "顧客への次対応を確認する",
    "candidate-screening": "候補者対応を確認する",
    "bp-alliance": "BP対応を確認する",
  };
  return { kind: "provide_human_input", ownerType: "human", actor: "human", label: labels[result.scenarioId], dueAt: null };
}

function relations(result: OfficeV3DemoResult): WorkItem["relations"] {
  const base = { opportunityIds: [], personIds: [], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null };
  switch (result.scenarioId) {
    case "matching-proposal": return { ...base, opportunityIds: [result.opportunityId] };
    case "new-client-outreach": return { ...base, clientIds: [result.prospectId] };
    case "candidate-screening": return { ...base, personIds: [result.candidateId] };
    case "bp-alliance": return { ...base, partnerIds: [result.partnerId] };
  }
}

function kind(result: OfficeV3DemoResult): WorkItemKind {
  switch (result.scenarioId) {
    case "matching-proposal": return "matching-proposal";
    case "new-client-outreach": return "new-client-outreach";
    case "candidate-screening": return "candidate-screening";
    case "bp-alliance": return "bp-alliance";
  }
}

function evidence(result: OfficeV3DemoResult, workItemId: string, now: string, sourceVersion: string): Evidence {
  return { id: `demo-evidence:${result.scenarioId}`, workItemId, kind: "source_excerpt", claim: `Demo Result: ${result.resultTitle}`, sourceRef: `demo-result:${result.scenarioId}`, sourceVersion, excerpt: result.resultSummary, producedBy: { type: "system", id: "demo-adapter" }, producedAt: now, observedAt: result.completedAt, verifiedAt: null, validUntil: null };
}

function proposalDecision(result: Extract<OfficeV3DemoResult, { scenarioId: "matching-proposal" }>): ProposalDecision {
  return { opportunityId: result.opportunityId, personId: "", verdict: "unknown", readiness: "blocked", routeStatus: "unknown", intentStatus: "unknown", duplicateStatus: "unknown", startDateStatus: "unknown", disclosureStatus: "unknown", assessedAt: result.completedAt, evidenceIds: [`demo-evidence:${result.scenarioId}`], blockerMissingInfoIds: [], blockerConflictIds: [] };
}

function missingInfo(result: OfficeV3DemoResult, workItemId: string, now: string): MissingInfo[] {
  if (result.scenarioId !== "matching-proposal") return [];
  return (["proposalRoute", "personIntent", "availabilityStart", "duplicateProposal", "disclosureScope", "informationFreshness"] as const).map(field => ({ id: `demo-missing:${result.scenarioId}:${field}`, workItemId, field, subjectPersonId: null, question: `${field}はDemo Resultに含まれていません`, status: "open" as const, raisedAt: now, resolvedAt: null }));
}

export function demoResultToWorkItem(result: OfficeV3DemoResult, options: DemoAdapterOptions): WorkItem {
  const id = options.createWorkItemId(result);
  const sourceVersion = stableVersion(result);
  const ev = evidence(result, id, options.now, sourceVersion);
  const decisions = result.scenarioId === "matching-proposal" ? [proposalDecision(result)] : [];
  return { id, kind: kind(result), source: { type: "demo-seed", ref: `demo-result:${result.scenarioId}` }, sourceVersion, createdAt: options.now, updatedAt: options.now, assignedAgentId: result.finalAgentId, assignedHumanId: "demo-human", relations: relations(result), status: "preparation_recorded", nextAction: nextAction(result), dueAt: null, missingInfo: missingInfo(result, id, options.now), conflicts: [], evidenceIds: [ev.id], proposalDecisions: decisions, currentDeliverableId: null, approvalRequired: true, currentApprovalId: null, execution: { attempt: 1, lastAgentId: result.finalAgentId, lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1 };
}

export function demoResultsToWorkItems(results: OfficeV3DemoResult[], options: DemoAdapterOptions): WorkItem[] {
  return results.map((result, index) => demoResultToWorkItem(result, { ...options, createWorkItemId: item => options.createWorkItemId(item, index) }));
}

export function buildDecisionQueueFromDemoResults(results: OfficeV3DemoResult[], now: string): DecisionQueue {
  const items = demoResultsToWorkItems(results, { now, createWorkItemId: result => `wi-demo-${result.scenarioId}` });
  return projectWorkItemsToDecisionQueue(items, now);
}
