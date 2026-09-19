import type { ActorRef, WorkItem, WorkItemStatus } from "@/types/workItem";

export type ExecutionOperation = "intake" | "structure" | "search-candidates" | "assess-proposal-readiness" | "check-gaps" | "generate-draft" | "quality-check" | "request-approval" | "record-outcome" | "retry" | "manual-edit";
export type ExecutionInputRef = { kind: "source" | "deliverable" | "master" | "evidence" | "human-input"; ref: string; version: string };
export type ModelUsage = { provider: string; model: string; inputTokens: number; outputTokens: number; cachedInputTokens?: number; stopReason?: string };
export type CostRecord = { currency: "USD" | "JPY"; amount: number; basis: "measured" | "estimated" };
export type ExternalCallRecord = { target: string; requestSummary: string; statusCode: number | null; outcome: "succeeded" | "failed" | "skipped" | "not-attempted"; at: string };
export type HumanEditRecord = { editedBy: ActorRef; editedAt: string; changedFields: string[]; editDistanceHint: "none" | "minor" | "major" | "rewritten" };

export type ExecutionLog = {
  id: string;
  workItemId: WorkItem["id"];
  operation: ExecutionOperation;
  actor: ActorRef;
  fromStatus: WorkItemStatus;
  toStatus: WorkItemStatus | null;
  inputRefs: ExecutionInputRef[];
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  outcome: "succeeded" | "failed" | "cancelled" | "timeout" | null;
  attempt: number;
  parentRunId: string | null;
  error: { code: string; message: string; at: string } | null;
  model: ModelUsage | null;
  cost: CostRecord | null;
  external: ExternalCallRecord[];
  humanEdit: HumanEditRecord | null;
  producedDeliverableId: string | null;
  producedEvidenceIds: string[];
  mode: "demo" | "real";
};
