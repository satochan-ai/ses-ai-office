import type { ExecutionLog } from "@/types/executionLog";

export const MAX_RETRY_COUNT = 2;
export function canRetry(attempt: number): boolean { return attempt <= MAX_RETRY_COUNT; }
export function appendExecutionLog(logs: readonly ExecutionLog[], entry: ExecutionLog): ExecutionLog[] {
  if (entry.mode === "demo" && (entry.model !== null || entry.cost !== null)) throw new Error("Demo execution cannot contain model or cost");
  if (entry.external.some(call => call.outcome !== "not-attempted")) throw new Error("MVP external calls must be not-attempted");
  return [...logs, entry];
}
