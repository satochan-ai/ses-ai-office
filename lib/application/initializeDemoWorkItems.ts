import type { OfficeV3DemoResult } from "@/types/officeV3ClaudeDemo";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { demoResultsToWorkItems } from "@/lib/runtime/demoAdapter";

export type DemoInitializationResult =
  | { ok: true; created: number; skippedExisting: number; skippedDuplicate: number; createdIds: string[] }
  | { ok: false; code: "repository-error"; message: string; created: number; skippedExisting: number; skippedDuplicate: number; createdIds: string[] };

/** Initializer only: existing WorkItems are never synchronized or overwritten by later Demo Result changes. */
export async function initializeDemoWorkItemsFromResults(results: OfficeV3DemoResult[], repository: WorkItemRepository, options: { now: string; createWorkItemId?: (result: OfficeV3DemoResult) => string }): Promise<DemoInitializationResult> {
  const workItems = demoResultsToWorkItems(results, { now: options.now, createWorkItemId: options.createWorkItemId ?? (result => `wi-demo-${result.scenarioId}`) });
  const seen = new Set<string>(); const createdIds: string[] = []; let skippedExisting = 0; let skippedDuplicate = 0;
  try {
    for (const item of workItems) {
      if (seen.has(item.id)) { skippedDuplicate += 1; continue; }
      seen.add(item.id);
      if (await repository.getWorkItem(item.id)) { skippedExisting += 1; continue; }
      await repository.saveWorkItem(item); createdIds.push(item.id);
    }
    return { ok: true, created: createdIds.length, skippedExisting, skippedDuplicate, createdIds };
  } catch {
    return { ok: false, code: "repository-error", message: "Demo WorkItem initialization failed.", created: createdIds.length, skippedExisting, skippedDuplicate, createdIds };
  }
}
