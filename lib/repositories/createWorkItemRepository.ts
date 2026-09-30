import type { WorkItemRepository } from "@/types/workItemRepository";
import { createSessionStorageWorkItemRepository } from "./sessionStorageWorkItemRepository";

/** 現行Demoの保存実装を選択する。保存仕様やfallbackは追加しない。 */
export function createWorkItemRepository({ storage }: { storage: Pick<Storage, "getItem" | "setItem"> }): WorkItemRepository {
  return createSessionStorageWorkItemRepository(storage);
}
