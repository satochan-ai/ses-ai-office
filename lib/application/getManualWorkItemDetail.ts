import type { Approval } from "@/types/approval";
import type { Evidence, MissingInfo, WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { isManualWorkItem, manualEvidenceId, manualWorkItemTitle } from "./createManualWorkItem";

/**
 * 手入力WorkItemの詳細を、Repositoryに保存済みの事実だけから組み立てる読み取り専用の投影。
 * 実行履歴（ExecutionLog）ではないため、時系列イベントを推測・生成しない。保存データの修復・削除もしない。
 */
const FIELD_LABEL: Record<string, string> = { proposalRoute: "商流（提案経路）", availabilityStart: "開始時期", disclosureScope: "情報開示範囲", personIntent: "本人意向", duplicateProposal: "重複提案", informationFreshness: "情報の鮮度" };
const ANSWER_LABEL: Record<string, Record<string, string>> = {
  proposalRoute: { clear: "確認済み", conflict: "矛盾あり" },
  availabilityStart: { matched: "一致", mismatched: "不一致" },
  disclosureScope: { defined: "開示可能", restricted: "開示制限" },
  personIntent: { confirmed: "提案可", declined: "辞退" },
  duplicateProposal: { none: "重複なし", possible: "重複の可能性", confirmed: "重複あり" },
};
const STATUS_LABEL: Partial<Record<WorkItem["status"], string>> = { blocked_missing_info: "確認事項への回答待ち", awaiting_approval: "準備内容の確認待ち", preparation_recorded: "確認済み（準備のみ）", returned_for_rework: "修正が必要", superseded: "修正版へ置換済み" };
const APPROVAL_LABEL: Record<Approval["state"], string> = { pending: "確認待ち", approved: "確認済み（準備のみ）", rejected: "承認しない（修正が必要）", invalidated: "無効", on_hold: "保留", expired: "期限切れ", withdrawn: "取り下げ" };
const INVALIDATION_LABEL: Record<string, string> = { returned_for_rework: "差し戻しにより無効", proposal_decision_changed: "確認内容の変更により無効", deliverable_changed: "準備内容の変更により無効", expired: "期限切れにより無効", cancelled: "取消により無効", superseded: "置換により無効" };
const INPUT_LABEL = { startDate: { matched: "一致を確認済み", unknown: "未確認" }, route: { clear: "確認済み", unknown: "未確認" } } as const;

export type DetailLine = { label: string; value: string };
export type ManualMissingInfoView = { id: string; label: string; question: string; answered: boolean; answer: string | null; answeredAt: string | null };
export type ManualEvidenceView = { id: string; kindLabel: string; relatedTo: string | null; lines: DetailLine[]; createdAt: string; linked: boolean };
export type ManualApprovalView = { id: string; stateLabel: string; requestedAt: string; decidedAt: string | null; reason: string | null; current: boolean };
export type ManualWorkItemDetail = {
  id: string; title: string | null; inputLines: DetailLine[]; createdAt: string; statusLabel: string;
  missingInfo: ManualMissingInfoView[]; approvals: ManualApprovalView[];
  rework: { reason: string; returnedAt: string } | null;
  evidence: ManualEvidenceView[]; missingEvidenceCount: number;
  /** 修正版（後継）と元の案件。相手側の関連IDが一致しない・見つからない場合は confirmed=false で名前を出さない。 */
  successor: RelatedManualWorkItem | null; parent: RelatedManualWorkItem | null;
};
export type RelatedManualWorkItem = { id: string; title: string | null; confirmed: boolean };

async function related(repository: WorkItemRepository, id: string | null | undefined, pointsBack: (other: WorkItem) => boolean): Promise<RelatedManualWorkItem | null> {
  if (typeof id !== "string" || !id) return null;
  const other = await repository.getWorkItem(id);
  if (!other || !isManualWorkItem(other) || !pointsBack(other)) return { id, title: null, confirmed: false };
  return { id, title: manualWorkItemTitle(await repository.getEvidence(manualEvidenceId(id))), confirmed: true };
}
export type ManualWorkItemDetailResult =
  | { ok: true; detail: ManualWorkItemDetail }
  | { ok: false; code: "not-found" | "not-manual" | "repository-error" };

const JST = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
/** 保存値が日時として読めない場合は推測せず「日時不明」。 */
export function formatSavedDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "日時不明";
  const time = Date.parse(value);
  return Number.isNaN(time) ? "日時不明" : JST.format(time);
}
const sortTime = (value: unknown) => { const time = typeof value === "string" ? Date.parse(value) : NaN; return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time; };
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;
function parseObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return null;
  try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null; } catch { return null; }
}

/** 保存済みの回答値（JSON）を業務日本語にする。読めない値は原文を出さず、読めないことを示す。 */
export function describeAnswer(raw: unknown): string | null {
  const value = parseObject(raw);
  if (!value || typeof value.field !== "string") return null;
  const parts: string[] = [];
  const status = typeof value.status === "string" ? ANSWER_LABEL[value.field]?.[value.status] ?? value.status : null;
  if (status) parts.push(status);
  if (typeof value.date === "string" && value.date) parts.push(value.date);
  if (typeof value.note === "string" && value.note.trim()) parts.push(`メモ：${value.note.trim()}`);
  return parts.length ? parts.join("・") : "回答済み（内容なし）";
}

