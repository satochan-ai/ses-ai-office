import type { Approval } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";
import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import { transition } from "@/lib/workItem/stateMachine";
import { buildManualWorkItem, isManualWorkItem, manualEvidenceId, manualWorkItemId, validateManualWorkItemInput, type ManualInputError, type NormalizedManualInput } from "./createManualWorkItem";

/**
 * 差し戻し・却下された手入力WorkItemから、Humanが入力し直した修正版（後継WorkItem）を登録し、
 * 元のWorkItemをDomainのsupersede遷移で置換済みにする。AIの再作業・実行記録は作らない。
 * 元の回答・Evidence・Approvalは書き換えず、修正版へ自動継承もしない。
 */
export type ManualRevisionReason = { kind: "returned"; reason: string } | { kind: "rejected"; reason: string };
export type ReviseManualWorkItemResult =
  | { ok: true; created: boolean; workItem: WorkItem; superseded: WorkItem; revision: ManualRevisionReason }
  | { ok: false; code: "invalid-input"; errors: ManualInputError[] }
  | { ok: false; code: "invalid-submission-key" | "source-not-found" | "not-manual" | "invalid-state" | "inconsistent-reason" | "already-superseded" | "id-conflict" | "domain-rejected" | "repository-error"; message: string };
export type ManualRevisionDraft =
  | { ok: true; input: NormalizedManualInput | null; revision: ManualRevisionReason }
  | { ok: false; code: "source-not-found" | "not-manual" | "invalid-state" | "inconsistent-reason" | "repository-error" };

const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const latest = (approvals: Approval[]) => [...approvals].sort((a, b) => Date.parse(a.requestedAt) - Date.parse(b.requestedAt) || a.id.localeCompare(b.id)).at(-1);

/** 差し戻し（reworkInfo + invalidated）と却下（rejected + rejectionReason）を保存元ごとに判定する。矛盾・不明は補完せずnull。 */
export function classifyRevisionReason(item: WorkItem, approvals: Approval[]): ManualRevisionReason | null {
  if (item.status !== "returned_for_rework" || item.currentApprovalId !== null) return null;
  const own = approvals.filter(approval => approval.workItemId === item.id);
  if (own.some(approval => approval.state === "pending")) return null;
  const last = latest(own);
  const returned = text(item.reworkInfo?.reason);
  if (returned) {
    if (own.some(approval => approval.state === "rejected")) return null;
    if (last && !(last.state === "invalidated" && last.decisionComment === "returned_for_rework")) return null;
    return { kind: "returned", reason: item.reworkInfo!.reason };
  }
  if (last?.state === "rejected" && text(last.rejectionReason)) return { kind: "rejected", reason: last.rejectionReason };
  return null;
}

function checkSource(item: WorkItem | null, approvals: Approval[]): { ok: true; revision: ManualRevisionReason } | { ok: false; code: "source-not-found" | "not-manual" | "already-superseded" | "invalid-state" | "inconsistent-reason" } {
  if (!item) return { ok: false, code: "source-not-found" };
  if (!isManualWorkItem(item)) return { ok: false, code: "not-manual" };
  if (item.status === "superseded" || item.relations.supersededByWorkItemId) return { ok: false, code: "already-superseded" };
  if (item.status !== "returned_for_rework") return { ok: false, code: "invalid-state" };
  const revision = classifyRevisionReason(item, approvals);
  return revision ? { ok: true, revision } : { ok: false, code: "inconsistent-reason" };
}

/** 修正フォームの初期値（元の入力記録）と理由を読む。読み取り専用。 */
export async function getManualRevisionDraft(repository: WorkItemRepository, sourceWorkItemId: string): Promise<ManualRevisionDraft> {
  try {
    const item = await repository.getWorkItem(sourceWorkItemId);
    const checked = checkSource(item, item ? await repository.listApprovalsByWorkItem(item.id) : []);
    if (!checked.ok) return { ok: false, code: checked.code === "already-superseded" ? "invalid-state" : checked.code };
    const evidence = await repository.getEvidence(manualEvidenceId(sourceWorkItemId));
    const parsed = evidence && evidence.workItemId === sourceWorkItemId ? validateManualWorkItemInput(safeParse(evidence.excerpt)) : null;
    return { ok: true, input: parsed?.ok ? parsed.value : null, revision: checked.revision };
  } catch {
    return { ok: false, code: "repository-error" };
  }
}
function safeParse(value: string): unknown { try { return JSON.parse(value); } catch { return null; } }

const MESSAGE: Record<string, string> = {
  "source-not-found": "修正元の案件が見つかりません。", "not-manual": "手入力した架空案件ではありません。", "invalid-state": "修正が必要な状態の案件ではありません。",
  "inconsistent-reason": "差し戻し・却下の記録が確認できないため、修正版を作成できません。", "already-superseded": "この案件はすでに修正版へ置換されています。",
};

/** 元WorkItemの置換・修正版WorkItem・修正版の入力記録を同じUnit of Workで保存する。 */
export async function reviseManualWorkItem(input: unknown, repository: WorkItemRepository, options: { sourceWorkItemId: string; submissionKey: string; now: string; unitOfWork?: WorkItemUnitOfWork }): Promise<ReviseManualWorkItemResult> {
  if (!/^[a-z0-9-]{8,64}$/.test(options.submissionKey)) return { ok: false, code: "invalid-submission-key", message: "登録キーが不正です。" };
  const validated = validateManualWorkItemInput(input);
  if (!validated.ok) return { ok: false, code: "invalid-input", errors: validated.errors };
  const newId = manualWorkItemId(options.submissionKey);
  try {
    return await (options.unitOfWork ?? getWorkItemUnitOfWork(repository)).run<ReviseManualWorkItemResult>(async repo => {
      const existing = await repo.getWorkItem(newId);
      const source = await repo.getWorkItem(options.sourceWorkItemId);
      // 同じsubmissionKeyの再送信：保存済みの修正版と置換済みの元案件をそのまま返す。
      if (existing) {
        if (isManualWorkItem(existing) && existing.relations.parentWorkItemId === options.sourceWorkItemId && source?.status === "superseded" && source.relations.supersededByWorkItemId === newId) {
          const revision = classifyRevisionReason({ ...source, status: "returned_for_rework", currentApprovalId: null }, await repo.listApprovalsByWorkItem(source.id));
          if (revision) return { ok: true, created: false, workItem: existing, superseded: source, revision };
        }
        return { ok: false, code: "id-conflict", message: "同じIDのWorkItemが存在します。" };
      }
      const checked = checkSource(source, source ? await repo.listApprovalsByWorkItem(source.id) : []);
      if (!checked.ok) return { ok: false, code: checked.code, message: MESSAGE[checked.code] };
      const { workItem, evidence } = buildManualWorkItem(validated.value, options.submissionKey, options.now, { parentWorkItemId: source!.id });
      if (await repo.getEvidence(evidence.id)) return { ok: false, code: "id-conflict", message: "同じIDの入力記録が存在します。" };
      // 状態は直接書き換えず、Domainのsupersede遷移で置換済みにする。
      const replaced = transition(source!, { type: "supersede", at: options.now, supersededByWorkItemId: workItem.id });
      if (!replaced.ok) return { ok: false, code: "domain-rejected", message: replaced.error.message };
      await repo.saveWorkItem(replaced.item);
      await repo.saveWorkItem(workItem);
      await repo.saveEvidence(evidence);
      return { ok: true, created: true, workItem, superseded: replaced.item, revision: checked.revision };
    });
  } catch {
    return { ok: false, code: "repository-error", message: "保存に失敗しました。" };
  }
}
