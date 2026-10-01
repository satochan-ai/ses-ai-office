import type { WorkItem } from "@/types/workItem";
import type { Approval } from "@/types/approval";
export type AgentActivity = "idle" | "working" | "handoff" | "waiting_human" | "reviewing" | "completed";
export type ActivityFrame = { agentId: string | null; activity: AgentActivity; text: string; handoff?: { from: string; to: string } };
function projectBaseActivity(item: WorkItem | undefined, approval?: Approval): ActivityFrame {
  if (!item) return { agentId: null, activity: "idle", text: "デモを開始すると仕事の流れを確認できます" };
  const agentId = item.assignedAgentId ?? item.execution.lastAgentId;
  if (["closed", "cancelled", "superseded"].includes(item.status) || approval?.state === "approved") return { agentId, activity: "completed", text: approval?.state === "approved" ? "Human確認完了（外部送信なし）" : "工程完了" };
  if (item.currentApprovalId && approval?.id === item.currentApprovalId && approval.state === "pending") return { agentId, activity: "waiting_human", text: "提案準備完了・Human確認待ち" };
  if (["blocked_missing_info", "needs_human_input", "blocked_conflict"].includes(item.status) || (item.status === "preparation_recorded" && item.missingInfo.some(info => info.status === "open"))) return { agentId, activity: "waiting_human", text: "Human回答待ち・確認事項があります" };
  if (item.status === "returned_for_rework") return { agentId, activity: "working", text: "修正依頼を確認中…" };
  const text = item.status === "structuring" ? "案件条件を整理中…" : ["candidate_search", "condition_match"].includes(item.status) ? "候補者を比較中…" : item.status === "info_gap_check" ? "提案可否を再判定中…" : "提案内容を確認中…";
  return { agentId, activity: ["draft_generation", "quality_check"].includes(item.status) ? "reviewing" : "working", text };
}
export function projectAgentActivity(item: WorkItem | undefined, approval?: Approval): ActivityFrame {
  const frame = projectBaseActivity(item, approval);
  if (item?.kind !== "new-client-outreach") return frame;
  const text = frame.activity === "completed" ? "Human文案確認完了（未送信）"
    : item.status === "returned_for_rework" ? "文案の修正が必要です"
    : frame.activity === "waiting_human" ? "文案準備完了・Human確認待ち（送信許可ではありません）"
    : item.assignedAgentId === "newbiz" ? "アプローチ候補企業を整理中…" : "接点と文案を確認中…";
  return { ...frame, text };
}
export function projectHandoff(before: WorkItem, after: WorkItem): ActivityFrame | null {
  const from = before.assignedAgentId, to = after.assignedAgentId;
  return before.id === after.id && from && to && from !== to ? { agentId: to, activity: "handoff", text: "次のAI社員へ引き継ぎ済み", handoff: { from, to } } : null;
}
// timerは既にRepositoryへ反映した工程の表示順だけを進める。
export function nextPresentationIndex(index: number, length: number): number { return Math.min(index + 1, Math.max(0, length - 1)); }
