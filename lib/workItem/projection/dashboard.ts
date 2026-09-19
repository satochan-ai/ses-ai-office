import type { DecisionCard, DecisionQueue, DecisionQueueBucket, ProposalDecisionSummary } from "@/types/decisionQueue";
import type { ProposalDecision, WorkItem, WorkItemStatus } from "@/types/workItem";

const TERMINAL = new Set<WorkItemStatus>(["closed", "cancelled", "superseded"]);
const STATUS_LABEL: Partial<Record<WorkItemStatus, string>> = {
  awaiting_approval: "承認待ち", approval_invalidated: "再承認待ち", blocked_missing_info: "情報不足", info_gap_check: "不足情報確認",
  blocked_conflict: "条件矛盾", needs_human_input: "人間対応待ち", failed_intake: "取り込み失敗", failed_execution: "実行失敗",
};
const BUCKETS: DecisionQueueBucket[] = ["needs_decision_today", "awaiting_approval", "missing_info", "overdue", "execution_failed", "awaiting_human"];

const isBlocker = (status: string) => status === "open";
const blockerMissing = (item: WorkItem) => item.proposalDecisions.flatMap(d => d.blockerMissingInfoIds).filter(id => isBlocker(item.missingInfo.find(info => info.id === id)?.status ?? "open"));
const unresolvedMissing = (item: WorkItem) => item.missingInfo.filter(info => isBlocker(info.status));
const blockerConflicts = (item: WorkItem) => item.proposalDecisions.flatMap(d => d.blockerConflictIds).filter(id => isBlocker(item.conflicts.find(info => info.id === id)?.status ?? "open"));
const failed = (item: WorkItem) => item.status === "failed_intake" || item.status === "failed_execution" || (item.execution as WorkItem["execution"] & { state?: string }).state === "failed";

function overdue(item: WorkItem, now: string): boolean { return item.dueAt !== null && item.dueAt < now && !TERMINAL.has(item.status); }
function sameOrBeforeDay(value: string, now: string): boolean { return value.slice(0, 10) <= now.slice(0, 10); }
function summaryRank(d: ProposalDecision): number {
  const blockers = d.blockerMissingInfoIds.length + d.blockerConflictIds.length;
  const unknown = [d.verdict, d.routeStatus, d.intentStatus, d.duplicateStatus, d.startDateStatus, d.disclosureStatus].filter(v => v === "unknown" || v === "stale").length;
  return blockers > 0 ? 0 : unknown > 0 ? 1 : d.verdict === "unfit" ? 2 : 3;
}
function chooseDecision(item: WorkItem): ProposalDecisionSummary | null {
  const d = [...item.proposalDecisions].sort((a, b) => summaryRank(a) - summaryRank(b))[0];
  if (!d) return null;
  return { verdict: d.verdict, readiness: d.readiness, routeStatus: d.routeStatus, intentStatus: d.intentStatus, duplicateStatus: d.duplicateStatus, startDateStatus: d.startDateStatus, disclosureStatus: d.disclosureStatus };
}
function primaryBucket(item: WorkItem, now: string, missingCount: number, decision: ProposalDecisionSummary | null): DecisionQueueBucket | null {
  if (failed(item)) return "execution_failed";
  if (overdue(item, now)) return "overdue";
  if (item.status === "awaiting_approval" || item.status === "approval_invalidated") return "awaiting_approval";
  if (item.status === "blocked_missing_info" || (item.status === "info_gap_check" && missingCount > 0) || item.status === "blocked_conflict" || (decision?.readiness === "blocked" && missingCount > 0)) return "missing_info";
  if (!TERMINAL.has(item.status) && item.nextAction?.ownerType === "human") return "awaiting_human";
  return null;
}
function severity(item: WorkItem, now: string, decision: ProposalDecisionSummary | null, missingCount: number, conflictCount: number): DecisionCard["severity"] {
  if (failed(item) || overdue(item, now) || item.status === "approval_invalidated" || conflictCount > 0 || decision?.duplicateStatus === "confirmed") return "critical";
  if (missingCount > 0 || decision?.duplicateStatus === "possible" || decision?.intentStatus === "stale" || decision?.routeStatus === "unknown" || decision?.startDateStatus === "unknown" || decision?.disclosureStatus === "unknown") return "warning";
  return "normal";
}
const MISSING_REASON: Record<string, string> = {
  proposalRoute: "提案経路が未確認",
  personIntent: "本人意向が未確認",
  availabilityStart: "稼働開始日が未確認",
  informationFreshness: "情報の鮮度を確認する必要があります",
  duplicateProposal: "重複提案の確認が必要",
  disclosureScope: "開示範囲が未確認",
};
function reasons(item: WorkItem, now: string, decision: ProposalDecisionSummary | null, missingCount: number, conflictCount: number, missing: WorkItem["missingInfo"]): string[] {
  const out: string[] = [];
  if (failed(item)) out.push("実行失敗を確認");
  if (item.dueAt !== null && item.dueAt < now) out.push("期限超過");
  if (item.status === "approval_invalidated") out.push("承認後に判断条件が変更");
  if (missingCount > 0) out.push("不足情報あり");
  if (conflictCount > 0 || item.status === "blocked_conflict") out.push("条件矛盾あり");
  if (decision?.intentStatus === "declined") out.push("本人が提案を辞退");
  if (decision?.intentStatus === "stale") out.push("本人意向が古い");
  if (decision?.duplicateStatus === "possible") out.push("重複提案の可能性あり");
  if (decision?.duplicateStatus === "confirmed") out.push("重複提案が確認済み");
  if (decision?.routeStatus === "unknown") out.push("提案経路が未確認");
  if (decision?.routeStatus === "conflict") out.push("提案経路が矛盾");
  if (decision?.startDateStatus === "mismatched") out.push("開始日が不一致");
  if (decision?.disclosureStatus === "unknown") out.push("開示範囲が未確認");
  const fields = new Set(missing.map(info => info.field));
  for (const field of ["proposalRoute", "personIntent", "availabilityStart", "informationFreshness", "duplicateProposal", "disclosureScope"] as const) {
    if (fields.has(field)) out.push(MISSING_REASON[field]);
  }
  if (item.evidenceIds.length === 0) out.push("Evidenceが不足");
  return [...new Set(out)];
}
function humanAction(item: WorkItem, bucket: DecisionQueueBucket, decision: ProposalDecisionSummary | null): string | null {
  if (bucket === "execution_failed") return "実行失敗を確認する";
  if (bucket === "overdue") return "期限超過を処理する";
  if (item.status === "approval_invalidated") return "提案判断を再確認して再承認する";
  if (bucket === "awaiting_approval") return "提案内容を承認する";
  if (bucket === "missing_info") return decision?.routeStatus === "conflict" || decision?.startDateStatus === "mismatched" ? "条件矛盾を解消する" : "不足情報を確認する";
  if (bucket === "awaiting_human" && item.nextAction?.ownerType === "human") return item.nextAction.label ?? "次の人間タスクを実行する";
  return null;
}

