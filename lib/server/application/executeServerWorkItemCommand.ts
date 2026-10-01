import { createHash } from "node:crypto";
import type { ServerWorkItemCommandInput, ServerWorkItemCommandResult } from "@/types/serverWorkItemCommand";
import type { WorkItemCommandDto } from "@/types/workItemTransport";
import type { IdempotencyRecord, WorkItemRevision } from "@/types/serverWorkItemPersistence";
import type { WorkItemRepository } from "@/types/workItemRepository";
import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";
import { workItemRevision } from "@/lib/server/persistence/workItemRevision";
import { toDomainWorkItemCommand } from "@/lib/server/workItemCommandTransport";
import { authorizeWorkItemCommand } from "@/lib/server/authorization/workItemAuthorization";
import { executeWorkItemCommandUseCase } from "@/lib/application/executeWorkItemCommand";
import { prepareServerWorkItemApproval } from "./prepareServerWorkItemApproval";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function serverCommandFingerprint(dto: WorkItemCommandDto, expectedRevision: number): string {
  return createHash("sha256").update(canonical({ contractVersion: 1, command: dto, expectedRevision })).digest("hex");
}
type Failure = Extract<ServerWorkItemCommandResult, { ok: false }>;
const fail = (code: Failure["error"]["code"], subcode?: Failure["error"]["subcode"]): Failure => ({ ok: false, error: { code, ...(subcode ? { subcode } : {}) } });
class Abort extends Error { constructor(readonly result: Failure) { super("server-command-aborted"); } }
function replay(record: IdempotencyRecord, fingerprint: string): ServerWorkItemCommandResult {
  if (record.fingerprint !== fingerprint) return fail("conflict", "idempotency_mismatch");
  if (record.status === "processing") return fail("conflict", "command_in_progress");
  if (record.status === "rejected") return fail(record.result.code, record.result.subcode);
  return { ok: true, result: clone(record.result) };
}

