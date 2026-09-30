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
  it("keeps completed and rework demo results with the previous agent without leaking to others", () => {
    const completed = item("completed", "sales");
    completed.assignedAgentId = null;
    completed.status = "returned_for_rework";
    expect(projectAgentWorkload([completed], "sales", completed.updatedAt)).toMatchObject({ total: 1, rework: 1 });
    expect(projectAgentWorkload([completed], "other", completed.updatedAt).total).toBe(0);
    completed.mode = "real";
    expect(projectAgentWorkload([completed], "sales", completed.updatedAt).total).toBe(0);
  });

  it("filters by official assignedAgentId and keeps human decision metadata", () => {
    const workload = projectAgentWorkload([item("b", "sales"), item("a", "other")], "sales", "2026-09-20T00:00:00.000Z");
    expect(workload.total).toBe(1);
    expect(workload.needsHumanDecision).toBe(1);
    expect(workload.items[0]).toMatchObject({ kind: "matching-proposal", isDemo: true, statusLabel: "情報不足" });
  });

  it("returns an empty workload for an agent with no assigned items", () => {
    expect(projectAgentWorkload([], "sales", "2026-09-20T00:00:00.000Z")).toMatchObject({ agentId: "sales", total: 0, needsHumanDecision: 0, missingInfo: 0, rework: 0, items: [] });
  });

  it("preserves the total while displaying at most three items", () => {
    const items = ["a", "b", "c", "d"].map(id => item(id, "sales"));
    const workload = projectAgentWorkload(items, "sales", "2026-09-20T00:00:00.000Z");
    expect(workload.total).toBe(4);
    expect(workload.items).toHaveLength(3);
  });

  it("counts unresolved blocker information and excludes other agents", () => {
    const blocked = item("blocked", "sales");
    blocked.proposalDecisions[0].blockerMissingInfoIds = [blocked.missingInfo[0].id];
    const workload = projectAgentWorkload([blocked, item("other", "other")], "sales", "2026-09-20T00:00:00.000Z");
    expect(workload).toMatchObject({ total: 1, missingInfo: 1, rework: 0 });
  });
});