export function projectWorkItemToDecisionCard(item: WorkItem, now: string): DecisionCard | null {
  if (TERMINAL.has(item.status)) return null;
  const missing = blockerMissing(item);
  const unresolved = unresolvedMissing(item);
  const conflicts = blockerConflicts(item);
  const proposalDecision = chooseDecision(item);
  const bucket = primaryBucket(item, now, unresolved.length, proposalDecision);
  if (!bucket) return null;
  const overdueFlag = overdue(item, now);
  const isToday = (item.dueAt !== null && sameOrBeforeDay(item.dueAt, now)) || severity(item, now, proposalDecision, missing.length, conflicts.length) === "critical" || overdueFlag || failed(item);
  const reasonSummary = reasons(item, now, proposalDecision, missing.length, conflicts.length, unresolved);
  return {
    workItemId: item.id, kind: item.kind, title: item.relations.opportunityIds[0] ? `案件 ${item.relations.opportunityIds[0]}` : `Work Item ${item.id}`, bucket,
    status: item.status, statusLabel: STATUS_LABEL[item.status] ?? item.status, assignedAgentId: item.assignedAgentId, assignedHumanId: item.assignedHumanId,
    nextAction: item.nextAction, dueAt: item.dueAt, severity: severity(item, now, proposalDecision, missing.length, conflicts.length), proposalDecision,
    missingInfoCount: item.missingInfo.length, blockerMissingInfoCount: missing.length, conflictCount: item.conflicts.length, blockerConflictCount: conflicts.length,
    evidenceCount: item.evidenceIds.length, reasonSummary, requiredHumanAction: humanAction(item, bucket, proposalDecision), isDemo: item.mode === "demo", needsDecisionToday: isToday,
  };
}

export function projectWorkItemsToDecisionQueue(items: WorkItem[], now: string): DecisionQueue {
  const cards: DecisionCard[] = []; const seen = new Set<string>();
  for (const item of items) { if (seen.has(item.id)) continue; const card = projectWorkItemToDecisionCard(item, now); if (card) { cards.push(card); seen.add(item.id); } }
  const buckets = Object.fromEntries(BUCKETS.map(bucket => [bucket, cards.filter(card => card.bucket === bucket).length])) as Record<DecisionQueueBucket, number>;
  return { cards, buckets, needsDecisionTodayCount: cards.filter(card => card.needsDecisionToday).length };
}
