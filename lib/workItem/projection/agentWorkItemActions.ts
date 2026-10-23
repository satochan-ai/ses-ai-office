import type { Approval } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import { transition } from "@/lib/workItem/stateMachine";

export function canRejectWorkItem(workItem: WorkItem, approval: Approval | null): boolean {
  return approval !== null && approval.state === "pending" && workItem.currentApprovalId === approval.id && approval.workItemId === workItem.id;
}

/**
 * 詳細パネルで「承認する／承認しない／修正を依頼」を出してよいか。承認待ちのWorkItemが、保存済みの同じIDの
 * pending Approvalを現在の確認対象として持つ場合だけ。承認済み・却下・差し戻し・置換済み・不整合では出さない。
 */
export function canShowApprovalDecisions(workItem: Pick<WorkItem, "id" | "status" | "currentApprovalId">, approval: Approval | null | undefined): boolean {
  return workItem.status === "awaiting_approval" && workItem.currentApprovalId !== null && approval != null
    && approval.id === workItem.currentApprovalId && approval.workItemId === workItem.id && approval.state === "pending";
}

export function canReturnForRework(workItem: WorkItem): boolean {
  const actorId = workItem.assignedHumanId ?? "demo-human";
  return transition(workItem, { type: "human-returned-for-rework", at: workItem.updatedAt, humanId: actorId, reason: "boundary-test" }).ok;
}

export function hasCommandReason(reason: string): boolean { return reason.trim().length > 0; }

type HumanCommandResult = { ok: true } | { ok: false; message: string };

/** 詳細パネルの開閉より長く生存する、Visual Officeの実行guard。 */
export function createHumanCommandGuard() {
  let busy = false;
  return {
    isBusy: () => busy,
    async run(action: () => Promise<HumanCommandResult>): Promise<HumanCommandResult> {
      if (busy) return { ok: false, message: "処理中です。完了までお待ちください" };
      busy = true;
      try { return await action(); }
      finally { busy = false; }
    },
  };
}

export type WorkItemActionState = "idle" | "editing" | "submitting" | "success" | "error";
export function nextActionState(current: WorkItemActionState, event: "edit" | "submit" | "success" | "error" | "cancel"): WorkItemActionState {
  if (event === "cancel") return "idle";
  if (event === "edit" && current === "idle") return "editing";
  if (event === "submit" && current === "editing") return "submitting";
  if (event === "success" && current === "submitting") return "success";
  if (event === "error" && current === "submitting") return "error";
  return current;
}
