import type { SafeApiErrorCode, SafeApiErrorDto } from "@/types/workItemTransport";

const errors: Record<SafeApiErrorCode, { status: number; message: string }> = {
  unauthenticated: { status: 401, message: "認証が必要です。" },
  not_found: { status: 404, message: "対象が見つかりません。" },
  forbidden: { status: 403, message: "この操作は許可されていません。" },
  validation_error: { status: 400, message: "入力内容を確認してください。" },
  conflict: { status: 409, message: "状態が更新されています。再確認してください。" },
  invalid_state: { status: 409, message: "現在の状態では操作できません。" },
  repository_error: { status: 500, message: "保存処理に失敗しました。" },
  transaction_error: { status: 500, message: "更新処理に失敗しました。" },
};
export function safeApiErrorHttpStatus(code: SafeApiErrorCode): number { return errors[code].status; }
// 例外messageを引数に取らない。分類は将来Serverで行い、詳細はresponseへ含めない。
export function createSafeApiError(code: SafeApiErrorCode, requestId: string): SafeApiErrorDto {
  return { code, message: errors[code].message, requestId };
}