// Fake統合用。HTTP・認証・DB接続なし。拒否Audit/terminal recordの保存は将来別境界。
export async function executeServerWorkItemCommand(input: ServerWorkItemCommandInput): Promise<ServerWorkItemCommandResult> {
  let expectedRevision: WorkItemRevision;
  try { expectedRevision = workItemRevision(input.expectedRevision); } catch { return fail("validation_error"); }
  if (![input.idempotencyKey, input.requestId, input.commandId, input.actor.actorId, input.actor.tenantId].every(value => value.trim())) return fail("validation_error");
  if (input.actor.actorType !== "human") return fail("forbidden");
  try {
    const fingerprint = serverCommandFingerprint(input.dto, expectedRevision);
    return await input.persistence.run(async tx => {
      const original = await tx.workItems.get(input.actor.tenantId, input.dto.workItemId);
      if (!original) return fail("not_found");
      if (!input.canAccess(input.actor, clone(original.workItem))) return fail("forbidden");
      const scope = { tenantId: input.actor.tenantId, actorId: input.actor.actorId, idempotencyKey: input.idempotencyKey };
      const existing = await tx.idempotency.lookup(scope);
      if (existing) return replay(existing, fingerprint);
      const related = tx.related(input.actor.tenantId);
      const approval = original.workItem.currentApprovalId ? await related.getApproval(original.workItem.currentApprovalId) : null;
      // Actor資格はrevisionより先。current/pending等の状態はrevision一致後のPolicyへ。
      const assigned = original.workItem.assignedHumanId === input.actor.actorId;
      switch (input.dto.type) {
        case "approve-work-item":
        case "reject-work-item":
          if (!assigned || (approval && (approval.approver?.type !== "human" || approval.approver.id !== input.actor.actorId))) return fail("forbidden");
          break;
        case "return-for-rework": if (!assigned) return fail("forbidden"); break;
        case "provide-missing-info": if (!assigned && !input.permissions.includes("resolve-missing-info")) return fail("forbidden"); break;
      }
      if (original.revision !== expectedRevision) return fail("conflict", "stale_revision");
      const authorization = authorizeWorkItemCommand({ context: { actor: input.actor, permissions: input.permissions }, tenantId: input.actor.tenantId, workItem: original.workItem, approval, command: input.dto });
      if (!authorization.allowed) return fail(["approval_not_current", "approval_not_pending", "missing_info_not_found"].includes(authorization.reason) ? "invalid_state" : "forbidden");
      const at = input.clock();
      const pending = { ...scope, commandId: input.commandId, fingerprint, status: "processing" as const, createdAt: at, completedAt: null, expiresAt: input.idempotencyExpiresAt, result: null };
      const reserved = await tx.idempotency.reserve(pending);
      if (reserved.status !== "reserved") return replay(reserved.record, fingerprint);
      // WorkItem保存をメモリ上に集める。関連entityは同じtx snapshotへ保存する。
      let current = clone(original.workItem);
      let relatedChanged = false;
      const repository: WorkItemRepository = {
        ...related,
        async getWorkItem(id) { return id === current.id ? clone(current) : null; },
        async listWorkItems() { return [clone(current)]; },
        async saveWorkItem(item) { if (item.id !== current.id) throw new Error("aggregate-mismatch"); current = clone(item); },
        async saveApproval(item) { if (item.workItemId !== current.id) throw new Error("aggregate-mismatch"); const before = await related.getApproval(item.id); relatedChanged ||= canonical(before) !== canonical(item); await related.saveApproval(item); },
        async saveEvidence(item) { if (item.workItemId !== current.id) throw new Error("aggregate-mismatch"); const before = await related.getEvidence(item.id); relatedChanged ||= canonical(before) !== canonical(item); await related.saveEvidence(item); },
      };
      const unitOfWork: WorkItemUnitOfWork = { run: operation => operation(repository) };
      const command = toDomainWorkItemCommand(input.dto, input.actor, { commandId: input.commandId, clock: () => at });
      const executed = await executeWorkItemCommandUseCase({ command, repositories: repository, unitOfWork, approvalSnapshots: approval ? { [approval.id]: input.resolveSnapshot(clone(current), clone(approval)) } : {}, effectContext: { at, actor: { type: "human", id: input.actor.actorId } } });
      if (!executed.ok) throw new Abort(fail(executed.code === "repository-error" || executed.code === "effect-application-failed" ? "transaction_error" : "invalid_state"));
      if (command.type === "provide-missing-info") await prepareServerWorkItemApproval({ workItemId: current.id, approvalId: input.createApprovalId(), unitOfWork, requestedBy: { type: "human", id: input.actor.actorId }, at, expiresAt: input.approvalExpiresAt, resolveSnapshot: item => input.resolveSnapshot(item, null) });
      let revision = original.revision;
      if (relatedChanged || canonical(current) !== canonical(original.workItem)) {
        const saved = await tx.workItems.save({ tenantId: input.actor.tenantId, workItem: current, expectedRevision });
        if (saved.status !== "saved") throw new Abort(saved.status === "conflict" ? fail("conflict", "stale_revision") : fail("not_found"));
        revision = saved.revision;
      }
      const receipt = { commandId: input.commandId, workItemId: current.id, outcome: "succeeded" as const };
      const audit = await tx.audit.append({ auditId: input.commandId, tenantId: input.actor.tenantId, commandId: input.commandId, requestId: input.requestId, idempotencyKey: input.idempotencyKey, workItemId: current.id, actor: { type: "human", id: input.actor.actorId }, commandType: command.type, receivedAt: at, completedAt: at, reasonReference: null, beforeRevision: original.revision, afterRevision: revision, outcome: "succeeded", safeErrorCode: null });
      if (audit.status !== "appended") throw new Error("audit-duplicate");
      const completed = await tx.idempotency.complete({ ...pending, status: "succeeded", completedAt: at, result: receipt });
      if (completed.status !== "completed") throw new Error("idempotency-completion-failed");
      return { ok: true, result: receipt };
    });
  } catch (error) { return error instanceof Abort ? error.result : fail("transaction_error"); }
}
