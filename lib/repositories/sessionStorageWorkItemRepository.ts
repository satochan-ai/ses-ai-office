import { registerWorkItemUnitOfWork } from "./workItemUnitOfWork";
import { createSessionStorageWorkItemUnitOfWork } from "./sessionStorageWorkItemUnitOfWork";
import type { Approval } from "@/types/approval";
import type { Evidence, WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";

export const SESSION_WORK_ITEM_REPOSITORY_KEY = "ses-ai-office:work-items:v1";
type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void };
type Snapshot = { version: 1; workItems: WorkItem[]; approvals: Approval[]; evidence: Evidence[] };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function read(storage: StorageLike): Snapshot {
  const raw = storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY); if (raw === null) return { version: 1, workItems: [], approvals: [], evidence: [] };
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new Error("repository-corrupt-data"); }
  if (!parsed || typeof parsed !== "object" || (parsed as { version?: unknown }).version !== 1 || !Array.isArray((parsed as Snapshot).workItems) || !Array.isArray((parsed as Snapshot).approvals) || !Array.isArray((parsed as Snapshot).evidence)) throw new Error("repository-invalid-schema");
  return parsed as Snapshot;
}
function write(storage: StorageLike, snapshot: Snapshot): void { storage.setItem(SESSION_WORK_ITEM_REPOSITORY_KEY, JSON.stringify(snapshot)); }

export function createSessionStorageWorkItemRepository(storage: StorageLike): WorkItemRepository {
  const repository: WorkItemRepository = {
    async getWorkItem(id) { return clone(read(storage).workItems.find(item => item.id === id) ?? null); },
    async saveWorkItem(item) { const snapshot = read(storage); const index = snapshot.workItems.findIndex(current => current.id === item.id); if (index < 0) snapshot.workItems.push(clone(item)); else snapshot.workItems[index] = clone(item); write(storage, snapshot); },
    async listWorkItems() { return read(storage).workItems.slice().sort((a, b) => a.id.localeCompare(b.id)).map(clone); },
    async getApproval(id) { return clone(read(storage).approvals.find(item => item.id === id) ?? null); },
    async saveApproval(item) { const snapshot = read(storage); const index = snapshot.approvals.findIndex(current => current.id === item.id); if (index < 0) snapshot.approvals.push(clone(item)); else snapshot.approvals[index] = clone(item); write(storage, snapshot); },
    async listApprovalsByWorkItem(workItemId) { return read(storage).approvals.filter(item => item.workItemId === workItemId).sort((a, b) => a.id.localeCompare(b.id)).map(clone); },
    async getEvidence(id) { return clone(read(storage).evidence.find(item => item.id === id) ?? null); },
    async saveEvidence(item) { const snapshot = read(storage); const index = snapshot.evidence.findIndex(current => current.id === item.id); if (index < 0) snapshot.evidence.push(clone(item)); else snapshot.evidence[index] = clone(item); write(storage, snapshot); },
    async listEvidenceByWorkItem(workItemId) { return read(storage).evidence.filter(item => item.workItemId === workItemId).sort((a, b) => a.id.localeCompare(b.id)).map(clone); },
  };
  registerWorkItemUnitOfWork(repository, createSessionStorageWorkItemUnitOfWork(storage));
  return repository;
}
