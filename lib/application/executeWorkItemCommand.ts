import type { Approval, ApprovalSnapshot } from "@/types/approval";
import type { Evidence } from "@/types/workItem";
import type { WorkItemCommand } from "@/types/workItemCommand";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";
import type { WorkItemUseCaseResult } from "@/types/workItemUseCase";
import { executeWorkItemCommand } from "@/lib/workItem/commands";
import { applyDomainEffects } from "@/lib/repositories/workItemRepository";

export async function executeWorkItemCommandUseCase(input: { command: WorkItemCommand; repositories: WorkItemRepository; unitOfWork?: WorkItemUnitOfWork; approvalSnapshots?: Record<string, ApprovalSnapshot>; effectContext: { at: string; actor: { type: "agent" | "human" | "system"; id: string } } }): Promise<WorkItemUseCaseResult> {
  const { command } = input;
  try {
    return await (input.unitOfWork ?? getWorkItemUnitOfWork(input.repositories)).run<WorkItemUseCaseResult>(async repositories => {
      const workItem = await repositories.getWorkItem(command.workItemId);
      if (!workItem) return { ok: false, commandId: command.commandId, code: "work-item-not-found", message: "Work Item was not found." };
      let approvals: Approval[] = [];
      if (command.type === "approve-work-item" || command.type === "reject-work-item") {
        const approval = await repositories.getApproval(command.approvalId);
        if (!approval) return { ok: false, commandId: command.commandId, code: "approval-not-found", message: "Approval was not found." };
        approvals = [approval];
      }
      const domain = executeWorkItemCommand(command, { workItem, approvals, approvalSnapshots: input.approvalSnapshots ?? {} });
      if (!domain.ok) return { ok: false, commandId: command.commandId, code: domain.code === "approval-not-found" ? "approval-not-found" : "domain-rejected", message: domain.message };
      if (workItem.kind === "candidate-screening" && command.type === "provide-missing-info" && command.value.field === "personIntent" && domain.data && typeof domain.data === "object" && "evidenceId" in domain.data && await repositories.getEvidence(domain.data.evidenceId as string)) return { ok: false, commandId: command.commandId, code: "domain-rejected", message: "Evidence already exists." };
      await repositories.saveWorkItem(domain.workItem);
      const approval = domain.data && typeof domain.data === "object" && "approval" in domain.data ? domain.data.approval as Approval : undefined;
      const evidence = domain.data && typeof domain.data === "object" && "evidence" in domain.data ? [domain.data.evidence as Evidence] : [];
      if (approval) await repositories.saveApproval(approval);
      for (const item of evidence) await repositories.saveEvidence(item);
      const effects = domain.data && typeof domain.data === "object" && "effects" in domain.data && Array.isArray(domain.data.effects)
        ? domain.data.effects.filter((effect): effect is { type: "invalidate-approval"; approvalId: string; reason: import("@/types/approval").ApprovalInvalidationReason } => effect && effect.type === "invalidate-approval")
        : [];
      await applyDomainEffects(effects, repositories, input.effectContext);
      return { ok: true, commandId: command.commandId, workItem: domain.workItem, ...(approval ? { approval } : {}), ...(evidence.length ? { evidence } : {}), effectsApplied: effects.length };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repository operation failed.";
    return { ok: false, commandId: command.commandId, code: message === "approval-not-found" ? "approval-not-found" : message === "invalid-state" ? "effect-application-failed" : "repository-error", message: message === "approval-not-found" ? "Approval was not found." : "Use Case operation failed." };
  }
}
