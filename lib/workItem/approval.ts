import type { Approval, ApprovalGuardedField, ApprovalInvalidation, ApprovalSnapshot, ApprovalInvalidationReason } from "@/types/approval";
import type { ActorRef, ProposalDecision } from "@/types/workItem";
import type { ApprovalDecisionInput, ApprovalDecisionResult } from "@/types/approval";
import { transition } from "./stateMachine";

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

export function createApproval(input: Omit<Approval, "state" | "approver" | "decidedBy" | "decidedAt" | "decisionComment" | "rejectionReason" | "invalidation">): Approval {
  if (input.scope.permits.length !== 1 || input.scope.permits[0] !== "prepare-only") throw new Error("MVP approvals permit prepare-only only");
  return { ...input, state: "pending", approver: null, decidedBy: null, decidedAt: null, decisionComment: null, rejectionReason: null, invalidation: null };
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

/** ApprovalとWork Itemの判断結果を同時に確定する純粋なDomain API。保存は呼び出し側に委譲する。 */
export function decideApproval(input: ApprovalDecisionInput): ApprovalDecisionResult {
  const { workItem, approval, actor, decision, issuedAt, snapshot } = input;
  if (approval.state !== "pending") return { ok: false, code: "invalid-state", message: "Only a pending approval can be decided." };
  if (approval.workItemId !== workItem.id || workItem.currentApprovalId !== approval.id) return { ok: false, code: "approval-mismatch", message: "Approval does not match the current Work Item." };
  if (actor.type !== "human" || workItem.assignedHumanId !== actor.id || (approval.approver !== null && approval.approver.id !== actor.id)) return { ok: false, code: "actor-not-authorized", message: "Actor is not authorized for this approval." };
  if (workItem.currentDeliverableId !== approval.targetDeliverableId || snapshot.deliverable.id !== approval.targetDeliverableId || snapshot.deliverable.version !== approval.targetDeliverableVersion || snapshot.deliverable.hash !== approval.targetDeliverableHash || hashDecisionSnapshot(snapshot.decision) !== approval.targetDecisionSnapshotHash) return { ok: false, code: "binding-mismatch", message: "Approval binding does not match the current snapshot." };
  if (approval.scope.permits.length !== 1 || approval.scope.permits[0] !== "prepare-only") return { ok: false, code: "binding-mismatch", message: "Approval scope is outside the MVP prepare-only boundary." };
  if (decision === "reject" && !input.reason?.trim()) return { ok: false, code: "missing-reason", message: "Reject reason is required." };
  const result = transition(workItem, decision === "approve"
    ? { type: "human-approved", at: issuedAt, humanId: actor.id, approvalId: approval.id, approvalState: approval.state }
    : { type: "human-rejected", at: issuedAt, humanId: actor.id, approvalId: approval.id, reason: input.reason });
  if (!result.ok) return { ok: false, code: "domain-rejected", message: result.error.message };
  const updatedApproval: Approval = { ...approval, state: decision === "approve" ? "approved" : "rejected", approver: actor, decidedBy: actor, decidedAt: issuedAt, decisionComment: decision === "reject" ? input.reason!.trim() : approval.decisionComment, rejectionReason: decision === "reject" ? input.reason!.trim() : null };
  return { ok: true, workItem: result.item, approval: updatedApproval };
}

export function invalidateApproval(approval: Approval, reason: ApprovalInvalidationReason, at: string, changedBy: ActorRef): Approval {
  if (approval.state !== "pending") throw new Error("invalid-state");
  return { ...approval, state: "invalidated", invalidation: { detectedAt: at, changedFields: [], previousHash: approval.targetDecisionSnapshotHash, currentHash: approval.targetDecisionSnapshotHash, changedBy }, decisionComment: reason };
}
