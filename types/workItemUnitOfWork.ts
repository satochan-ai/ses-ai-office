import type { WorkItemRepository } from "./workItemRepository";

export type WorkItemUnitOfWork = {
  run<T>(operation: (repository: WorkItemRepository) => Promise<T>): Promise<T>;
};
