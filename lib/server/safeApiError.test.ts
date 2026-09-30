import { describe, expect, it } from "vitest";
import type { SafeApiErrorCode } from "@/types/workItemTransport";
import { createSafeApiError, safeApiErrorHttpStatus } from "./safeApiError";

describe("Safe API error contract", () => {
  it.each<[SafeApiErrorCode, number]>([["unauthenticated", 401], ["not_found", 404], ["forbidden", 403], ["validation_error", 400], ["conflict", 409], ["invalid_state", 409], ["repository_error", 500], ["transaction_error", 500]])("maps %s to %i with fixed safe message", (code, status) => {
    expect(safeApiErrorHttpStatus(code)).toBe(status);
    expect(createSafeApiError(code, "request-1")).toEqual({ code, message: expect.any(String), requestId: "request-1" });
  });
  it("never includes supplied internal exception details", () => {
    const exception = new Error("secret SQL connection details");
    const safe = Reflect.apply(createSafeApiError, undefined, ["repository_error", "request-1", exception]);
    expect(safe).toEqual({ code: "repository_error", message: "保存処理に失敗しました。", requestId: "request-1" });
    expect(JSON.stringify(safe)).not.toContain(exception.message);
  });
});
