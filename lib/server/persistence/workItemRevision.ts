import type { WorkItemRevision } from "@/types/serverWorkItemPersistence";
export function workItemRevision(value: number): WorkItemRevision {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("invalid-revision");
  return value as WorkItemRevision;
}
export function nextWorkItemRevision(value: WorkItemRevision): WorkItemRevision { return workItemRevision(value + 1); }
