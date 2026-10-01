import { workItemRevision } from "@/lib/server/persistence/workItemRevision";
import type { WorkItem } from "@/types/workItem";
// test fixture専用。Productionの全shape validation/codecではない。
export function decodeRevision(value: unknown) {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) throw new Error("invalid-revision");
  return workItemRevision(Number(value));
}
export function workColumns(tenant: string, item: WorkItem) {
  return { tenant_id: tenant, id: item.id, schema_version: item.schemaVersion, kind: item.kind, mode: item.mode, status: item.status, assigned_agent_id: item.assignedAgentId, assigned_human_id: item.assignedHumanId, current_approval_id: item.currentApprovalId, approval_required: item.approvalRequired, due_at: item.dueAt, entity: JSON.stringify(item) };
}
export function decodeWork(row: Record<string, unknown>) {
  const item = row.entity as WorkItem;
  if (!item || typeof item !== "object" || row.schema_version !== 1) throw new Error("test-codec-invalid-entity");
  for (const [key, value] of Object.entries(workColumns(row.tenant_id as string, item))) {
    if (key === "entity" || key === "tenant_id") continue;
    const actual = key === "due_at" && row[key] instanceof Date ? (row[key] as Date).toISOString() : row[key];
    const expected = key === "due_at" && value !== null ? new Date(value as string).toISOString() : value;
    if (actual !== expected) throw new Error("test-codec-column-mismatch");
  }
  return { workItem: structuredClone(item), revision: decodeRevision(row.revision) };
}
