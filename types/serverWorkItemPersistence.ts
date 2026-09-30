import type { WorkItem } from "./workItem";
import type { WorkItemRepository } from "./workItemRepository";
import type { WorkItemCommand } from "./workItemCommand";
import type { SafeApiErrorCode, WorkItemCommandReceipt } from "./workItemTransport";

declare const revisionBrand: unique symbol;
export type WorkItemRevision = number & { readonly [revisionBrand]: true };
export type VersionedWorkItem = { readonly workItem: WorkItem; readonly revision: WorkItemRevision };
export type WorkItemSaveResult = { status: "saved"; revision: WorkItemRevision } | { status: "conflict" } | { status: "not_found" };
export type ServerWorkItemPersistence = {
  get(tenantId: string, workItemId: string): Promise<VersionedWorkItem | null>;
  save(input: { tenantId: string; workItem: WorkItem; expectedRevision: WorkItemRevision }): Promise<WorkItemSaveResult>;
};
export type IdempotencyScope = { tenantId: string; actorId: string; idempotencyKey: string };
export type StoredRejection = { code: "conflict" | "invalid_state"; subcode?: "stale_revision" | "idempotency_mismatch" };
type IdempotencyBase = IdempotencyScope & { commandId: string; fingerprint: string; createdAt: string; expiresAt: string };
export type IdempotencyRecord = IdempotencyBase & (
  | { status: "processing"; completedAt: null; result: null }
  | { status: "succeeded"; completedAt: string; result: WorkItemCommandReceipt }
  | { status: "rejected"; completedAt: string; result: StoredRejection }
);
export type ProcessingRecord = Extract<IdempotencyRecord, { status: "processing" }>;
export type CompletedRecord = Exclude<IdempotencyRecord, ProcessingRecord>;
export type ReservationResult = { status: "reserved"; record: ProcessingRecord } | { status: "existing" | "mismatch"; record: IdempotencyRecord };
export type IdempotencyPersistence = {
  lookup(scope: IdempotencyScope): Promise<IdempotencyRecord | null>;
  reserve(record: ProcessingRecord): Promise<ReservationResult>;
  complete(record: CompletedRecord): Promise<{ status: "completed" } | { status: "not_found" | "conflict" }>;
};
export type WorkItemAuditRecord = {
  auditId: string; tenantId: string; commandId: string; requestId: string; idempotencyKey: string;
  workItemId: string; actor: { type: "human"; id: string }; commandType: WorkItemCommand["type"];
  receivedAt: string; completedAt: string; reasonReference: string | null;
  beforeRevision: WorkItemRevision | null;
} & ({ outcome: "succeeded"; afterRevision: WorkItemRevision; safeErrorCode: null }
  | { outcome: "rejected"; afterRevision: null; safeErrorCode: SafeApiErrorCode });
export type AuditPersistence = {
  append(record: WorkItemAuditRecord): Promise<{ status: "appended" | "duplicate" }>;
  list(tenantId: string, workItemId: string): Promise<WorkItemAuditRecord[]>;
};
export type RelatedPersistence = Omit<WorkItemRepository, "getWorkItem" | "saveWorkItem" | "listWorkItems">;
export type ServerPersistenceTransaction = {
  workItems: ServerWorkItemPersistence; idempotency: IdempotencyPersistence; audit: AuditPersistence;
  related(tenantId: string): RelatedPersistence;
};
// operationの例外で全体中止。saved/conflict等の判定とno-op判断はApplicationの責務。
export type ServerPersistenceUnitOfWork = { run<T>(operation: (tx: ServerPersistenceTransaction) => Promise<T>): Promise<T> };
// 将来adapterはsaveWorkItemを作業状態へ集め、最後に集約CASを1回行う。今回実装しない。
export type ServerDomainRepositoryAdapterFactory = (tx: ServerPersistenceTransaction, tenantId: string) => WorkItemRepository;
