import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";
import { createSessionStorageWorkItemRepository, SESSION_WORK_ITEM_REPOSITORY_KEY } from "./sessionStorageWorkItemRepository";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
export function createSessionStorageWorkItemUnitOfWork(storage: StorageLike): WorkItemUnitOfWork {
  return {
    async run(operation) {
      let snapshot = storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY);
      let changed = false;
      const bufferedStorage: StorageLike = {
        getItem: () => snapshot,
        setItem: (_key, value) => { snapshot = value; changed = true; },
      };
      const repository = createSessionStorageWorkItemRepository(bufferedStorage);
      // 破損snapshotを処理開始前に検出し、空データへ補修しない。
      await repository.listWorkItems();
      const result = await operation(repository);
      // 失敗時は未公開の作業snapshotを捨てる。native Storage.setItemは単一keyの書込。
      if (changed) storage.setItem(SESSION_WORK_ITEM_REPOSITORY_KEY, snapshot!);
      return result;
    },
  };
}