function inputLines(evidence: Evidence | undefined): DetailLine[] {
  const input = parseObject(evidence?.excerpt);
  if (!input) return [];
  const lines: DetailLine[] = [];
  if (text(input.title)) lines.push({ label: "架空案件名", value: input.title as string });
  if (text(input.candidateLabel)) lines.push({ label: "架空候補者の呼称", value: input.candidateLabel as string });
  if (text(input.skills)) lines.push({ label: "必須スキル", value: input.skills as string });
  if (typeof input.startDate === "string") lines.push({ label: "開始時期の一致（登録時）", value: INPUT_LABEL.startDate[input.startDate as keyof typeof INPUT_LABEL.startDate] ?? "不明な値" });
  if (typeof input.route === "string") lines.push({ label: "商流（登録時）", value: INPUT_LABEL.route[input.route as keyof typeof INPUT_LABEL.route] ?? "不明な値" });
  return lines;
}

function evidenceView(evidence: Evidence, item: WorkItem, missingInfo: MissingInfo[]): ManualEvidenceView {
  const isInput = evidence.id === manualEvidenceId(item.id) && evidence.kind === "source_excerpt";
  const related = missingInfo.find(info => typeof evidence.id === "string" && evidence.id.startsWith(`evidence:missing-info:${info.id}:`));
  const kindLabel = isInput ? "登録時の入力記録" : evidence.kind === "human_confirmation" ? "Humanによる確認記録" : evidence.kind === "source_excerpt" ? "入力・原文の記録" : "その他の記録";
  const answer = describeAnswer(evidence.excerpt);
  const lines = isInput ? inputLines(evidence) : answer ? [{ label: "記録内容", value: answer }] : text(evidence.excerpt) ? [{ label: "記録内容", value: evidence.excerpt }] : [];
  return { id: evidence.id, kindLabel, relatedTo: related ? FIELD_LABEL[related.field] ?? related.field : null, lines, createdAt: formatSavedDate(evidence.producedAt), linked: Array.isArray(item.evidenceIds) && item.evidenceIds.includes(evidence.id) };
}

function statusLabel(item: WorkItem, missingInfo: MissingInfo[]): string {
  if (item.status === "blocked_missing_info" && missingInfo.length > 0 && missingInfo.every(info => info.status !== "open")) return "確認事項は回答済み（内容確認の準備前）";
  return STATUS_LABEL[item.status] ?? `その他の状態（${String(item.status)}）`;
}

export async function getManualWorkItemDetail(repository: WorkItemRepository, workItemId: string): Promise<ManualWorkItemDetailResult> {
  try {
    const item = await repository.getWorkItem(workItemId);
    if (!item) return { ok: false, code: "not-found" };
    if (!isManualWorkItem(item)) return { ok: false, code: "not-manual" };
    // 関連IDがこのWorkItemと一致する記録だけを使う。
    const evidence = (await repository.listEvidenceByWorkItem(item.id)).filter(entry => entry.workItemId === item.id);
    const approvals = (await repository.listApprovalsByWorkItem(item.id)).filter(entry => entry.workItemId === item.id);
    const missingInfo = Array.isArray(item.missingInfo) ? item.missingInfo.filter(info => info.workItemId === item.id) : [];
    const input = evidence.find(entry => entry.id === manualEvidenceId(item.id) && entry.kind === "source_excerpt");
    const lines = inputLines(input);
    const evidenceIds = Array.isArray(item.evidenceIds) ? item.evidenceIds : [];
    return { ok: true, detail: {
      id: item.id,
      title: lines.find(line => line.label === "架空案件名")?.value ?? null,
      inputLines: lines,
      createdAt: formatSavedDate(item.createdAt),
      statusLabel: statusLabel(item, missingInfo),
      missingInfo: missingInfo.map(info => ({ id: info.id, label: FIELD_LABEL[info.field] ?? info.field, question: info.question, answered: info.status !== "open", answer: info.status === "open" ? null : info.status === "waived" ? "確認不要として扱い" : describeAnswer(info.resolution) ?? "回答内容を読み取れません", answeredAt: info.status === "open" ? null : formatSavedDate(info.resolvedAt) })),
      approvals: approvals.sort((a, b) => sortTime(a.requestedAt) - sortTime(b.requestedAt) || a.id.localeCompare(b.id)).map(approval => ({
        id: approval.id,
        stateLabel: approval.state === "invalidated" ? INVALIDATION_LABEL[approval.decisionComment ?? ""] ?? APPROVAL_LABEL.invalidated : APPROVAL_LABEL[approval.state] ?? `不明な状態（${String(approval.state)}）`,
        requestedAt: formatSavedDate(approval.requestedAt),
        decidedAt: approval.decidedAt ? formatSavedDate(approval.decidedAt) : approval.invalidation ? formatSavedDate(approval.invalidation.detectedAt) : null,
        reason: approval.state === "rejected" ? text(approval.rejectionReason) : null,
        current: item.currentApprovalId === approval.id,
      })),
      rework: item.reworkInfo && text(item.reworkInfo.reason) ? { reason: item.reworkInfo.reason, returnedAt: formatSavedDate(item.reworkInfo.returnedAt) } : null,
      evidence: evidence.sort((a, b) => sortTime(a.producedAt) - sortTime(b.producedAt) || a.id.localeCompare(b.id)).map(entry => evidenceView(entry, item, missingInfo)),
      missingEvidenceCount: evidenceIds.filter(id => !evidence.some(entry => entry.id === id)).length,
      successor: await related(repository, item.relations?.supersededByWorkItemId, other => other.relations?.parentWorkItemId === item.id),
      parent: await related(repository, item.relations?.parentWorkItemId, other => other.relations?.supersededByWorkItemId === item.id),
    } };
  } catch {
    return { ok: false, code: "repository-error" };
  }
}
