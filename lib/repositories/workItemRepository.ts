import type { ActorRef } from "@/types/workItem";
import type { ApprovalInvalidationReason } from "@/types/approval";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { invalidateApproval } from "@/lib/workItem/approval";

export type ApplyDomainEffectsContext = { at: string; actor: ActorRef };
export async function applyApprovalInvalidationEffect(effect: { type: "invalidate-approval"; approvalId: string; reason: ApprovalInvalidationReason }, repositories: WorkItemRepository, context: ApplyDomainEffectsContext): Promise<void> {
  const approval = await repositories.getApproval(effect.approvalId);
  if (!approval) throw new Error("approval-not-found");
  const updated = invalidateApproval(approval, effect.reason, context.at, context.actor);
  await repositories.saveApproval(updated);
}

export async function applyDomainEffects(effects: Array<{ type: "invalidate-approval"; approvalId: string; reason: ApprovalInvalidationReason }>, repositories: WorkItemRepository, context: ApplyDomainEffectsContext): Promise<void> {
  for (const effect of effects) await applyApprovalInvalidationEffect(effect, repositories, context);
}
