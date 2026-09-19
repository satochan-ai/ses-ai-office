import { describe, expect, it } from "vitest";
import { appendExecutionLog, canRetry, MAX_RETRY_COUNT } from "./executionLog";
import type { ExecutionLog } from "@/types/executionLog";

const entry = (overrides: Partial<ExecutionLog> = {}): ExecutionLog => ({ id: "r1", workItemId: "w", operation: "quality-check", actor: { type: "agent", id: "a" }, fromStatus: "quality_check", toStatus: "awaiting_approval", inputRefs: [], startedAt: "now", finishedAt: "now", durationMs: 1, outcome: "succeeded", attempt: 1, parentRunId: null, error: null, model: null, cost: null, external: [{ target: "mail", requestSummary: "", statusCode: null, outcome: "not-attempted", at: "now" }], humanEdit: null, producedDeliverableId: null, producedEvidenceIds: [], mode: "demo", ...overrides });
describe("execution log", () => {
  it("appends without changing prior entries", () => { const first = [entry()]; const next = appendExecutionLog(first, entry({ id: "r2", parentRunId: "r1", attempt: 2 })); expect(next).toHaveLength(2); expect(first).toHaveLength(1); });
  it("enforces demo and prepare-only boundaries", () => { expect(() => appendExecutionLog([], entry({ model: { provider: "x", model: "x", inputTokens: 1, outputTokens: 1 } }))).toThrow(); expect(() => appendExecutionLog([], entry({ external: [{ target: "mail", requestSummary: "", statusCode: 200, outcome: "succeeded", at: "now" }] }))).toThrow(); });
  it("uses the same runtime mode vocabulary as WorkItem", () => { expect(entry().mode).toBe("demo"); expect(entry({ mode: "real" }).mode).toBe("real"); });
  it("allows only two retries after the initial attempt", () => { expect(canRetry(1)).toBe(true); expect(canRetry(2)).toBe(true); expect(canRetry(3)).toBe(false); expect(MAX_RETRY_COUNT).toBe(2); });
});
