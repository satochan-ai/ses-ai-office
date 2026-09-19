import { describe, expect, it } from "vitest";
import { projectWorkItemsToDecisionQueue } from "@/lib/workItem/projection/dashboard";
import type { CandidateScreeningDemoResult, MatchingDemoResult, NewClientDemoResult, PartnerDemoResult } from "@/types/officeV3ClaudeDemo";
import { buildDecisionQueueFromDemoResults, demoResultToWorkItem, demoResultsToWorkItems } from "./demoAdapter";

const common = { version: 2 as const, source: "office-v3-claude" as const, mock: true as const, scenarioTitle: "Demo", completedAt: "2026-09-19T10:00:00.000Z", finalAgentId: "agent-demo", finalAgentName: "Demo Agent", resultTitle: "準備完了", resultSummary: "Demo結果の要約" };
const matching: MatchingDemoResult = { ...common, scenarioId: "matching-proposal", opportunityId: "opp-demo", opportunityTitle: "架空案件" };
const client: NewClientDemoResult = { ...common, scenarioId: "new-client-outreach", prospectId: "client-demo", prospectName: "架空顧客" };
const candidate: CandidateScreeningDemoResult = { ...common, scenarioId: "candidate-screening", candidateId: "person-demo", candidateName: "架空候補者" };
const partner: PartnerDemoResult = { ...common, scenarioId: "bp-alliance", partnerId: "partner-demo", partnerName: "架空BP" };
const options = { now: "2026-09-19T12:00:00.000Z", createWorkItemId: (result: { scenarioId: string }, index?: number) => `wi-${result.scenarioId}-${index ?? 0}` };

describe("demoResultToWorkItem", () => {
  it.each([[matching, "matching-proposal"], [client, "new-client-outreach"], [candidate, "candidate-screening"], [partner, "bp-alliance"]] as const)("maps %s without changing runtime mode", (result, expectedKind) => {
    const item = demoResultToWorkItem(result, options);
    expect(item.kind).toBe(expectedKind); expect(item.mode).toBe("demo"); expect(item.source.type).toBe("demo-seed"); expect(item.createdAt).toBe(options.now); expect(item.currentApprovalId).toBeNull(); expect(item.status).toBe("preparation_recorded");
  });
  it("maps relations by result kind", () => {
    expect(demoResultToWorkItem(matching, options).relations.opportunityIds).toEqual(["opp-demo"]);
    expect(demoResultToWorkItem(client, options).relations.clientIds).toEqual(["client-demo"]);
    expect(demoResultToWorkItem(candidate, options).relations.personIds).toEqual(["person-demo"]);
    expect(demoResultToWorkItem(partner, options).relations.partnerIds).toEqual(["partner-demo"]);
  });
  it("keeps SES-specific matching fields unknown and records demo evidence", () => {
    const item = demoResultToWorkItem(matching, options); const decision = item.proposalDecisions[0];
    expect(decision).toMatchObject({ verdict: "unknown", readiness: "blocked", routeStatus: "unknown", intentStatus: "unknown", duplicateStatus: "unknown", startDateStatus: "unknown", disclosureStatus: "unknown" });
    expect(item.evidenceIds).toEqual(["demo-evidence:matching-proposal"]); expect(item.evidenceIds[0]).toContain("demo"); expect(item.nextAction?.label).toBe("提案内容を確認する");
  });
  it("does not create a real approval or external execution", () => {
    const item = demoResultToWorkItem(matching, options); expect(item.approvalRequired).toBe(true); expect(item.currentApprovalId).toBeNull(); expect(item.execution.lastError).toBeNull(); expect(item.mode).not.toBe("real");
  });
  it("is deterministic, non-mutating, and queue-compatible", () => {
    const before = JSON.stringify(matching); const first = demoResultToWorkItem(matching, options); const second = demoResultToWorkItem(matching, options);
    expect(first).toEqual(second); expect(JSON.stringify(matching)).toBe(before); expect(() => projectWorkItemsToDecisionQueue([first], options.now)).not.toThrow();
  });
  it("supports deterministic conversion of multiple results", () => { const items = demoResultsToWorkItems([matching, client, candidate, partner], options); expect(items).toHaveLength(4); expect(new Set(items.map(item => item.id)).size).toBe(4); });
  it("builds an empty queue for no results and a demo queue for all four results", () => {
    expect(buildDecisionQueueFromDemoResults([], options.now).cards).toHaveLength(0);
    const queue = buildDecisionQueueFromDemoResults([matching, client, candidate, partner], options.now);
    expect(queue.cards).toHaveLength(4); expect(queue.cards.every(card => card.isDemo)).toBe(true); expect(queue.cards.map(card => card.workItemId)).toEqual(["wi-demo-matching-proposal", "wi-demo-new-client-outreach", "wi-demo-candidate-screening", "wi-demo-bp-alliance"]);
    const matchingCard = queue.cards.find(card => card.workItemId === "wi-demo-matching-proposal");
    expect(matchingCard).toMatchObject({ bucket: "awaiting_human", severity: "warning", requiredHumanAction: "次の人間タスクを実行する" });
    expect(matchingCard?.reasonSummary).toEqual(["提案経路が未確認", "開示範囲が未確認"]);
  });
});
