import type { Approval } from "@/types/approval";
import type { ExecuteWorkItemCommandContext, WorkItemCommand, WorkItemCommandErrorCode, WorkItemCommandResult } from "@/types/workItemCommand";
import { decideApproval } from "./approval";
import { resolveMissingInfo } from "./missingInfo";

function error(commandId: string, code: WorkItemCommandErrorCode, message: string): WorkItemCommandResult { return { ok: false, commandId, code, message }; }
function approvalFor(context: ExecuteWorkItemCommandContext, approvalId: string, commandId: string): Approval | WorkItemCommandResult {
  const approval = context.approvals.find(candidate => candidate.id === approvalId);
  if (!approval) return error(commandId, "approval-not-found", "Approval was not found.");
  if (approval.workItemId !== context.workItem.id) return error(commandId, "approval-mismatch", "Approval does not belong to the Work Item.");
  if (approval.state !== "pending") return error(commandId, "invalid-state", "Only a pending approval can be decided.");
  return approval;
}
function applyDecision(command: WorkItemCommand, context: ExecuteWorkItemCommandContext, approval: Approval, decision: "approve" | "reject", reason?: string): WorkItemCommandResult {
  const snapshot = context.approvalSnapshots[approval.id];
  if (!snapshot) return error(command.commandId, "domain-rejected", "Approval snapshot is required.");
  const result = decideApproval({ workItem: context.workItem, approval, actor: { type: "human", id: command.actorId }, decision, issuedAt: command.issuedAt, snapshot, reason });
  if (!result.ok) return error(command.commandId, result.code === "binding-mismatch" ? "domain-rejected" : result.code, result.message);
  return { ok: true, commandId: command.commandId, workItem: result.workItem, data: { approval: result.approval } };
}

export function executeWorkItemCommand(command: WorkItemCommand, context: ExecuteWorkItemCommandContext): WorkItemCommandResult {
  if (!command.commandId || !command.workItemId || !command.actorId || !command.issuedAt || command.workItemId !== context.workItem.id) return error(command.commandId, "invalid-command", "Command identity is invalid.");
  switch (command.type) {
    case "approve-work-item": {
      const approval = approvalFor(context, command.approvalId, command.commandId);
      return "ok" in approval ? approval : applyDecision(command, context, approval, "approve");
    }
    case "reject-work-item": {
      if (!command.reason.trim()) return error(command.commandId, "missing-reason", "Reject reason is required.");
      const approval = approvalFor(context, command.approvalId, command.commandId);
      return "ok" in approval ? approval : applyDecision(command, context, approval, "reject", command.reason);
    }
    case "return-for-rework":
      return command.reason.trim() ? error(command.commandId, "unsupported-domain-operation", "Return for rework is not available as a standalone domain operation.") : error(command.commandId, "missing-reason", "Rework reason is required.");
    case "provide-missing-info":
      {
        const result = resolveMissingInfo({ workItem: context.workItem, missingInfoId: command.missingInfoId, actorId: command.actorId, resolvedAt: command.issuedAt, value: command.value });
        if (!result.ok) return error(command.commandId, result.code === "invalid-resolution" ? "invalid-command" : result.code === "proposal-decision-not-found" || result.code === "unsupported-missing-info-field" ? "domain-rejected" : result.code, result.message);
        return { ok: true, commandId: command.commandId, workItem: result.workItem, data: { evidenceId: result.evidenceId, evidence: result.evidence, effects: result.effects } };
      }
  }
}
