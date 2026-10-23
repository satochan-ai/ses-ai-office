import type { Approval, ApprovalSnapshot } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";
import { createApproval, hashDecisionSnapshot } from "@/lib/workItem/approval";

/**
 * 承認準備を許可する状態の明示リスト。既存の呼び出し元（Demo結果のpreparation_recorded、手入力のblocked_missing_info、
 * 候補者のneeds_human_input、案件マッチングのdraft_generation）と準備前の作業状態だけ。
 * 終了状態（closed・cancelled・superseded）・差し戻し・承認待ち・回復待ちなどは、列挙していないため通らない。
 */
const PREPARABLE_STATUSES = new Set<WorkItem["status"]>(["preparation_recorded", "blocked_missing_info", "needs_human_input", "info_gap_check", "draft_generation", "quality_check"]);
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
    if (current.kind === "candidate-screening" && current.candidateContext && current.candidateContext.personIntent.status !== "confirmed") return null;
    if (!PREPARABLE_STATUSES.has(current.status)) return null;
    if (!current.approvalRequired || current.currentApprovalId || current.status === "returned_for_rework" || current.missingInfo.some(info => info.status === "open") || current.proposalDecisions.some(decision => decision.readiness !== "ready_for_human_review")) return null;
    const snapshot = approvalSnapshotForWorkItem(current);
    const approvalId = `approval:${current.id}`;
    // 同じIDの記録（pending・approved・rejected・invalidated等）は上書きせず、業務状態も変えない。
    if (await repository.getApproval(approvalId)) return null;
    const updated: WorkItem = { ...current, status: "awaiting_approval", currentDeliverableId: snapshot.deliverable.id, currentApprovalId: approvalId, updatedAt: at };
    await repository.saveWorkItem(updated);
    const approval = createApproval({ id: approvalId, workItemId: current.id, targetDeliverableId: snapshot.deliverable.id, targetDeliverableVersion: 1, targetDeliverableHash: snapshot.deliverable.hash, targetDecisionSnapshotHash: hashDecisionSnapshot(snapshot.decision), requestedBy: { type: "agent", id: current.assignedAgentId ?? "demo-agent" }, requestedAt: at, scope: { fields: ["proposalRoute", "personIntent", "availabilityStart", "duplicateProposalStatus", "disclosureScope", "decisionEvidence"], permits: ["prepare-only"], conditions: ["human review required"] }, expiresAt: "2099-12-31T00:00:00.000Z", supersedesApprovalId: null });
    await repository.saveApproval(approval);
    return approval;
  });
}
