import type { Approval, ApprovalSnapshot } from "@/types/approval";
import type { Evidence, WorkItem } from "@/types/workItem";
import type { WorkItemCommand } from "@/types/workItemCommand";
import type { WorkItemRepository } from "@/types/workItemRepository";

export type WorkItemUseCaseInput = { command: WorkItemCommand; repositories: WorkItemRepository; approvalSnapshots?: Record<string, ApprovalSnapshot>; effectContext: { at: string; actor: { type: "agent" | "human" | "system"; id: string } } };
export type WorkItemUseCaseErrorCode = "work-item-not-found" | "approval-not-found" | "repository-error" | "effect-application-failed" | "domain-rejected";
export type WorkItemUseCaseResult =
  | { ok: true; commandId: string; workItem: WorkItem; approval?: Approval; evidence?: Evidence[]; effectsApplied: number }
  | { ok: false; commandId: string; code: WorkItemUseCaseErrorCode; message: string };
