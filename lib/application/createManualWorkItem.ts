import type { Evidence, MissingInfo, ProposalDecision, WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import { resolveVisualOfficeTarget } from "@/lib/workItem/ui/visualOfficeTarget";

/** 手入力（架空・匿名）の案件×候補者を、既存Domainの matching-proposal WorkItem として登録する。AI・外部送信は行わない。 */
export const MANUAL_WORK_ITEM_ID_PREFIX = "wi-manual-";
export const MANUAL_INPUT_LIMITS = { title: 60, candidateLabel: 30, skills: 100 } as const;
const MANUAL_AGENT_ID = "matching";
const MANUAL_HUMAN_ID = "demo-human";

export type ManualWorkItemInput = {
  title: string;
  candidateLabel: string;
  skills: string;
  /** 不一致・矛盾は入力対象外。未確認ならHumanへの確認事項になる。 */
  startDate: "matched" | "unknown";
  route: "clear" | "unknown";
};
export type ManualInputField = keyof ManualWorkItemInput;
export type ManualInputError = { field: ManualInputField; code: "required" | "too-long" | "invalid" };
export type NormalizedManualInput = ManualWorkItemInput;
export type CreateManualWorkItemResult =
  | { ok: true; created: boolean; workItem: WorkItem }
  | { ok: false; code: "invalid-input"; errors: ManualInputError[] }
  | { ok: false; code: "invalid-submission-key" | "id-conflict" | "repository-error"; message: string };

const CONTROL = /[\u0000-\u001f\u007f]/u;
function text(value: unknown, field: ManualInputField, max: number, errors: ManualInputError[]): string {
  if (typeof value !== "string") { errors.push({ field, code: "invalid" }); return ""; }
  if (CONTROL.test(value)) { errors.push({ field, code: "invalid" }); return ""; }
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (!normalized) errors.push({ field, code: "required" });
  else if ([...normalized].length > max) errors.push({ field, code: "too-long" });
  return normalized;
}

export function validateManualWorkItemInput(input: unknown): { ok: true; value: NormalizedManualInput } | { ok: false; errors: ManualInputError[] } {
  const errors: ManualInputError[] = [];
  const record = input !== null && typeof input === "object" ? input as Record<string, unknown> : {};
  const title = text(record.title, "title", MANUAL_INPUT_LIMITS.title, errors);
  const candidateLabel = text(record.candidateLabel, "candidateLabel", MANUAL_INPUT_LIMITS.candidateLabel, errors);
  const skills = text(record.skills, "skills", MANUAL_INPUT_LIMITS.skills, errors);
  if (record.startDate !== "matched" && record.startDate !== "unknown") errors.push({ field: "startDate", code: "invalid" });
  if (record.route !== "clear" && record.route !== "unknown") errors.push({ field: "route", code: "invalid" });
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { title, candidateLabel, skills, startDate: record.startDate as ManualWorkItemInput["startDate"], route: record.route as ManualWorkItemInput["route"] } };
}

export const isManualWorkItem = (item: Pick<WorkItem, "id" | "source" | "mode" | "kind">): boolean =>
  item.id.startsWith(MANUAL_WORK_ITEM_ID_PREFIX) && item.source?.type === "manual" && item.mode === "demo" && item.kind === "matching-proposal";
export const manualWorkItemId = (submissionKey: string) => `${MANUAL_WORK_ITEM_ID_PREFIX}${submissionKey}`;
export const manualEvidenceId = (workItemId: string) => `evidence:manual-input:${workItemId}`;

/** 入力内容の記録（source_excerpt）から案件名を読む。手入力以外・壊れた値はnull。 */
export function manualWorkItemTitle(evidence: Evidence | null): string | null {
  if (!evidence || evidence.id !== manualEvidenceId(evidence.workItemId) || evidence.kind !== "source_excerpt") return null;
  try {
    const parsed = JSON.parse(evidence.excerpt) as { title?: unknown };
    return typeof parsed.title === "string" && parsed.title ? parsed.title : null;
  } catch { return null; }
}

