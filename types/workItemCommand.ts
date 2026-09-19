import type { Approval, ApprovalSnapshot } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import type { MissingInfoResolutionValue } from "@/types/workItemResolution";

export type CommandBase = { commandId: string; workItemId: WorkItem["id"]; actorId: string; issuedAt: string };
export type ApproveWorkItemCommand = CommandBase & { type: "approve-work-item"; approvalId: string };
export type RejectWorkItemCommand = CommandBase & { type: "reject-work-item"; approvalId: string; reason: string };
export type ReturnForReworkCommand = CommandBase & { type: "return-for-rework"; reason: string };
export type ProvideMissingInfoCommand = CommandBase & { type: "provide-missing-info"; missingInfoId: string; value: MissingInfoResolutionValue };
export type WorkItemCommand = ApproveWorkItemCommand | RejectWorkItemCommand | ReturnForReworkCommand | ProvideMissingInfoCommand;

export type WorkItemCommandErrorCode =
  | "work-item-not-found" | "approval-not-found" | "approval-mismatch" | "actor-not-authorized"
  | "invalid-command" | "invalid-state" | "missing-reason" | "missing-info-not-found" | "missing-info-already-resolved"
  | "unsupported-domain-operation" | "domain-rejected";

export type WorkItemCommandResult<T = unknown> =
  | { ok: true; commandId: string; workItem: WorkItem; data?: T }
  | { ok: false; commandId: string; code: WorkItemCommandErrorCode; message: string };

export type ExecuteWorkItemCommandContext = { workItem: WorkItem; approvals: Approval[]; approvalSnapshots: Record<string, ApprovalSnapshot> };
