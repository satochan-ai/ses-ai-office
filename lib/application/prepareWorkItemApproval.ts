import type { Approval, ApprovalSnapshot } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";
import { createApproval, hashDecisionSnapshot } from "@/lib/workItem/approval";

const deliverableId = (item: WorkItem) => `deliverable:${item.id}`;
const deliverableHash = (item: WorkItem) => `demo-${item.sourceVersion}`;

export function approvalSnapshotForWorkItem(item: WorkItem): ApprovalSnapshot {
  const decision = item.proposalDecisions[0];
  return { deliverable: { id: deliverableId(item), version: 1, hash: deliverableHash(item) }, decision: decision ?? { opportunityId: "", personId: "", verdict: "unknown", readiness: "ready_for_human_review", routeStatus: "unknown", intentStatus: "unknown", duplicateStatus: "unknown", startDateStatus: "unknown", disclosureStatus: "unknown", assessedAt: item.updatedAt, evidenceIds: [], blockerMissingInfoIds: [], blockerConflictIds: [] } };
}

export async function prepareWorkItemApproval(item: WorkItem, repository: WorkItemRepository, at: string, unitOfWork?: WorkItemUnitOfWork): Promise<Approval | null> {
  return (unitOfWork ?? getWorkItemUnitOfWork(repository)).run(async repository => {
    const current = await repository.getWorkItem(item.id);
    if (!current) throw new Error("work-item-not-found");
    if (!current.approvalRequired || current.currentApprovalId || current.status === "returned_for_rework" || current.missingInfo.some(info => info.status === "open") || current.proposalDecisions.some(decision => decision.readiness !== "ready_for_human_review")) return null;
    const snapshot = approvalSnapshotForWorkItem(current);
    const approvalId = `approval:${current.id}`;
    const updated: WorkItem = { ...current, status: "awaiting_approval", currentDeliverableId: snapshot.deliverable.id, currentApprovalId: approvalId, updatedAt: at };
    await repository.saveWorkItem(updated);
    const approval = createApproval({ id: approvalId, workItemId: current.id, targetDeliverableId: snapshot.deliverable.id, targetDeliverableVersion: 1, targetDeliverableHash: snapshot.deliverable.hash, targetDecisionSnapshotHash: hashDecisionSnapshot(snapshot.decision), requestedBy: { type: "agent", id: current.assignedAgentId ?? "demo-agent" }, requestedAt: at, scope: { fields: ["proposalRoute", "personIntent", "availabilityStart", "duplicateProposalStatus", "disclosureScope", "decisionEvidence"], permits: ["prepare-only"], conditions: ["human review required"] }, expiresAt: "2099-12-31T00:00:00.000Z", supersedesApprovalId: null });
    await repository.saveApproval(approval);
    return approval;
  });
}
