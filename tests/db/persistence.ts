// Contract-test SQL helper only: no production imports, routing, auth, pool or facade.
import type { Client } from "pg";
import { isDeepStrictEqual } from "node:util";
import type { WorkItem, Evidence } from "@/types/workItem";
import type { Approval } from "@/types/approval";
import type { ProcessingRecord, CompletedRecord, IdempotencyRecord, IdempotencyScope, WorkItemAuditRecord } from "@/types/serverWorkItemPersistence";
import { decodeWork, decodeRevision, workColumns } from "./codec";
type Columns = Record<string, unknown>;
const date = (value: unknown) => value instanceof Date ? value.toISOString() : value;
export async function insert(client: Client, table: "work_items" | "approvals" | "evidence" | "idempotency" | "audit", columns: Columns, suffix = "") {
  const keys = Object.keys(columns);
  // Identifiers come exclusively from fixture projections, never Browser input.
  if (keys.some(key => !/^[a-z_]+$/.test(key))) throw new Error("test-column-invalid");
  return client.query(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) ${suffix}`, Object.values(columns));
}
export async function seedWork(client: Client, tenant: string, item: WorkItem) {
  await insert(client, "work_items", { ...workColumns(tenant, item), revision: "1" });
}
export async function getWork(client: Client, tenant: string, id: string, lock = false) {
  const row = (await client.query(`SELECT * FROM work_items WHERE tenant_id=$1 AND id=$2 AND archived_at IS NULL${lock ? " FOR UPDATE" : ""}`, [tenant, id])).rows[0];
  return row ? decodeWork(row) : null;
}
export async function cas(client: Client, tenant: string, item: WorkItem, expected: number) {
  const columns: Columns = workColumns(tenant, item);
  delete columns.tenant_id; delete columns.id;
  const keys = Object.keys(columns);
  const values = Object.values(columns);
  const result = await client.query(`UPDATE work_items SET ${keys.map((key, i) => `${key}=$${i + 1}`).join(",")},revision=revision+1,updated_at=now() WHERE tenant_id=$${values.length + 1} AND id=$${values.length + 2} AND revision=$${values.length + 3} AND revision<9007199254740991 AND archived_at IS NULL RETURNING revision`, [...values, tenant, item.id, String(expected)]);
  if (result.rows.length) return { status: "saved" as const, revision: decodeRevision(result.rows[0].revision) };
  const current = await getWork(client, tenant, item.id);
  if (current?.revision === expected && expected === Number.MAX_SAFE_INTEGER) throw new Error("revision-exhausted");
  return { status: current ? "conflict" as const : "not_found" as const };
}
export function approvalColumns(tenant: string, item: Approval): Columns {
  if (!Number.isFinite(item.targetDeliverableVersion)) throw new Error("test-version-invalid");
  return { tenant_id: tenant, id: item.id, work_item_id: item.workItemId, state: item.state,
    approver_type: item.approver?.type ?? null, approver_id: item.approver?.id ?? null,
    requested_by_type: item.requestedBy.type, requested_by_id: item.requestedBy.id,
    decided_by_type: item.decidedBy?.type ?? null, decided_by_id: item.decidedBy?.id ?? null,
    requested_at: item.requestedAt, decided_at: item.decidedAt, scope: JSON.stringify(item.scope),
    decision_comment: item.decisionComment, rejection_reason: item.rejectionReason, expires_at: item.expiresAt,
    invalidated_at: item.invalidation?.detectedAt ?? null, invalidation_reason: item.state === "invalidated" ? item.decisionComment : null,
    supersedes_approval_id: item.supersedesApprovalId, deliverable_id: item.targetDeliverableId,
    deliverable_version: String(item.targetDeliverableVersion), deliverable_hash: item.targetDeliverableHash,
    proposal_snapshot_hash: item.targetDecisionSnapshotHash, entity: JSON.stringify(item) };
}
export async function putApproval(client: Client, tenant: string, item: Approval) {
  await insert(client, "approvals", approvalColumns(tenant, item));
}
export async function readApproval(client: Client, tenant: string, id: string): Promise<Approval | null> {
  const row = (await client.query("SELECT entity FROM approvals WHERE tenant_id=$1 AND id=$2", [tenant, id])).rows[0];
  return row?.entity ?? null;
}
export async function decide(client: Client, tenant: string, next: Approval) {
  const old = await readApproval(client, tenant, next.id);
  if (!old || old.state !== "pending") return { status: "conflict" as const };
  const immutable = (a: Approval) => [a.id, a.workItemId, a.approver, a.requestedBy, a.requestedAt, a.scope, a.expiresAt, a.supersedesApprovalId, a.targetDeliverableId, a.targetDeliverableVersion, a.targetDeliverableHash, a.targetDecisionSnapshotHash];
  if (!isDeepStrictEqual(immutable(old), immutable(next))) throw new Error("approval-binding-changed");
  const cols = approvalColumns(tenant, next); delete cols.tenant_id; delete cols.id;
  const keys = Object.keys(cols), values = Object.values(cols);
  const result = await client.query(`UPDATE approvals SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")},updated_at=now() WHERE tenant_id=$${values.length + 1} AND id=$${values.length + 2} AND state='pending'`, [...values, tenant, next.id]);
  return { status: result.rowCount === 1 ? "saved" as const : "conflict" as const };
}
export function evidenceColumns(tenant: string, item: Evidence): Columns {
  return { tenant_id: tenant, id: item.id, work_item_id: item.workItemId, kind: item.kind, claim: item.claim, source_ref: item.sourceRef,
    source_version: item.sourceVersion, excerpt: item.excerpt, produced_by_type: item.producedBy.type, produced_by_id: item.producedBy.id,
    produced_at: item.producedAt, observed_at: item.observedAt, verified_at: item.verifiedAt, valid_until: item.validUntil, entity: JSON.stringify(item) };
}
export async function putEvidence(client: Client, tenant: string, item: Evidence) {
  await insert(client, "evidence", evidenceColumns(tenant, item), "ON CONFLICT (tenant_id,id) DO NOTHING");
  const row = (await client.query("SELECT entity FROM evidence WHERE tenant_id=$1 AND id=$2", [tenant, item.id])).rows[0];
  // jsonb key ordering differs; compare projected immutable fields, not JSON serialization order.
  if (!isDeepStrictEqual(row.entity, item)) throw new Error("evidence-collision");
}
export function idemColumns(record: IdempotencyRecord): Columns {
  return { tenant_id: record.tenantId, actor_id: record.actorId, idempotency_key: record.idempotencyKey, command_id: record.commandId,
    work_item_id: record.status === "succeeded" ? record.result.workItemId : null, fingerprint: record.fingerprint, status: record.status,
    safe_result: record.result === null ? null : JSON.stringify(record.result), created_at: record.createdAt, completed_at: record.completedAt, expires_at: record.expiresAt };
}
export async function lookup(client: Client, scope: IdempotencyScope): Promise<IdempotencyRecord | null> {
  const row = (await client.query("SELECT * FROM idempotency WHERE tenant_id=$1 AND actor_id=$2 AND idempotency_key=$3", [scope.tenantId, scope.actorId, scope.idempotencyKey])).rows[0];
  if (!row) return null;
  return { ...scope, commandId: row.command_id, fingerprint: row.fingerprint, status: row.status, createdAt: date(row.created_at), completedAt: date(row.completed_at), expiresAt: date(row.expires_at), result: row.safe_result } as IdempotencyRecord;
}
export async function reserve(client: Client, record: ProcessingRecord) {
  const result = await insert(client, "idempotency", idemColumns(record), "ON CONFLICT (tenant_id,actor_id,idempotency_key) DO NOTHING RETURNING command_id");
  if (result.rows.length) return { status: "reserved" as const, record };
  // Read Committed: new statement sees winner after unique-key wait.
  const existing = await lookup(client, record);
  if (!existing) throw new Error("reservation-row-missing");
  return { status: existing.fingerprint === record.fingerprint ? "existing" as const : "mismatch" as const, record: existing };
}
export async function complete(client: Client, record: CompletedRecord) {
  if (record.status === "succeeded" && record.result.commandId !== record.commandId) return { status: "conflict" as const };
  const cols = idemColumns(record);
  const result = await client.query("UPDATE idempotency SET status=$1,safe_result=$2,completed_at=$3,work_item_id=$4 WHERE tenant_id=$5 AND actor_id=$6 AND idempotency_key=$7 AND status='processing' AND command_id=$8 AND fingerprint=$9 AND created_at=$10 AND expires_at=$11", [cols.status, cols.safe_result, cols.completed_at, cols.work_item_id, record.tenantId, record.actorId, record.idempotencyKey, record.commandId, record.fingerprint, record.createdAt, record.expiresAt]);
  return { status: result.rowCount === 1 ? "completed" as const : await lookup(client, record) ? "conflict" as const : "not_found" as const };
}
export function auditColumns(record: WorkItemAuditRecord): Columns {
  return { tenant_id: record.tenantId, audit_id: record.auditId, command_id: record.commandId, request_id: record.requestId, idempotency_key: record.idempotencyKey,
    work_item_id: record.workItemId, actor_id: record.actor.id, actor_type: record.actor.type, command_type: record.commandType,
    received_at: record.receivedAt, completed_at: record.completedAt, outcome: record.outcome, reason_reference: record.reasonReference,
    before_revision: record.beforeRevision, after_revision: record.afterRevision, safe_error_code: record.safeErrorCode };
}
export const appendAudit = (client: Client, record: WorkItemAuditRecord) => insert(client, "audit", auditColumns(record));
