import { describe, expect, it } from "vitest";
import {
  isCandidateScreeningDemoResult,
  isMatchingDemoResult,
  isNewClientDemoResult,
  isOfficeV3DemoResult,
  isOfficeV3DemoResultBase,
  isOfficeV3DemoResultStore,
  mergeOfficeV3DemoResult,
  normalizeOfficeV3DemoResultStore,
  type OfficeV3DemoResultStore,
} from "./officeV3DemoResult";
import type {
  CandidateScreeningDemoResult,
  MatchingDemoResult,
  NewClientDemoResult,
} from "@/types/officeV3ClaudeDemo";

function makeBaseResult(overrides: Record<string, unknown> = {}) {
  return {
    version: 2,
    source: "office-v3-claude",
    mock: true,
    scenarioId: "matching-proposal",
    scenarioTitle: "案件と人材のマッチング",
    completedAt: "2026-09-12T00:00:00.000Z",
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

function makeStore(results: OfficeV3DemoResultStore["results"] = {}): OfficeV3DemoResultStore {
  return { version: 1, results };
}

describe("isOfficeV3DemoResultBase", () => {
  it("accepts a valid base shape", () => {
    expect(isOfficeV3DemoResultBase(makeBaseResult())).toBe(true);
  });

  it("rejects wrong version", () => {
    expect(isOfficeV3DemoResultBase(makeBaseResult({ version: 1 }))).toBe(false);
  });

  it("rejects wrong source", () => {
    expect(isOfficeV3DemoResultBase(makeBaseResult({ source: "office-v3-codex" }))).toBe(false);
  });

  it("rejects mock: false", () => {
    expect(isOfficeV3DemoResultBase(makeBaseResult({ mock: false }))).toBe(false);
  });

  it("rejects an empty required string field", () => {
    expect(isOfficeV3DemoResultBase(makeBaseResult({ resultTitle: "" }))).toBe(false);
  });
});

describe("isMatchingDemoResult", () => {
  it("accepts a valid matching result", () => {
    expect(isMatchingDemoResult(makeMatchingResult())).toBe(true);
  });

  it("rejects a wrong scenarioId", () => {
    expect(isMatchingDemoResult(makeMatchingResult({ scenarioId: "new-client-outreach" as MatchingDemoResult["scenarioId"] }))).toBe(false);
  });

  it("rejects an empty opportunityId", () => {
    expect(isMatchingDemoResult(makeMatchingResult({ opportunityId: "" }))).toBe(false);
  });

  it("rejects an empty opportunityTitle", () => {
    expect(isMatchingDemoResult(makeMatchingResult({ opportunityTitle: "" }))).toBe(false);
  });
});

describe("isNewClientDemoResult", () => {
  it("accepts a valid new-client result", () => {
    expect(isNewClientDemoResult(makeNewClientResult())).toBe(true);
  });

  it("rejects an empty prospectId", () => {
    expect(isNewClientDemoResult(makeNewClientResult({ prospectId: "" }))).toBe(false);
  });

  it("rejects an empty prospectName", () => {
    expect(isNewClientDemoResult(makeNewClientResult({ prospectName: "" }))).toBe(false);
  });
});

describe("isCandidateScreeningDemoResult", () => {
  it("accepts a valid recruiting result", () => {
    expect(isCandidateScreeningDemoResult(makeRecruitingResult())).toBe(true);
  });

  it("rejects an empty candidateId", () => {
    expect(isCandidateScreeningDemoResult(makeRecruitingResult({ candidateId: "" }))).toBe(false);
  });

  it("rejects an empty candidateName", () => {
    expect(isCandidateScreeningDemoResult(makeRecruitingResult({ candidateName: "" }))).toBe(false);
  });
});

describe("isOfficeV3DemoResult (union guard)", () => {
  it("accepts a matching result", () => {
    expect(isOfficeV3DemoResult(makeMatchingResult())).toBe(true);
  });

  it("accepts a new-client result", () => {
    expect(isOfficeV3DemoResult(makeNewClientResult())).toBe(true);
  });

  it("accepts a recruiting result", () => {
    expect(isOfficeV3DemoResult(makeRecruitingResult())).toBe(true);
  });

  it("rejects an unconnected scenario shape (e.g. bp-alliance)", () => {
    expect(isOfficeV3DemoResult(makeBaseResult({ scenarioId: "bp-alliance" }))).toBe(false);
  });

  it("rejects an unconnected scenario shape (e.g. engineer-followup)", () => {
    expect(isOfficeV3DemoResult(makeBaseResult({ scenarioId: "engineer-followup" }))).toBe(false);
  });
});

describe("isOfficeV3DemoResultStore", () => {
  it("accepts a store with no slots filled", () => {
    expect(isOfficeV3DemoResultStore(makeStore())).toBe(true);
  });

  it("accepts matching only", () => {
    expect(isOfficeV3DemoResultStore(makeStore({ matching: makeMatchingResult() }))).toBe(true);
  });

  it("accepts newClient only", () => {
    expect(isOfficeV3DemoResultStore(makeStore({ newClient: makeNewClientResult() }))).toBe(true);
  });

  it("accepts recruiting only", () => {
    expect(isOfficeV3DemoResultStore(makeStore({ recruiting: makeRecruitingResult() }))).toBe(true);
  });

  it("accepts all 3 slots filled", () => {
    expect(isOfficeV3DemoResultStore(makeStore({
      matching: makeMatchingResult(),
      newClient: makeNewClientResult(),
      recruiting: makeRecruitingResult(),
    }))).toBe(true);
  });

  it("rejects a wrong container version", () => {
    expect(isOfficeV3DemoResultStore({ version: 2, results: {} })).toBe(false);
  });

  it("rejects an invalid matching slot", () => {
    expect(isOfficeV3DemoResultStore(makeStore({ matching: makeMatchingResult({ opportunityId: "" }) }))).toBe(false);
  });

  it("rejects an invalid newClient slot", () => {
    expect(isOfficeV3DemoResultStore(makeStore({ newClient: makeNewClientResult({ prospectId: "" }) }))).toBe(false);
  });

  it("rejects an invalid recruiting slot", () => {
    expect(isOfficeV3DemoResultStore(makeStore({ recruiting: makeRecruitingResult({ candidateId: "" }) }))).toBe(false);
  });

  it("rejects the whole store when one slot is valid and another is invalid (partial invalid)", () => {
    expect(isOfficeV3DemoResultStore(makeStore({
      matching: makeMatchingResult(),
      newClient: makeNewClientResult({ prospectId: "" }),
    }))).toBe(false);
  });
});

describe("normalizeOfficeV3DemoResultStore", () => {
  it("accepts a current 3-slot store as-is (value-equal)", () => {
    const store = makeStore({
      matching: makeMatchingResult(),
      newClient: makeNewClientResult(),
      recruiting: makeRecruitingResult(),
    });
    expect(normalizeOfficeV3DemoResultStore(store)).toEqual(store);
  });

  it("accepts a legacy 2-slot store (no recruiting key)", () => {
    const store = makeStore({ matching: makeMatchingResult(), newClient: makeNewClientResult() });
    expect(normalizeOfficeV3DemoResultStore(store)).toEqual(store);
  });

  it("wraps a legacy standalone matching result into results.matching", () => {
    const legacy = makeMatchingResult();
    expect(normalizeOfficeV3DemoResultStore(legacy)).toEqual({ version: 1, results: { matching: legacy } });
  });

  it("returns null for a malformed object", () => {
    expect(normalizeOfficeV3DemoResultStore({ foo: "bar" })).toBeNull();
  });

  it("returns null for an invalid store version", () => {
    expect(normalizeOfficeV3DemoResultStore({ version: 2, results: {} })).toBeNull();
  });

  it("returns null for a partially invalid store", () => {
    const store = makeStore({
      matching: makeMatchingResult(),
      newClient: makeNewClientResult({ prospectName: "" }),
    });
    expect(normalizeOfficeV3DemoResultStore(store)).toBeNull();
  });
});

describe("mergeOfficeV3DemoResult", () => {
  it("updates only the matching slot, keeping newClient and recruiting", () => {
    const newClient = makeNewClientResult();
    const recruiting = makeRecruitingResult();
    const store = makeStore({ newClient, recruiting });
    const nextMatching = makeMatchingResult({ opportunityTitle: "Java業務システム開発支援（再実行）" });

    const merged = mergeOfficeV3DemoResult(store, nextMatching);

    expect(merged).toEqual({ version: 1, results: { newClient, recruiting, matching: nextMatching } });
  });

  it("updates only the newClient slot, keeping matching and recruiting", () => {
    const matching = makeMatchingResult();
    const recruiting = makeRecruitingResult();
    const store = makeStore({ matching, recruiting });
    const nextNewClient = makeNewClientResult();

    const merged = mergeOfficeV3DemoResult(store, nextNewClient);

    expect(merged).toEqual({ version: 1, results: { matching, recruiting, newClient: nextNewClient } });
  });

  it("updates only the recruiting slot, keeping matching and newClient", () => {
    const matching = makeMatchingResult();
    const newClient = makeNewClientResult();
    const store = makeStore({ matching, newClient });
    const nextRecruiting = makeRecruitingResult();

    const merged = mergeOfficeV3DemoResult(store, nextRecruiting);

    expect(merged).toEqual({ version: 1, results: { matching, newClient, recruiting: nextRecruiting } });
  });

  it("creates a single-slot store when the existing store is null", () => {
    const result = makeMatchingResult();
    expect(mergeOfficeV3DemoResult(null, result)).toEqual({ version: 1, results: { matching: result } });
  });
});
