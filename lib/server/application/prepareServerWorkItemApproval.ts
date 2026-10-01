import type { Approval, ApprovalSnapshot } from "@/types/approval";
import type { ActorRef, WorkItem } from "@/types/workItem";
import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";
import { createApproval, hashDecisionSnapshot } from "@/lib/workItem/approval";

export type ServerApprovalPreparationInput = {
  workItemId: string;
  approvalId: string;
  unitOfWork: WorkItemUnitOfWork;
  requestedBy: ActorRef;
  at: string;
  expiresAt: string;
  // 将来Serverが同一transactionの最新WorkItemから信頼できるbindingを解決する。
  resolveSnapshot: (current: WorkItem) => ApprovalSnapshot;
};
export type ServerApprovalPreparationResult =
  | { status: "prepared"; workItem: WorkItem; approval: Approval }
  | { status: "not-prepared"; reason: "assignee-required" | "current-approval-exists" | "not-ready" };

// Server専用の未接続境界。担当Humanのtenant所属・資格確認は呼出Serverの責務。
export async function prepareServerWorkItemApproval(input: ServerApprovalPreparationInput): Promise<ServerApprovalPreparationResult> {
  return input.unitOfWork.run(async repository => {
    const current = await repository.getWorkItem(input.workItemId);
    if (!current) throw new Error("work-item-not-found");
    if (current.currentApprovalId) return { status: "not-prepared", reason: "current-approval-exists" };
    if (!current.assignedHumanId?.trim()) return { status: "not-prepared", reason: "assignee-required" };
    if (!current.approvalRequired || current.status === "returned_for_rework" || current.missingInfo.some(info => info.status === "open") || current.proposalDecisions.length === 0 || current.proposalDecisions.some(decision => decision.readiness !== "ready_for_human_review")) return { status: "not-prepared", reason: "not-ready" };
    if (!input.approvalId.trim()) throw new Error("approval-id-required");
    if (await repository.getApproval(input.approvalId)) throw new Error("approval-id-already-exists");
    const snapshot = input.resolveSnapshot(current);
    const approval: Approval = { ...createApproval({
      id: input.approvalId, workItemId: current.id,
      targetDeliverableId: snapshot.deliverable.id, targetDeliverableVersion: snapshot.deliverable.version,
      targetDeliverableHash: snapshot.deliverable.hash, targetDecisionSnapshotHash: hashDecisionSnapshot(snapshot.decision),
      requestedBy: input.requestedBy, requestedAt: input.at,
      scope: { fields: ["proposalRoute", "personIntent", "availabilityStart", "duplicateProposalStatus", "disclosureScope", "decisionEvidence"], permits: ["prepare-only"], conditions: ["human review required"] },
      expiresAt: input.expiresAt, supersedesApprovalId: null,
    }), approver: { type: "human", id: current.assignedHumanId } };
    const updated: WorkItem = { ...current, status: "awaiting_approval", currentDeliverableId: snapshot.deliverable.id, currentApprovalId: approval.id, updatedAt: input.at };
    await repository.saveWorkItem(updated);
    await repository.saveApproval(approval);
    return { status: "prepared", workItem: updated, approval };
  });
}