/** 入力値から決まる不足情報だけを作る。開示範囲はフォームで扱わず、Domain上 defined が必須のため常にHumanへ確認する。 */
export function buildManualWorkItem(input: NormalizedManualInput, submissionKey: string, now: string): { workItem: WorkItem; evidence: Evidence } {
  const id = manualWorkItemId(submissionKey);
  const opportunityId = `manual-opportunity:${submissionKey}`;
  const personId = `manual-person:${submissionKey}`;
  const sourceRef = `manual-input:${id}`;
  const sourceVersion = `manual-v1:${now}`;
  const evidence: Evidence = { id: manualEvidenceId(id), workItemId: id, kind: "source_excerpt", claim: "手入力された架空案件と候補者の情報", sourceRef, sourceVersion, excerpt: JSON.stringify(input), producedBy: { type: "human", id: MANUAL_HUMAN_ID }, producedAt: now, observedAt: null, verifiedAt: null, validUntil: null };
  const question = (field: MissingInfo["field"], text: string): MissingInfo => ({ id: `manual-missing:${submissionKey}:${field}`, workItemId: id, field, subjectPersonId: personId, question: text, status: "open", raisedAt: now, resolvedAt: null });
  const missingInfo = [
    ...(input.route === "unknown" ? [question("proposalRoute", "提案経路（商流）を確認してください。")] : []),
    ...(input.startDate === "unknown" ? [question("availabilityStart", "候補者の稼働開始日が案件の開始時期と一致するか確認してください。")] : []),
    question("disclosureScope", "候補者情報の開示範囲を確認してください。"),
  ];
  const decision: ProposalDecision = { opportunityId, personId, verdict: "unknown", readiness: "blocked", routeStatus: input.route, intentStatus: "unknown", duplicateStatus: "unknown", startDateStatus: input.startDate, disclosureStatus: "unknown", assessedAt: now, evidenceIds: [evidence.id], blockerMissingInfoIds: missingInfo.map(info => info.id), blockerConflictIds: [] };
  const workItem: WorkItem = {
    id, kind: "matching-proposal", source: { type: "manual", ref: sourceRef }, sourceVersion, createdAt: now, updatedAt: now,
    assignedAgentId: MANUAL_AGENT_ID, assignedHumanId: MANUAL_HUMAN_ID,
    relations: { opportunityIds: [opportunityId], personIds: [personId], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null },
    // 不足情報への回答待ち。AIの工程は実行していないため実行履歴・復帰先は持たない。
    status: "blocked_missing_info", nextAction: { kind: "provide_human_input", ownerType: "human" }, dueAt: null,
    missingInfo, conflicts: [], evidenceIds: [evidence.id], proposalDecisions: [decision],
    currentDeliverableId: null, approvalRequired: true, currentApprovalId: null,
    execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1,
  };
  return { workItem, evidence };
}

export type ManualWorkItemSummary = { id: string; title: string; status: WorkItem["status"]; canOpenInVisualOffice: boolean };

/**
 * 登録済みの手入力WorkItemを、入力記録の案件名付きで新しい順に返す。
 * 承認・差し戻しの遷移で担当AIが外れると、AI実行履歴（lastAgentId）を持たない手入力WorkItemはVisual Officeで開けない。
 */
export async function listManualWorkItemSummaries(repository: WorkItemRepository, workItems: WorkItem[]): Promise<ManualWorkItemSummary[]> {
  const manual = workItems.filter(isManualWorkItem).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return Promise.all(manual.map(async item => ({ id: item.id, title: manualWorkItemTitle(await repository.getEvidence(manualEvidenceId(item.id))) ?? "（案件名を読み込めません）", status: item.status, canOpenInVisualOffice: resolveVisualOfficeTarget(workItems, item.id).ok })));
}

/** Decision Queueの投影は変えず、手入力カードの表示名だけを案件名に置き換える。 */
export function withManualTitles<T extends { cards: { workItemId: string; title: string }[] }>(queue: T, summaries: ManualWorkItemSummary[]): T {
  const titles = new Map(summaries.map(summary => [summary.id, summary.title]));
  return { ...queue, cards: queue.cards.map(card => titles.has(card.workItemId) ? { ...card, title: `手入力（架空）：${titles.get(card.workItemId)}` } : card) };
}

/** 同じsubmissionKeyの再送信は既存WorkItemを返し、二重作成しない。WorkItemとEvidenceは同じUoWで保存する。 */
export async function createManualWorkItem(input: unknown, repository: WorkItemRepository, options: { submissionKey: string; now: string }): Promise<CreateManualWorkItemResult> {
  if (!/^[a-z0-9-]{8,64}$/.test(options.submissionKey)) return { ok: false, code: "invalid-submission-key", message: "登録キーが不正です。" };
  const validated = validateManualWorkItemInput(input);
  if (!validated.ok) return { ok: false, code: "invalid-input", errors: validated.errors };
  const { workItem, evidence } = buildManualWorkItem(validated.value, options.submissionKey, options.now);
  try {
    return await getWorkItemUnitOfWork(repository).run<CreateManualWorkItemResult>(async repo => {
      const existing = await repo.getWorkItem(workItem.id);
      if (existing) return isManualWorkItem(existing) ? { ok: true, created: false, workItem: existing } : { ok: false, code: "id-conflict", message: "同じIDのWorkItemが存在します。" };
      if (await repo.getEvidence(evidence.id)) return { ok: false, code: "id-conflict", message: "同じIDの入力記録が存在します。" };
      await repo.saveWorkItem(workItem);
      await repo.saveEvidence(evidence);
      return { ok: true, created: true, workItem };
    });
  } catch {
    return { ok: false, code: "repository-error", message: "保存に失敗しました。" };
  }
}
