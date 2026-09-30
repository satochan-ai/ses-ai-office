import type { Approval } from "@/types/approval";
import type { Evidence } from "@/types/workItem";
import type { ServerPersistenceTransaction, ServerPersistenceUnitOfWork, VersionedWorkItem, IdempotencyRecord, WorkItemAuditRecord } from "@/types/serverWorkItemPersistence";
import { nextWorkItemRevision, workItemRevision } from "./workItemRevision";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const key = (...values: string[]) => JSON.stringify(values);
export type FakeServerSeed = { workItems?: { tenantId: string; item: VersionedWorkItem }[] };
type State = { items: Record<string, VersionedWorkItem>; commands: Record<string, IdempotencyRecord>; audits: WorkItemAuditRecord[]; approvals: Record<string, Approval>; evidence: Record<string, Evidence> };
// テスト専用。DBのlock・複数process・並行transactionの保証を提供しない。
export function createFakeServerPersistence(seed: FakeServerSeed = {}): ServerPersistenceUnitOfWork {
  let state: State = { items: {}, commands: {}, audits: [], approvals: {}, evidence: {} };
  for (const entry of seed.workItems ?? []) state.items[key(entry.tenantId, entry.item.workItem.id)] = { workItem: clone(entry.item.workItem), revision: workItemRevision(entry.item.revision) };
  return { async run(operation) {
    const staged = clone(state);
    const scopeKey = (scope: { tenantId: string; actorId: string; idempotencyKey: string }) => key(scope.tenantId, scope.actorId, scope.idempotencyKey);
    const tx: ServerPersistenceTransaction = {
      workItems: {
        async get(tenant, id) { return clone(staged.items[key(tenant, id)] ?? null); },
        async save(input) {
          const id = key(input.tenantId, input.workItem.id); const current = staged.items[id];
          if (!current) return { status: "not_found" };
          if (current.revision !== input.expectedRevision) return { status: "conflict" };
          const revision = nextWorkItemRevision(current.revision);
          staged.items[id] = { workItem: clone(input.workItem), revision };
          return { status: "saved", revision };
        },
      },
      idempotency: {
        async lookup(scope) { return clone(staged.commands[scopeKey(scope)] ?? null); },
        async reserve(record) {
          const id = scopeKey(record); const existing = staged.commands[id];
          if (existing) return { status: existing.fingerprint === record.fingerprint ? "existing" : "mismatch", record: clone(existing) };
          staged.commands[id] = clone(record); return { status: "reserved", record: clone(record) };
        },
        async complete(record) {
          const id = scopeKey(record); const existing = staged.commands[id];
          if (!existing) return { status: "not_found" };
          if (existing.status !== "processing" || existing.commandId !== record.commandId || existing.fingerprint !== record.fingerprint || existing.createdAt !== record.createdAt || existing.expiresAt !== record.expiresAt || (record.status === "succeeded" && record.result.commandId !== record.commandId)) return { status: "conflict" };
          staged.commands[id] = clone(record); return { status: "completed" };
        },
      },
      audit: {
        async append(record) {
          if (staged.audits.some(item => item.tenantId === record.tenantId && item.auditId === record.auditId)) return { status: "duplicate" };
          staged.audits.push(clone(record)); return { status: "appended" };
        },
        async list(tenant, id) { return clone(staged.audits.filter(item => item.tenantId === tenant && item.workItemId === id)); },
      },
      related(tenant) { return {
        async getApproval(id) { return clone(staged.approvals[key(tenant, id)] ?? null); },
        async saveApproval(item) { staged.approvals[key(tenant, item.id)] = clone(item); },
        async listApprovalsByWorkItem(id) { return clone(Object.entries(staged.approvals).filter(([k, item]) => JSON.parse(k)[0] === tenant && item.workItemId === id).map(([, item]) => item)); },
        async getEvidence(id) { return clone(staged.evidence[key(tenant, id)] ?? null); },
        async saveEvidence(item) { staged.evidence[key(tenant, item.id)] = clone(item); },
        async listEvidenceByWorkItem(id) { return clone(Object.entries(staged.evidence).filter(([k, item]) => JSON.parse(k)[0] === tenant && item.workItemId === id).map(([, item]) => item)); },
      }; },
    };
    const result = await operation(tx);
    state = clone(staged);
    return result;
  } };
}
