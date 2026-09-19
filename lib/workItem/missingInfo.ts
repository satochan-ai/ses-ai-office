import type { MissingInfoResolutionValue } from "@/types/workItemResolution";
import type { Evidence, ProposalDecision, WorkItem } from "@/types/workItem";
import type { DomainEffect } from "./stateMachine";

export type ResolveMissingInfoInput = { workItem: WorkItem; missingInfoId: string; actorId: string; resolvedAt: string; value: MissingInfoResolutionValue };
export type ResolveMissingInfoResult =
  | { ok: true; workItem: WorkItem; resolvedMissingInfoId: string; evidenceId: string; evidence: Evidence; effects: DomainEffect[] }
  | { ok: false; code: "missing-info-not-found" | "missing-info-already-resolved" | "invalid-resolution" | "proposal-decision-not-found" | "unsupported-missing-info-field" | "domain-rejected"; message: string };

const fail = (code: ResolveMissingInfoResult extends infer R ? R extends { ok: false; code: infer C } ? C : never : never, message: string): ResolveMissingInfoResult => ({ ok: false, code, message });
const knownFields = new Set(["proposalRoute", "personIntent", "availabilityStart", "informationFreshness", "duplicateProposal", "disclosureScope"]);

function updateDecision(decision: ProposalDecision, value: MissingInfoResolutionValue): ProposalDecision {
  const next = { ...decision };
  if (value.field === "proposalRoute") next.routeStatus = value.status;
  if (value.field === "personIntent") next.intentStatus = value.status;
  if (value.field === "availabilityStart") next.startDateStatus = value.status;
  if (value.field === "duplicateProposal") next.duplicateStatus = value.status;
  if (value.field === "disclosureScope") next.disclosureStatus = value.status;
  return next;
}
function readiness(decision: ProposalDecision, unresolved: WorkItem["missingInfo"], conflicts: WorkItem["conflicts"]): ProposalDecision["readiness"] {
  if (decision.verdict === "unfit") return "not_recommended";
  if (unresolved.length > 0 || conflicts.some(conflict => conflict.status === "open") || decision.routeStatus === "conflict" || decision.intentStatus === "declined" || decision.duplicateStatus === "confirmed" || decision.startDateStatus === "mismatched" || decision.disclosureStatus !== "defined") return "blocked";
  return "ready_for_human_review";
}

export function resolveMissingInfo(input: ResolveMissingInfoInput): ResolveMissingInfoResult {
  const info = input.workItem.missingInfo.find(candidate => candidate.id === input.missingInfoId);
  if (!info) return fail("missing-info-not-found", "Missing information was not found.");
  if (info.status !== "open") return fail("missing-info-already-resolved", "Missing information is already resolved.");
  if (!knownFields.has(info.field) || info.field !== input.value.field) return fail("unsupported-missing-info-field", "Resolution field does not match the MissingInfo field.");
  if (input.value.field === "availabilityStart" && !input.value.date?.trim()) return fail("invalid-resolution", "Availability start date is required.");
  const target = input.workItem.proposalDecisions.find(decision => info.subjectPersonId === null || decision.personId === info.subjectPersonId);
  if (!target) return fail("proposal-decision-not-found", "Proposal decision was not found.");
  const evidenceId = `evidence:missing-info:${info.id}:${input.resolvedAt}`;
  const evidence: Evidence = { id: evidenceId, workItemId: input.workItem.id, kind: "human_confirmation", claim: `${info.field} resolved`, sourceRef: `human:${input.actorId}`, sourceVersion: "1", excerpt: ("note" in input.value ? input.value.note : undefined) ?? JSON.stringify(input.value), producedBy: { type: "human", id: input.actorId }, producedAt: input.resolvedAt, observedAt: input.resolvedAt, verifiedAt: input.resolvedAt, validUntil: null };
  const resolved = { ...info, status: "resolved" as const, resolvedAt: input.resolvedAt, resolvedBy: { type: "human" as const, id: input.actorId }, resolution: JSON.stringify(input.value) };
  const missingInfo = input.workItem.missingInfo.map(candidate => candidate.id === info.id ? resolved : candidate);
  const proposalDecisions = input.workItem.proposalDecisions.map(decision => {
    if (decision !== target) return decision;
    const updated = updateDecision(decision, input.value);
    return { ...updated, readiness: readiness(updated, missingInfo.filter(candidate => candidate.status === "open"), input.workItem.conflicts) };
  });
  const updated: WorkItem = { ...input.workItem, updatedAt: input.resolvedAt, missingInfo, evidenceIds: [...input.workItem.evidenceIds, evidenceId], proposalDecisions };
  const effects: DomainEffect[] = [{ type: "record-execution", workItemId: input.workItem.id, from: input.workItem.status, to: updated.status, trigger: "human-input-provided", at: input.resolvedAt, actorId: input.actorId, detail: `resolved:${info.id}` }];
  if (input.workItem.currentApprovalId && JSON.stringify(target) !== JSON.stringify(proposalDecisions.find(decision => decision.opportunityId === target.opportunityId && decision.personId === target.personId))) effects.push({ type: "invalidate-approval", workItemId: input.workItem.id, approvalId: input.workItem.currentApprovalId, reason: "deliverable_changed" });
  return { ok: true, workItem: updated, resolvedMissingInfoId: info.id, evidenceId, evidence, effects };
}
