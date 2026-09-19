import { describe, expect, it } from "vitest";
import { demoResultToWorkItem } from "@/lib/runtime/demoAdapter";
import { projectAgentWorkload } from "@/lib/workItem/projection/agentWorkload";
import type { MatchingDemoResult } from "@/types/officeV3ClaudeDemo";

const result = (id: string, agent: string): MatchingDemoResult => ({
  version: 2, source: "office-v3-claude", mock: true, scenarioId: "matching-proposal",
  scenarioTitle: "案件・人材マッチング", completedAt: "2026-09-20T00:00:00.000Z",
  finalAgentId: agent, finalAgentName: "営業AI", resultTitle: id, resultSummary: "Demo result",
  opportunityId: id, opportunityTitle: "Demo案件",
});

const item = (id: string, agent: string) => demoResultToWorkItem(result(id, agent), {
  now: "2026-09-20T00:00:00.000Z", createWorkItemId: value => `wi-${value.scenarioId}-${id}`,
});

describe("projectAgentWorkload", () => {
  it("filters by official assignedAgentId and keeps human decision metadata", () => {
    const workload = projectAgentWorkload([item("b", "sales"), item("a", "other")], "sales", "2026-09-20T00:00:00.000Z");
    expect(workload.total).toBe(1);
    expect(workload.needsHumanDecision).toBe(1);
    expect(workload.items[0]).toMatchObject({ kind: "matching-proposal", isDemo: true, statusLabel: "準備完了" });
  });

  it("returns an empty workload for an agent with no assigned items", () => {
    expect(projectAgentWorkload([], "sales", "2026-09-20T00:00:00.000Z")).toMatchObject({ agentId: "sales", total: 0, needsHumanDecision: 0, items: [] });
  });

  it("preserves the total while displaying at most three items", () => {
    const items = ["a", "b", "c", "d"].map(id => item(id, "sales"));
    const workload = projectAgentWorkload(items, "sales", "2026-09-20T00:00:00.000Z");
    expect(workload.total).toBe(4);
    expect(workload.items).toHaveLength(3);
  });
});
