import type { Approval, ApprovalSnapshot } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { createApproval, hashDecisionSnapshot } from "@/lib/workItem/approval";

const deliverableId = (item: WorkItem) => `deliverable:${item.id}`;
const deliverableHash = (item: WorkItem) => `demo-${item.sourceVersion}`;

export function approvalSnapshotForWorkItem(item: WorkItem): ApprovalSnapshot {
  const decision = item.proposalDecisions[0];
  return { deliverable: { id: deliverableId(item), version: 1, hash: deliverableHash(item) }, decision: decision ?? { opportunityId: "", personId: "", verdict: "unknown", readiness: "ready_for_human_review", routeStatus: "unknown", intentStatus: "unknown", duplicateStatus: "unknown", startDateStatus: "unknown", disclosureStatus: "unknown", assessedAt: item.updatedAt, evidenceIds: [], blockerMissingInfoIds: [], blockerConflictIds: [] } };
}

export async function prepareWorkItemApproval(item: WorkItem, repository: WorkItemRepository, at: string): Promise<Approval | null> {
  if (!item.approvalRequired || item.currentApprovalId || item.status === "returned_for_rework" || item.missingInfo.some(info => info.status === "open") || item.proposalDecisions.some(decision => decision.readiness !== "ready_for_human_review")) return null;
  const snapshot = approvalSnapshotForWorkItem(item);
  const approvalId = `approval:${item.id}`;
  const updated: WorkItem = { ...item, status: "awaiting_approval", currentDeliverableId: snapshot.deliverable.id, currentApprovalId: approvalId, updatedAt: at };
  await repository.saveWorkItem(updated);
  const approval = createApproval({ id: approvalId, workItemId: item.id, targetDeliverableId: snapshot.deliverable.id, targetDeliverableVersion: 1, targetDeliverableHash: snapshot.deliverable.hash, targetDecisionSnapshotHash: hashDecisionSnapshot(snapshot.decision), requestedBy: { type: "agent", id: item.assignedAgentId ?? "demo-agent" }, requestedAt: at, scope: { fields: ["proposalRoute", "personIntent", "availabilityStart", "duplicateProposalStatus", "disclosureScope", "decisionEvidence"], permits: ["prepare-only"], conditions: ["human review required"] }, expiresAt: "2099-12-31T00:00:00.000Z", supersedesApprovalId: null });
  await repository.saveApproval(approval);
  return approval;
}
