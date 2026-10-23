import type { Approval } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import type { WorkItemCommand } from "@/types/workItemCommand";
import type { MissingInfoResolutionValue } from "@/types/workItemResolution";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import { canShowApprovalDecisions } from "@/lib/workItem/projection/agentWorkItemActions";
import { buildAvailabilityStartResolution } from "@/lib/workItem/ui/missingInfoInput";
import { isManualWorkItem } from "./createManualWorkItem";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";

export type ManualQuestionField = "proposalRoute" | "availabilityStart" | "disclosureScope";
export type ManualHumanActions = {
  questions: { id: string; field: ManualQuestionField; question: string }[];
  approvalId: string | null;
  canPrepare: boolean;
};
export type ManualHumanAction =
  | { type: "answer"; missingInfoId: string; choice: string; date: string }
  | { type: "prepare" }
  | { type: "approve" | "reject" | "rework"; approvalId: string; reason: string };
export type ManualHumanActionResult =
  | { ok: true; message: string; preparation?: "prepared" | "not-prepared" | "failed" }
  | { ok: false; message: string };

const ACTOR = "demo-human";
const STALE = "保存状態が変わっているか、操作できない状態です。最新の状態を読み込んでください。";
const questionField = (field: string): field is ManualQuestionField => field === "proposalRoute" || field === "availabilityStart" || field === "disclosureScope";
const canAnswer = (item: WorkItem) => isManualWorkItem(item) && item.assignedHumanId === ACTOR && item.status === "blocked_missing_info" && item.currentApprovalId === null;

/** 閲覧用の投影。表示していても操作時には保存済み状態を再取得する。 */
export function projectManualHumanActions(item: WorkItem, approvals: Approval[]): ManualHumanActions {
  if (!isManualWorkItem(item) || item.assignedHumanId !== ACTOR) return { questions: [], approvalId: null, canPrepare: false };
  const approval = approvals.find(entry => entry.id === item.currentApprovalId);
  return {
    questions: canAnswer(item) ? item.missingInfo.flatMap(info => info.workItemId === item.id && info.status === "open" && questionField(info.field) ? [{ id: info.id, field: info.field, question: info.question }] : []) : [],
    approvalId: canShowApprovalDecisions(item, approval) ? approval!.id : null,
    canPrepare: canAnswer(item) && item.missingInfo.every(info => info.status !== "open") && !approvals.some(entry => entry.id === `approval:${item.id}`),
  };
}

/** 画面の選択値を既存Commandの値へ変換する。任意の値を型キャストして渡さない。 */
function answerValue(field: string, choice: string, date: string): MissingInfoResolutionValue | null {
  if (field === "availabilityStart") return buildAvailabilityStartResolution(choice, date);
  if (field === "proposalRoute" && (choice === "clear" || choice === "conflict")) return { field, status: choice };
  if (field === "disclosureScope" && (choice === "defined" || choice === "restricted")) return { field, status: choice };
  return null;
}

async function prepare(repository: WorkItemRepository, workItemId: string, now: string): Promise<"prepared" | "not-prepared"> {
  return getWorkItemUnitOfWork(repository).run(async repo => {
    const item = await repo.getWorkItem(workItemId);
    if (!item || !canAnswer(item)) return "not-prepared";
    const approval = await prepareWorkItemApproval(item, repo, now, { run: operation => operation(repo) });
    return approval ? "prepared" : "not-prepared";
  });
}

