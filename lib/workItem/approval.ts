import type { Approval, ApprovalGuardedField, ApprovalInvalidation, ApprovalSnapshot } from "@/types/approval";
import type { ActorRef, ProposalDecision } from "@/types/workItem";

const FIELDS: ApprovalGuardedField[] = ["body", "subject", "rate", "recipients", "attachments", "disclosedFields", "personIds", "proposalRoute", "personIntent", "availabilityStart", "duplicateProposalStatus", "disclosureScope", "decisionEvidence"];

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).sort().join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function normalizeDecision(decision: ProposalDecision): string {
  return stable({ opportunityId: decision.opportunityId, personId: decision.personId, verdict: decision.verdict, readiness: decision.readiness, routeStatus: decision.routeStatus, intentStatus: decision.intentStatus, duplicateStatus: decision.duplicateStatus, startDateStatus: decision.startDateStatus, disclosureStatus: decision.disclosureStatus, evidenceIds: [...decision.evidenceIds].sort() });
}

export function hashDecisionSnapshot(decision: ProposalDecision): string { return hash(normalizeDecision(decision)); }

export function createApproval(input: Omit<Approval, "state" | "approver" | "decidedAt" | "decisionComment" | "invalidation">): Approval {
  if (input.scope.permits.length !== 1 || input.scope.permits[0] !== "prepare-only") throw new Error("MVP approvals permit prepare-only only");
  return { ...input, state: "pending", approver: null, decidedAt: null, decisionComment: null, invalidation: null };
}

export function detectApprovalInvalidation(approval: Approval, snapshot: ApprovalSnapshot, changedBy: ActorRef, detectedAt: string): ApprovalInvalidation | null {
  const changed: ApprovalGuardedField[] = [];
  if (snapshot.deliverable.hash !== approval.targetDeliverableHash) {
    for (const field of FIELDS.slice(0, 7)) if (approval.scope.fields.includes(field)) changed.push(field);
    if (changed.length === 0) changed.push("body");
  }
  const current = hashDecisionSnapshot(snapshot.decision);
  if (current !== approval.targetDecisionSnapshotHash && approval.scope.fields.some(field => FIELDS.slice(7).includes(field))) {
    changed.push(...FIELDS.slice(7).filter(field => approval.scope.fields.includes(field)));
  }
  if (changed.length === 0) return null;
  return { detectedAt, changedFields: [...new Set(changed)], previousHash: approval.targetDecisionSnapshotHash, currentHash: current, changedBy };
}
