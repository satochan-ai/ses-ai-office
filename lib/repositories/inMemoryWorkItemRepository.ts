import { registerWorkItemUnitOfWork } from "./workItemUnitOfWork";
import type { Approval } from "@/types/approval";
import type { Evidence, WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export type InMemoryRepositorySeed = { workItems?: WorkItem[]; approvals?: Approval[]; evidence?: Evidence[] };

function createPersistence(seed: InMemoryRepositorySeed) {
  const workItems = new Map((seed.workItems ?? []).map(item => [item.id, clone(item)]));
  const approvals = new Map((seed.approvals ?? []).map(item => [item.id, clone(item)]));
  const evidence = new Map((seed.evidence ?? []).map(item => [item.id, clone(item)]));
  const repository: WorkItemRepository = {
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
  const snapshot = () => ({ workItems: [...workItems.values()].map(clone), approvals: [...approvals.values()].map(clone), evidence: [...evidence.values()].map(clone) });
  registerWorkItemUnitOfWork(repository, {
    async run(operation) {
      const staged = createPersistence(snapshot());
      const result = await operation(staged.repository);
      const next = staged.snapshot();
      // snapshotの複製完了後にだけ全mapを置換。途中失敗時は元のmapに触れない。
      workItems.clear(); approvals.clear(); evidence.clear();
      for (const item of next.workItems) workItems.set(item.id, item);
      for (const item of next.approvals) approvals.set(item.id, item);
      for (const item of next.evidence) evidence.set(item.id, item);
      return result;
    },
  });
  return { repository, snapshot };
}

export function createInMemoryWorkItemRepository(seed: InMemoryRepositorySeed = {}): WorkItemRepository {
  return createPersistence(seed).repository;
}
