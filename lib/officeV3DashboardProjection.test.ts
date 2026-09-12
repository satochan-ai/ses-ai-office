import { describe, expect, it } from "vitest";
import {
  projectCandidateScreeningDemoResult,
  projectMatchingDemoResult,
  projectNewClientDemoResult,
  projectV3DemoResultToDashboard,
} from "./officeV3DashboardProjection";
import type {
  CandidateScreeningDemoResult,
  MatchingDemoResult,
  NewClientDemoResult,
} from "@/types/officeV3ClaudeDemo";

const FORBIDDEN_EXTERNAL_ACTION_TEXTS = ["送信済み", "アプローチ済み", "CRM登録済み", "商談設定済み", "接触済み"];

function makeBaseResult(overrides: Record<string, unknown> = {}) {
  return {
    version: 2 as const,
    source: "office-v3-claude" as const,
    mock: true as const,
    scenarioId: "matching-proposal",
    scenarioTitle: "案件と人材のマッチング",
    completedAt: "2026-09-12T09:05:00.000Z",
    finalAgentId: "manager",
    finalAgentName: "AI営業Mgr",
    resultTitle: "案件と人材のマッチング完了",
    resultSummary: "Human承認済み。提案準備が完了しました。",
    ...overrides,
  };
}

function makeMatchingResult(overrides: Partial<MatchingDemoResult> = {}): MatchingDemoResult {
  return {
    ...makeBaseResult(),
    scenarioId: "matching-proposal",
    opportunityId: "mock-opp-001",
    opportunityTitle: "Java業務システム開発支援",
    ...overrides,
  } as MatchingDemoResult;
}

function makeNewClientResult(overrides: Partial<NewClientDemoResult> = {}): NewClientDemoResult {
  return {
    ...makeBaseResult({
      scenarioId: "new-client-outreach",
      finalAgentId: "newbiz",
      finalAgentName: "AI新規開拓担当",
      resultTitle: "新規顧客への初回アプローチ準備完了",
      resultSummary: "Human承認済み。初回アプローチの準備が完了しました。",
    }),
    scenarioId: "new-client-outreach",
    prospectId: "mock-prospect-001",
    prospectName: "株式会社ネクストリンク",
    ...overrides,
  } as NewClientDemoResult;
}

function makeRecruitingResult(overrides: Partial<CandidateScreeningDemoResult> = {}): CandidateScreeningDemoResult {
  return {
    ...makeBaseResult({
      scenarioId: "candidate-screening",
      finalAgentId: "recruit",
      finalAgentName: "AI採用担当",
      resultTitle: "採用候補者の面接案内準備完了",
      resultSummary: "Human承認済み。面接案内の準備が完了しました。",
    }),
    scenarioId: "candidate-screening",
    candidateId: "mock-candidate-001",
    candidateName: "田中一郎（モック・架空の人物）",
    ...overrides,
  } as CandidateScreeningDemoResult;
}

function expectCompletionLogContract(log: { time: string; agent: string; action: string; status: string }, result: { finalAgentName: string; resultTitle: string }) {
  expect(log.agent).toBe(result.finalAgentName);
  expect(log.action).toContain(result.resultTitle);
  expect(log.action).toContain("（V3 Demo・Mock）");
  expect(log.status).toBe("完了");
  expect(log.time).toMatch(/^\d{2}:\d{2}$|^--:--$/);
  for (const forbidden of FORBIDDEN_EXTERNAL_ACTION_TEXTS) {
    expect(log.action).not.toContain(forbidden);
  }
}

