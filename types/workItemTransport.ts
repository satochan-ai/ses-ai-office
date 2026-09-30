import type { MissingInfoResolutionValue } from "./workItemResolution";

// Browser入力にはActor・時刻・binding・保存済みentityを含めない。
export type WorkItemCommandDto =
  | { type: "approve-work-item"; workItemId: string; approvalId: string }
  | { type: "reject-work-item"; workItemId: string; approvalId: string; reason: string }
  | { type: "return-for-rework"; workItemId: string; reason: string }
  | { type: "provide-missing-info"; workItemId: string; missingInfoId: string; resolution: MissingInfoResolutionValue };

export type SafeApiErrorCode = "unauthenticated" | "not_found" | "forbidden" | "validation_error" | "conflict" | "invalid_state" | "repository_error" | "transaction_error";
export type SafeApiErrorDto = { code: SafeApiErrorCode; message: string; requestId: string };
export type WorkItemCommandReceipt = { commandId: string; workItemId: string; outcome: "succeeded" };
