import type { AuthorizationDenialReason, AuthorizationResult, WorkItemAuthorizationInput } from "@/types/workItemAuthorization";

const deny = (reason: AuthorizationDenialReason): AuthorizationResult => ({ allowed: false, reason });

// 権限だけを判定する。状態遷移・binding・理由・期限の検証はDomainに委ねる。
export function authorizeWorkItemCommand(input: WorkItemAuthorizationInput): AuthorizationResult {
  const { context, tenantId, workItem, approval, command } = input;
  const { actor, permissions } = context;
  if (actor.tenantId !== tenantId) return deny("tenant_mismatch");
  if (actor.actorType !== "human") return deny("human_actor_required");
  if (command.workItemId !== workItem.id) return deny("command_not_permitted");
  switch (command.type) {
    case "approve-work-item":
    case "reject-work-item":
      if (!workItem.currentApprovalId || command.approvalId !== workItem.currentApprovalId || !approval || approval.id !== command.approvalId || approval.workItemId !== workItem.id) return deny("approval_not_current");
      if (approval.state !== "pending") return deny("approval_not_pending");
      if (approval.approver?.type !== "human" || approval.approver.id !== actor.actorId) return deny("not_approver");
      return { allowed: true };
    case "return-for-rework":
      return workItem.assignedHumanId !== null && workItem.assignedHumanId === actor.actorId ? { allowed: true } : deny("not_assigned");
    case "provide-missing-info":
      if (!workItem.missingInfo.some(info => info.id === command.missingInfoId)) return deny("missing_info_not_found");
      return workItem.assignedHumanId === actor.actorId || permissions.includes("resolve-missing-info") ? { allowed: true } : deny("permission_required");
    default:
      return deny("command_not_permitted");
  }
}
