import type { ActorRef, ProposalDecision, WorkItem } from "@/types/workItem";

export type ApprovalState = "pending" | "approved" | "rejected" | "on_hold" | "expired" | "invalidated" | "withdrawn";
export type ApprovalInvalidationReason = "deliverable_changed" | "proposal_decision_changed" | "returned_for_rework" | "expired" | "cancelled" | "superseded";
export type ApprovalPermit = "prepare-only" | "send-external" | "register-record";

export type ApprovalGuardedField =
  | "body" | "subject" | "rate" | "recipients" | "attachments" | "disclosedFields" | "personIds"
  | "proposalRoute" | "personIntent" | "availabilityStart" | "duplicateProposalStatus"
  | "disclosureScope" | "decisionEvidence";

export type ApprovalScope = {
  fields: ApprovalGuardedField[];
  permits: ["prepare-only"];
  conditions: string[];
};

export type ApprovalInvalidation = {
  detectedAt: string;
  changedFields: ApprovalGuardedField[];
  previousHash: string;
  currentHash: string;
  changedBy: ActorRef;
};

export type Approval = {
  id: string;
  workItemId: WorkItem["id"];
  targetDeliverableId: string;
  targetDeliverableVersion: number;
  targetDeliverableHash: string;
  targetDecisionSnapshotHash: string;
  requestedBy: ActorRef;
  requestedAt: string;
  approver: ActorRef | null;
  decidedBy: ActorRef | null;
  decidedAt: string | null;
  scope: ApprovalScope;
  expiresAt: string;
  state: ApprovalState;
  decisionComment: string | null;
  rejectionReason: string | null;
  supersedesApprovalId: string | null;
  invalidation: ApprovalInvalidation | null;
};

export type ApprovalSnapshot = {
  deliverable: { id: string; version: number; hash: string; body?: string; subject?: string; rate?: string | number | null; recipients?: string[]; attachments?: string[]; disclosedFields?: string[]; personIds?: string[] };
  decision: ProposalDecision;
};

export type ApprovalDecisionInput = {
  workItem: WorkItem;
  approval: Approval;
  actor: ActorRef;
  decision: "approve" | "reject";
  issuedAt: string;
  snapshot: ApprovalSnapshot;
  reason?: string;
};

export type ApprovalDecisionResult =
  | { ok: true; workItem: WorkItem; approval: Approval }
  | { ok: false; code: "invalid-state" | "approval-mismatch" | "actor-not-authorized" | "binding-mismatch" | "missing-reason" | "domain-rejected"; message: string };