/** Dashboardの手入力Demo限定の接続処理。状態・Evidence・Approvalの更新は既存Applicationへ委譲する。 */
async function applyManualHumanAction(repository: WorkItemRepository, workItemId: string, action: ManualHumanAction, options: { now: string; commandId: string }): Promise<ManualHumanActionResult> {
  try {
    if (action.type === "prepare") {
      const preparation = await prepare(repository, workItemId, options.now);
      return { ok: true, preparation, message: preparation === "prepared" ? "準備内容の確認待ちになりました。" : "現在の保存状態では、準備内容の確認待ちに進めません。最新の状態を確認してください。" };
    }
    const saved = await getWorkItemUnitOfWork(repository).run<ManualHumanActionResult>(async repo => {
      const item = await repo.getWorkItem(workItemId);
      if (!item || !isManualWorkItem(item) || item.assignedHumanId !== ACTOR) return { ok: false, message: STALE };
      const base = { workItemId, actorId: ACTOR, issuedAt: options.now, commandId: options.commandId };
      let command: WorkItemCommand;
      let approval: Approval | null = null;
      if (action.type === "answer") {
        if (!canAnswer(item)) return { ok: false, message: STALE };
        const info = item.missingInfo.find(entry => entry.id === action.missingInfoId && entry.workItemId === item.id && entry.status === "open");
        if (!info) return { ok: false, message: STALE };
        const value = answerValue(info.field, action.choice, action.date);
        if (!value) return { ok: false, message: "回答の選択肢と開始日を確認してください。" };
        command = { ...base, type: "provide-missing-info", missingInfoId: info.id, value };
      } else {
        approval = item.currentApprovalId ? await repo.getApproval(item.currentApprovalId) : null;
        if (action.approvalId !== item.currentApprovalId || !canShowApprovalDecisions(item, approval)) return { ok: false, message: STALE };
        if (action.type !== "approve" && !action.reason.trim()) return { ok: false, message: "理由を入力してください。" };
        command = action.type === "approve" ? { ...base, type: "approve-work-item", approvalId: action.approvalId }
          : action.type === "reject" ? { ...base, type: "reject-work-item", approvalId: action.approvalId, reason: action.reason }
          : { ...base, type: "return-for-rework", reason: action.reason };
      }
      const result = await executeWorkItemCommandUseCase({ command, repositories: repo, unitOfWork: { run: operation => operation(repo) }, approvalSnapshots: approval ? { [approval.id]: approvalSnapshotForWorkItem(item) } : {}, effectContext: { at: options.now, actor: { type: "human", id: ACTOR } } });
      if (!result.ok) {
        // UoWの作業snapshotに途中保存が残っていても公開しない。
        if (result.code === "repository-error" || result.code === "effect-application-failed") throw new Error("save-failed");
        return { ok: false, message: STALE };
      }
      return { ok: true, message: action.type === "answer" ? "回答を保存しました。" : action.type === "approve" ? "準備内容を承認しました（準備のみ・外部送信なし）。" : action.type === "reject" ? "承認しない理由を保存しました。修正して再登録できます。" : "修正依頼を保存しました。修正して再登録できます。" };
    });
    if (!saved.ok || action.type !== "answer") return saved;
    // 回答のUoW確定後に、別の結果として承認準備を行う。
    try {
      const preparation = await prepare(repository, workItemId, options.now);
      return { ...saved, preparation, message: saved.message + (preparation === "prepared" ? "準備内容の確認待ちになりました。" : "準備内容の確認待ちには進んでいません。保存済みの回答と状態を確認してください。") };
    } catch {
      return { ...saved, preparation: "failed", message: "回答は保存しましたが、準備内容の確認待ちに進む処理でエラーが発生しました。最新の状態を読み込み、確認準備を再試行してください。" };
    }
  } catch {
    return { ok: false, message: "読み取りまたは保存に失敗しました。入力内容を保持しています。最新の状態を確認してください。" };
  }
}

// 現在のタブ内で同じ案件への重複要求を止める。業務上の可否はUoW内の最新状態と既存Commandで検証する。
const activeActions = new Set<string>();
export async function executeManualHumanAction(repository: WorkItemRepository, workItemId: string, action: ManualHumanAction, options: { now: string; commandId: string }): Promise<ManualHumanActionResult> {
  if (activeActions.has(workItemId)) return { ok: false, message: "処理中です。完了までお待ちください。" };
  activeActions.add(workItemId);
  try { return await applyManualHumanAction(repository, workItemId, action, options); }
  finally { activeActions.delete(workItemId); }
}
