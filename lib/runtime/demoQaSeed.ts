import { readOfficeV3DemoResultStore, writeOfficeV3DemoResultStore } from "@/lib/officeV3DemoResult";
import { SESSION_WORK_ITEM_REPOSITORY_KEY } from "@/lib/repositories/sessionStorageWorkItemRepository";
import type { MatchingDemoResult } from "@/types/officeV3ClaudeDemo";

export const QA_SEED_SCENARIO_ID = "matching-proposal";
export const QA_SEED_RESULT: MatchingDemoResult = {
  version: 2, source: "office-v3-claude", mock: true, scenarioId: QA_SEED_SCENARIO_ID,
  scenarioTitle: "QA Human Loop確認用マッチング", completedAt: "2026-09-20T00:00:00.000Z",
  finalAgentId: "matching", finalAgentName: "AIマッチング担当", resultTitle: "QA Human Loop案件提案", resultSummary: "開発用の固定Demo Resultです。外部送信は行いません。",
  opportunityId: "qa-human-loop-opportunity", opportunityTitle: "QA Human Loop案件",
};

export function seedHumanLoopDemoResult(): boolean {
  const store = readOfficeV3DemoResultStore();
  if (store?.results.matching) return false;
  writeOfficeV3DemoResultStore({ version: 1, results: { ...(store?.results ?? {}), matching: QA_SEED_RESULT } });
  return true;
}

export function resetHumanLoopDemoSeed(storage: Storage): void {
  const store = readOfficeV3DemoResultStore();
  if (store) writeOfficeV3DemoResultStore({ version: 1, results: { ...store.results, matching: undefined } });
  const raw = storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY);
  if (!raw) return;
  try {
    const snapshot = JSON.parse(raw) as { version: 1; workItems: Array<{ id: string }>; approvals: Array<{ workItemId: string }>; evidence: Array<{ workItemId: string }> };
    const ids = new Set(snapshot.workItems.filter(item => item.id === "wi-demo-matching-proposal").map(item => item.id));
    storage.setItem(SESSION_WORK_ITEM_REPOSITORY_KEY, JSON.stringify({ ...snapshot, workItems: snapshot.workItems.filter(item => !ids.has(item.id)), approvals: snapshot.approvals.filter(item => !ids.has(item.workItemId)), evidence: snapshot.evidence.filter(item => !ids.has(item.workItemId)) }));
  } catch { /* QA reset is best-effort and never affects the product path. */ }
}

export function isHumanLoopQaSeedEnabled(search: string, nodeEnv: string): boolean {
  return nodeEnv === "development" && new URLSearchParams(search).get("qaSeed") === "human-loop";
}
