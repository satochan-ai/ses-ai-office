import type { WorkItemRepository } from "@/types/workItemRepository";
import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";

// 既存Factoryと9操作の契約を保ち、生成したRepositoryに対応する保存境界を登録する。
const units = new WeakMap<WorkItemRepository, WorkItemUnitOfWork>();
export function registerWorkItemUnitOfWork(repository: WorkItemRepository, unit: WorkItemUnitOfWork): void {
  units.set(repository, unit);
}
export function getWorkItemUnitOfWork(repository: WorkItemRepository): WorkItemUnitOfWork {
  const unit = units.get(repository);
  if (!unit) throw new Error("repository-error: transaction boundary unavailable");
  return unit;
}
