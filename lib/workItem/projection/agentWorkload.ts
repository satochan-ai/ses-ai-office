import { projectWorkItemToDecisionCard } from "@/lib/workItem/projection/dashboard";
import type { DecisionQueueBucket } from "@/types/decisionQueue";
import type { WorkItem, WorkItemKind, WorkItemStatus } from "@/types/workItem";

export type AgentWorkItemCard = {
  id: string;
  kind: WorkItemKind;
  kindLabel: string;
  status: WorkItemStatus;
  statusLabel: string;
  bucket: DecisionQueueBucket | null;
  needsHumanDecision: boolean;
  nextAction: string;
  isDemo: boolean;
  missingInfo: WorkItem["missingInfo"];
};

export type AgentWorkload = {
  agentId: string;
  total: number;
  needsHumanDecision: number;
  missingInfo: number;
  rework: number;
  items: AgentWorkItemCard[];
};

const KIND_LABEL: Record<WorkItemKind, string> = {
  "matching-proposal": "案件・人材提案",
  "new-client-outreach": "新規顧客開拓",
  "candidate-screening": "採用候補者対応",
  "bp-alliance": "BP連携",
  "engineer-follow": "稼働フォロー",
  opportunity_proposal: "案件提案",
};

const STATUS_LABEL: Partial<Record<WorkItemStatus, string>> = {
  preparation_recorded: "準備完了",
  awaiting_approval: "承認待ち",
  approval_invalidated: "再承認待ち",
  returned_for_rework: "差し戻し",
  blocked_missing_info: "情報不足",
  info_gap_check: "不足情報確認",
  blocked_conflict: "条件矛盾",
  needs_human_input: "人間対応待ち",
  closed: "完了",
  cancelled: "取消",
  superseded: "置換済み",
};

export function projectAgentWorkload(items: WorkItem[], agentId: string, now: string): AgentWorkload {
  const assigned = items
    .filter(item => item.assignedAgentId === agentId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const cards = assigned.map(item => {
    const decisionCard = projectWorkItemToDecisionCard(item, now);
    return {
      id: item.id,
      kind: item.kind,
      kindLabel: KIND_LABEL[item.kind],
      status: item.status,
      statusLabel: STATUS_LABEL[item.status] ?? item.status,
      bucket: decisionCard?.bucket ?? null,
      needsHumanDecision: decisionCard?.nextAction?.ownerType === "human" || item.nextAction?.ownerType === "human",
      nextAction: item.nextAction?.label ?? "次の対応を確認する",
      isDemo: item.mode === "demo",
      missingInfo: item.missingInfo,
    } satisfies AgentWorkItemCard;
  });
  return {
    agentId,
    total: cards.length,
    needsHumanDecision: cards.filter(card => card.needsHumanDecision).length,
    missingInfo: assigned.filter(item => {
      const card = projectWorkItemToDecisionCard(item, now);
      return (card?.blockerMissingInfoCount ?? 0) > 0 || item.status === "blocked_missing_info";
    }).length,
    rework: assigned.filter(item => item.status === "returned_for_rework").length,
    items: cards.slice(0, 3),
  };
}
