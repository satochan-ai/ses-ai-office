import type { ManualInputError, ManualInputField } from "@/lib/application/createManualWorkItem";
import type { WorkItemStatus } from "@/types/workItem";

/** 手入力の新規登録フォームと修正版フォームで共有する表示文言。業務ルールは validateManualWorkItemInput が正本。 */
export const FIELD_LABEL: Record<ManualInputField, string> = { title: "架空案件名", candidateLabel: "架空候補者の呼称", skills: "必須スキル", startDate: "開始時期の一致", route: "商流（提案経路）" };
export const ERROR_TEXT: Record<ManualInputError["code"], string> = { required: "入力してください", "too-long": "文字数が上限を超えています", invalid: "入力内容を確認してください（改行・制御文字は使えません）" };
export const STATUS_TEXT: Partial<Record<WorkItemStatus, string>> = { blocked_missing_info: "確認事項への回答待ち", awaiting_approval: "準備内容の確認待ち", preparation_recorded: "確認済み（準備のみ）", returned_for_rework: "修正が必要", approval_invalidated: "再確認待ち", superseded: "修正版へ置換済み" };

export function newSubmissionKey(): string {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return random.toLowerCase();
}
