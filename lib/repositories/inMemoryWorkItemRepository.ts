import type { Approval } from "@/types/approval";
import type { Evidence, WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export type InMemoryRepositorySeed = { workItems?: WorkItem[]; approvals?: Approval[]; evidence?: Evidence[] };

export function createInMemoryWorkItemRepository(seed: InMemoryRepositorySeed = {}): WorkItemRepository {
  const workItems = new Map((seed.workItems ?? []).map(item => [item.id, clone(item)]));
  const approvals = new Map((seed.approvals ?? []).map(item => [item.id, clone(item)]));
  const evidence = new Map((seed.evidence ?? []).map(item => [item.id, clone(item)]));
  return {
    async getWorkItem(id) { return clone(workItems.get(id) ?? null); },
    async saveWorkItem(item) { workItems.set(item.id, clone(item)); },
    async listWorkItems() { return [...workItems.values()].sort((a, b) => a.id.localeCompare(b.id)).map(clone); },
    async getApproval(id) { return clone(approvals.get(id) ?? null); },
    async saveApproval(item) { approvals.set(item.id, clone(item)); },
    async listApprovalsByWorkItem(workItemId) { return [...approvals.values()].filter(item => item.workItemId === workItemId).sort((a, b) => a.id.localeCompare(b.id)).map(clone); },
    async getEvidence(id) { return clone(evidence.get(id) ?? null); },
    async saveEvidence(item) { evidence.set(item.id, clone(item)); },
    async listEvidenceByWorkItem(workItemId) { return [...evidence.values()].filter(item => item.workItemId === workItemId).sort((a, b) => a.id.localeCompare(b.id)).map(clone); },
  };
}
