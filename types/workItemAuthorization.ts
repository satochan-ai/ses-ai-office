import type { ServerActorContext } from "@/lib/server/serverActorContext";
import type { ActorRef, WorkItem } from "./workItem";
import type { Approval } from "./approval";

export type WorkItemPermission = "resolve-missing-info";
// ServerActorContextを基礎に、非Humanを明示的に拒否できる入力境界。
export type WorkItemAuthorizationContext = {
  actor: Omit<ServerActorContext, "actorType"> & { actorType: ActorRef["type"] };
  permissions: readonly WorkItemPermission[];
};
export type AuthorizationCommand = { workItemId: string } & (
  | { type: "approve-work-item" | "reject-work-item"; approvalId: string }
  | { type: "return-for-rework" }
  | { type: "provide-missing-info"; missingInfoId: string }
);
export type AuthorizationDenialReason =
  | "tenant_mismatch" | "human_actor_required" | "command_not_permitted"
  | "not_approver" | "not_assigned" | "permission_required" | "approval_not_current"
  | "approval_not_pending" | "missing_info_not_found";
export type AuthorizationResult = { allowed: true } | { allowed: false; reason: AuthorizationDenialReason };
export type WorkItemAuthorizationInput = {
  context: WorkItemAuthorizationContext;
  tenantId: string;
  workItem: WorkItem;
  approval?: Approval | null;
  command: AuthorizationCommand;
};