describe("projectMatchingDemoResult", () => {
  const result = makeMatchingResult();
  const projection = projectMatchingDemoResult(result);

  it("returns scenarioId=matching-proposal and task.id=8", () => {
    expect(projection.scenarioId).toBe("matching-proposal");
    expect(projection.task.id).toBe(8);
  });

  it("includes log, task and pipelineCard but not prospectCard/recruitingCard", () => {
    expect(projection).toHaveProperty("log");
    expect(projection).toHaveProperty("task");
    expect(projection).toHaveProperty("pipelineCard");
    expect("prospectCard" in projection).toBe(false);
    expect("recruitingCard" in projection).toBe(false);
  });

  it("fixes the customer-proposal-preparation business text with no external-send wording", () => {
    expect(projection.task.title).toBe("マッチング結果を確認し、顧客への提案を準備する");
    expect(projection.pipelineCard.next).toBe("顧客への提案を準備");
    for (const forbidden of FORBIDDEN_EXTERNAL_ACTION_TEXTS) {
      expect(projection.task.title).not.toContain(forbidden);
      expect(projection.pipelineCard.next).not.toContain(forbidden);
    }
  });

  it("satisfies the completion log contract", () => {
    expectCompletionLogContract(projection.log, result);
  });

  it("carries the opportunity identifiers straight through to the pipeline card", () => {
    expect(projection.pipelineCard.opportunityId).toBe(result.opportunityId);
    expect(projection.pipelineCard.title).toBe(result.opportunityTitle);
  });
});

describe("projectNewClientDemoResult", () => {
  const result = makeNewClientResult();
  const projection = projectNewClientDemoResult(result);

  it("returns scenarioId=new-client-outreach and task.id=9", () => {
    expect(projection.scenarioId).toBe("new-client-outreach");
    expect(projection.task.id).toBe(9);
  });

  it("includes log, task and prospectCard but not pipelineCard/recruitingCard", () => {
    expect(projection).toHaveProperty("log");
    expect(projection).toHaveProperty("task");
    expect(projection).toHaveProperty("prospectCard");
    expect("pipelineCard" in projection).toBe(false);
    expect("recruitingCard" in projection).toBe(false);
  });

  it("fixes the first-approach-ready business text with no external-send wording", () => {
    expect(projection.prospectCard.touch).toBe("初回アプローチ準備完了");
    for (const forbidden of FORBIDDEN_EXTERNAL_ACTION_TEXTS) {
      expect(projection.prospectCard.touch).not.toContain(forbidden);
      expect(projection.task.title).not.toContain(forbidden);
    }
  });

  it("satisfies the completion log contract", () => {
    expectCompletionLogContract(projection.log, result);
  });

  it("carries the prospect identifiers straight through to the prospect card", () => {
    expect(projection.prospectCard.prospectId).toBe(result.prospectId);
    expect(projection.prospectCard.company).toBe(result.prospectName);
  });
});

describe("projectCandidateScreeningDemoResult", () => {
  const result = makeRecruitingResult();
  const projection = projectCandidateScreeningDemoResult(result);

  it("returns scenarioId=candidate-screening and task.id=10", () => {
    expect(projection.scenarioId).toBe("candidate-screening");
    expect(projection.task.id).toBe(10);
  });

  it("includes log, task and recruitingCard but not pipelineCard/prospectCard", () => {
    expect(projection).toHaveProperty("log");
    expect(projection).toHaveProperty("task");
    expect(projection).toHaveProperty("recruitingCard");
    expect("pipelineCard" in projection).toBe(false);
    expect("prospectCard" in projection).toBe(false);
  });

  it("fixes the interview-guide-ready business text", () => {
    expect(projection.recruitingCard.status).toBe("面接案内準備完了");
    expect(projection.task.title).toBe("候補者情報と面接案内内容を確認する");
    expect(projection.recruitingCard.name).toBe("田中一郎（モック・架空の人物）");
  });

  it("satisfies the completion log contract", () => {
    expectCompletionLogContract(projection.log, result);
  });

  it("carries the candidate identifiers straight through to the recruiting card", () => {
    expect(projection.recruitingCard.candidateId).toBe(result.candidateId);
    expect(projection.recruitingCard.name).toBe(result.candidateName);
  });
});

describe("projectV3DemoResultToDashboard (dispatch)", () => {
  it("dispatches a matching result to projectMatchingDemoResult's output", () => {
    const result = makeMatchingResult();
    expect(projectV3DemoResultToDashboard(result)).toEqual(projectMatchingDemoResult(result));
  });

  it("dispatches a new-client result to projectNewClientDemoResult's output", () => {
    const result = makeNewClientResult();
    expect(projectV3DemoResultToDashboard(result)).toEqual(projectNewClientDemoResult(result));
  });

  it("dispatches a recruiting result to projectCandidateScreeningDemoResult's output", () => {
    const result = makeRecruitingResult();
    expect(projectV3DemoResultToDashboard(result)).toEqual(projectCandidateScreeningDemoResult(result));
  });
});
