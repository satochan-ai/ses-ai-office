import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkDraftGenerationGuard,
  evaluateProposalDecision,
  findInvariantViolations,
  transition,
  WORK_ITEM_STATUSES,
  type DomainEffect,
  type TransitionFailure,
  type TransitionResult,
  type TransitionSuccess,
  type TransitionTrigger,
} from "./stateMachine";
import type {
  ConflictInfo,
  MissingInfo,
  ProposalDecision,
  WorkItem,
  WorkItemStatus,
} from "@/types/workItem";

let clock = 0;
function at(): string {
  clock += 1;
  return new Date(Date.UTC(2026, 8, 19, 0, clock)).toISOString();
}

function makeDecision(overrides: Partial<ProposalDecision> = {}): ProposalDecision {
  return {
    opportunityId: "opp-1",
    personId: "person-1",
    verdict: "fit",
    readiness: "ready_for_human_review",
    routeStatus: "clear",
    intentStatus: "confirmed",
    duplicateStatus: "none",
    startDateStatus: "matched",
    disclosureStatus: "defined",
    assessedAt: "2026-09-19T00:00:00.000Z",
    evidenceIds: ["ev-1"],
    blockerMissingInfoIds: [],
    blockerConflictIds: [],
    ...overrides,
  };
}

function makeMissingInfo(overrides: Partial<MissingInfo> = {}): MissingInfo {
  return {
    id: "mi-1",
    workItemId: "wi-1",
    field: "personIntent",
    subjectPersonId: "person-1",
    question: "本人の提案意向を確認してください",
    status: "open",
    raisedAt: "2026-09-19T00:00:00.000Z",
    resolvedAt: null,
    ...overrides,
  };
}

function makeConflict(overrides: Partial<ConflictInfo> = {}): ConflictInfo {
  return {
    id: "cf-1",
    workItemId: "wi-1",
    kind: "start_date_mismatch",
    description: "開始日が案件と本人で一致しません",
    subjectPersonId: "person-1",
    evidenceIds: ["ev-1"],
    status: "open",
    detectedAt: "2026-09-19T00:00:00.000Z",
    resolvedAt: null,
    ...overrides,
  };
}

function makeItem(status: WorkItemStatus = "intake_received", overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "wi-1",
    kind: "opportunity_proposal",
    source: { type: "email", ref: "mail-001" },
    sourceVersion: "v1",
    createdAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
    assignedAgentId: "agent-x",
    assignedHumanId: "human-1",
    relations: {
      opportunityIds: ["opp-1"],
      personIds: [],
      partnerIds: [],
      clientIds: [],
      companyIds: [],
      parentWorkItemId: null,
      supersededByWorkItemId: null,
    },
    status,
    nextAction: null,
    dueAt: null,
    missingInfo: [],
    conflicts: [],
    evidenceIds: [],
    proposalDecisions: [],
    currentDeliverableId: null,
    approvalRequired: true,
    currentApprovalId: null,
    execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null },
    mode: "demo",
    schemaVersion: 1,
    ...overrides,
  };
}

/** info_gap_check に到達済みの、決定が1件入ったWork Item。 */
function makeGateItem(decision: Partial<ProposalDecision> = {}, overrides: Partial<WorkItem> = {}): WorkItem {
  return makeItem("info_gap_check", {
    relations: {
      opportunityIds: ["opp-1"],
      personIds: ["person-1"],
      partnerIds: [],
      clientIds: [],
      companyIds: [],
      parentWorkItemId: null,
      supersededByWorkItemId: null,
    },
    evidenceIds: ["ev-1"],
    proposalDecisions: [makeDecision(decision)],
    ...overrides,
  });
}

function completed(overrides: Partial<Extract<TransitionTrigger, { type: "agent-completed" }>> = {}): TransitionTrigger {
  return { type: "agent-completed", at: at(), ...overrides };
}

function expectOk(result: TransitionResult): TransitionSuccess {
  if (!result.ok) throw new Error(`Expected ok but got ${result.error.code}: ${result.error.message}`);
  return result;
}

function expectFail(result: TransitionResult): TransitionFailure {
  if (result.ok) throw new Error(`Expected failure but moved ${result.from} -> ${result.to}`);
  return result;
}

function effectTypes(result: TransitionSuccess): DomainEffect["type"][] {
  return result.effects.map(effect => effect.type);
}

const ALL_TRIGGERS: TransitionTrigger[] = [
  { type: "agent-completed", at: "t" },
  { type: "agent-failed", at: "t", error: { code: "e", message: "m" } },
  { type: "human-approved", at: "t", humanId: "h", approvalId: "a" },
  { type: "human-rejected", at: "t", humanId: "h", approvalId: "a" },
  { type: "human-input-provided", at: "t", humanId: "h" },
  { type: "approval-expired", at: "t" },
  { type: "deliverable-changed", at: "t", deliverableId: "d" },
  { type: "retry", at: "t" },
  { type: "cancel", at: "t" },
  { type: "supersede", at: "t", supersededByWorkItemId: "wi-2" },
];

describe("status vocabulary", () => {
  it("exposes exactly the agreed 21 statuses", () => {
    expect([...WORK_ITEM_STATUSES].sort()).toEqual(
      [
        "intake_received", "structuring", "candidate_search", "condition_match", "info_gap_check",
        "draft_generation", "quality_check", "awaiting_approval", "preparation_recorded", "closed",
        "blocked_missing_info", "blocked_no_candidate", "blocked_conflict", "needs_human_input",
        "returned_for_rework", "approval_expired", "approval_invalidated",
        "failed_intake", "failed_execution", "cancelled", "superseded",
      ].sort(),
    );
  });

  it("uses preparation_recorded instead of outcome_recorded and has no external-send status", () => {
    expect(WORK_ITEM_STATUSES).toContain("preparation_recorded");
    expect(WORK_ITEM_STATUSES).not.toContain("outcome_recorded" as WorkItemStatus);
    for (const status of WORK_ITEM_STATUSES) {
      expect(status).not.toMatch(/sent|send|crm|delivered/);
    }
  });
});

describe("Step4.5 domain vocabulary", () => {
  it("supports adapter result kinds, demo sources, relations, and display actions", () => {
    const kinds = ["matching-proposal", "new-client-outreach", "candidate-screening", "bp-alliance", "engineer-follow"] as const;
    expect(kinds).toHaveLength(5);
    const item = makeItem("needs_human_input", {
      kind: "bp-alliance",
      source: { type: "demo-seed", ref: "demo-result-1" },
      relations: { ...makeItem().relations, opportunityIds: [], personIds: ["person-1"], partnerIds: ["partner-1"], clientIds: ["client-1"] },
      nextAction: { kind: "provide_human_input", ownerType: "human", actor: "human", label: "BP対応を確認する", agentId: "bp-agent", dueAt: null },
    });
    expect(item.source.type).toBe("demo-seed");
    expect(item.relations.partnerIds).toEqual(["partner-1"]);
    expect(item.relations.clientIds).toEqual(["client-1"]);
    expect(item.nextAction?.label).toBe("BP対応を確認する");
  });
});

describe("happy path", () => {
  it("walks intake_received through closed", () => {
    const readyDecision = makeDecision();
    let item = makeItem("intake_received");
    const visited: WorkItemStatus[] = [item.status];

    const step = (trigger: TransitionTrigger) => {
      const result = expectOk(transition(item, trigger));
      item = result.item;
      visited.push(item.status);
      return result;
    };

    step(completed());
    step(completed());
    step(completed({ output: { relations: { personIds: ["person-1"] } } }));
    step(completed({ output: { proposalDecisions: [readyDecision], evidenceIds: ["ev-1"] } }));
    step(completed());
    step(completed({ output: { currentDeliverableId: "deliverable-1" } }));
    const approvalRequest = step(completed());
    expect(approvalRequest.effects).toContainEqual({
      type: "request-approval",
      workItemId: "wi-1",
      deliverableId: "deliverable-1",
      approvalId: approvalRequest.item.currentApprovalId,
    });
    step({ type: "human-approved", at: at(), humanId: "human-1", approvalId: approvalRequest.item.currentApprovalId! });
    step(completed());

    expect(visited).toEqual([
      "intake_received",
      "structuring",
      "candidate_search",
      "condition_match",
      "info_gap_check",
      "draft_generation",
      "quality_check",
      "awaiting_approval",
      "preparation_recorded",
      "closed",
    ]);
    expect(item.nextAction).toBeNull();
  });
});

describe("ProposalDecision guard (info_gap_check -> draft_generation)", () => {
  it("proceeds for a fit decision with evidence and no blockers", () => {
    const result = expectOk(transition(makeGateItem(), completed()));
    expect(result.to).toBe("draft_generation");
    expect(result.guardFailures).toEqual([]);
  });

  it("does not proceed for an unfit decision", () => {
    const item = makeGateItem({ verdict: "unfit" });
    const guard = checkDraftGenerationGuard(item);
    expect(guard.outcome).toBe("blocked");
    expect(guard.failures.map(f => f.code)).toContain("verdict_unfit");

    const result = expectOk(transition(item, completed()));
    expect(result.to).not.toBe("draft_generation");
    expect(result.to).toBe("blocked_no_candidate");
  });

  it("does not treat unknown as unfit: unknown verdict proceeds when nothing blocks it", () => {
    const result = expectOk(transition(makeGateItem({ verdict: "unknown" }), completed()));
    expect(result.to).toBe("draft_generation");
  });

  it("does not treat unknown statuses as blockers by themselves", () => {
    const item = makeGateItem({
      verdict: "unknown",
      routeStatus: "unknown",
      intentStatus: "unknown",
      duplicateStatus: "unknown",
      startDateStatus: "unknown",
    });
    expect(evaluateProposalDecision(item, item.proposalDecisions[0])).toEqual([]);
    expect(expectOk(transition(item, completed())).to).toBe("draft_generation");
  });

  it("still blocks an unknown verdict while a required missing-info blocker remains", () => {
    const item = makeGateItem(
      { verdict: "unknown", blockerMissingInfoIds: ["mi-1"] },
      { missingInfo: [makeMissingInfo()] },
    );
    const result = expectOk(transition(item, completed()));
    expect(result.to).toBe("blocked_missing_info");
    expect(result.guardFailures.map(f => f.code)).toContain("missing_info_blocker_open");
    expect(result.guardFailures[0].refIds).toEqual(["mi-1"]);
  });

  it("does not proceed when the person declined", () => {
    const item = makeGateItem({ intentStatus: "declined" });
    expect(evaluateProposalDecision(item, item.proposalDecisions[0]).map(f => f.code)).toContain("intent_declined");
    const result = expectOk(transition(item, completed()));
    expect(result.to).not.toBe("draft_generation");
    expect(result.to).toBe("blocked_no_candidate");
  });

  it("does not proceed on a confirmed duplicate proposal", () => {
    const item = makeGateItem({ duplicateStatus: "confirmed" });
    expect(evaluateProposalDecision(item, item.proposalDecisions[0]).map(f => f.code)).toContain("duplicate_confirmed");
    expect(expectOk(transition(item, completed())).to).toBe("blocked_no_candidate");
  });

  it("does not proceed on a route conflict", () => {
    const item = makeGateItem({ routeStatus: "conflict" });
    expect(evaluateProposalDecision(item, item.proposalDecisions[0]).map(f => f.code)).toContain("route_conflict");
    expect(expectOk(transition(item, completed())).to).toBe("blocked_conflict");
  });

  it("does not proceed on a start-date mismatch", () => {
    const item = makeGateItem({ startDateStatus: "mismatched" });
    expect(evaluateProposalDecision(item, item.proposalDecisions[0]).map(f => f.code)).toContain("start_date_mismatched");
    expect(expectOk(transition(item, completed())).to).toBe("blocked_conflict");
  });

  it.each(["unknown", "restricted"] as const)("does not proceed when disclosure is %s", disclosureStatus => {
    const item = makeGateItem({ disclosureStatus });
    expect(evaluateProposalDecision(item, item.proposalDecisions[0]).map(f => f.code)).toContain("disclosure_not_defined");
    expect(expectOk(transition(item, completed())).to).toBe("blocked_missing_info");
  });

  it("rejects a fit decision that has no evidence (guard failure)", () => {
    const item = makeGateItem({ verdict: "fit", evidenceIds: [] });
    expect(findInvariantViolations(item).map(f => f.code)).toEqual(["fit_without_evidence"]);
    expect(checkDraftGenerationGuard(item).outcome).toBe("invariant_violation");

    const result = expectFail(transition(item, completed()));
    expect(result.error.code).toBe("guard_failed");
    expect(result.error.failures.map(f => f.code)).toContain("fit_without_evidence");
  });

  it("blocks a non-fit decision without evidence as missing info", () => {
    const item = makeGateItem({ verdict: "unknown", evidenceIds: [] });
    expect(findInvariantViolations(item)).toEqual([]);
    const result = expectOk(transition(item, completed()));
    expect(result.to).toBe("blocked_missing_info");
    expect(result.guardFailures.map(f => f.code)).toContain("evidence_missing");
  });

  it("rejects agent output that carries a fit decision without evidence, before any state change", () => {
    const item = makeItem("condition_match", { relations: { ...makeItem().relations, personIds: ["person-1"] } });
    const result = expectFail(
      transition(item, completed({ output: { proposalDecisions: [makeDecision({ evidenceIds: [] })] } })),
    );
    expect(result.error.code).toBe("guard_failed");
  });

  it("blocks while a blocker missing-info is open, and proceeds once resolved or waived", () => {
    const decision = { blockerMissingInfoIds: ["mi-1"] };
    const open = makeGateItem(decision, { missingInfo: [makeMissingInfo({ status: "open" })] });
    expect(expectOk(transition(open, completed())).to).toBe("blocked_missing_info");

    const resolved = makeGateItem(decision, { missingInfo: [makeMissingInfo({ status: "resolved" })] });
    expect(expectOk(transition(resolved, completed())).to).toBe("draft_generation");

    const waived = makeGateItem(decision, { missingInfo: [makeMissingInfo({ status: "waived" })] });
    expect(expectOk(transition(waived, completed())).to).toBe("draft_generation");
  });

  it("blocks while a blocker conflict is open, and proceeds once resolved", () => {
    const decision = { blockerConflictIds: ["cf-1"] };
    const open = makeGateItem(decision, { conflicts: [makeConflict({ status: "open" })] });
    const blocked = expectOk(transition(open, completed()));
    expect(blocked.to).toBe("blocked_conflict");
    expect(blocked.guardFailures.map(f => f.code)).toContain("conflict_blocker_open");

    const resolved = makeGateItem(decision, { conflicts: [makeConflict({ status: "resolved" })] });
    expect(expectOk(transition(resolved, completed())).to).toBe("draft_generation");
  });

  it("treats a blocker id that points to nothing as still open", () => {
    const item = makeGateItem({ blockerMissingInfoIds: ["mi-missing"] });
    expect(expectOk(transition(item, completed())).to).toBe("blocked_missing_info");
  });

  it("ignores open missing info that is not a blocker of the decision", () => {
    const item = makeGateItem({}, { missingInfo: [makeMissingInfo({ status: "open" })] });
    expect(expectOk(transition(item, completed())).to).toBe("draft_generation");
  });

  it("parks at needs_human_input when only readiness=blocked is reported", () => {
    const result = expectOk(transition(makeGateItem({ readiness: "blocked" }), completed()));
    expect(result.to).toBe("needs_human_input");
  });

  it("treats readiness=not_recommended as no proposable candidate", () => {
    const result = expectOk(transition(makeGateItem({ readiness: "not_recommended" }), completed()));
    expect(result.to).toBe("blocked_no_candidate");
  });

  it("proceeds when at least one of several decisions is eligible", () => {
    const item = makeGateItem(
      {},
      {
        proposalDecisions: [
          makeDecision({ personId: "person-1", verdict: "unfit" }),
          makeDecision({ personId: "person-2" }),
        ],
      },
    );
    const guard = checkDraftGenerationGuard(item);
    expect(guard.outcome).toBe("proceed");
    if (guard.outcome === "proceed") {
      expect(guard.eligibleDecisions.map(d => d.personId)).toEqual(["person-2"]);
    }
    expect(expectOk(transition(item, completed())).to).toBe("draft_generation");
  });

  it("parks at blocked_no_candidate when there are no decisions at all", () => {
    const result = expectOk(transition(makeGateItem({}, { proposalDecisions: [] }), completed()));
    expect(result.to).toBe("blocked_no_candidate");
    expect(result.guardFailures.map(f => f.code)).toEqual(["no_decisions"]);
  });

  it("prefers conflict over missing info when both remain on a live decision", () => {
    const item = makeGateItem({ routeStatus: "conflict", disclosureStatus: "unknown" });
    expect(expectOk(transition(item, completed())).to).toBe("blocked_conflict");
  });
});

describe("candidate_search and condition_match", () => {
  it("parks at blocked_no_candidate when candidate_search finds no person", () => {
    const result = expectOk(transition(makeItem("candidate_search"), completed()));
    expect(result.to).toBe("blocked_no_candidate");
    expect(result.item.execution.resumeStatus).toBe("candidate_search");
    expect(result.guardFailures.map(f => f.code)).toEqual(["no_candidates"]);
  });

  it("moves condition_match to info_gap_check even while blockers are still open", () => {
    const item = makeItem("condition_match");
    const result = expectOk(
      transition(
        item,
        completed({
          output: {
            proposalDecisions: [makeDecision({ blockerMissingInfoIds: ["mi-1"] })],
            missingInfo: [makeMissingInfo()],
          },
        }),
      ),
    );
    expect(result.to).toBe("info_gap_check");
  });

  it("parks at blocked_no_candidate when every decision is rejected at condition_match", () => {
    const result = expectOk(
      transition(
        makeItem("condition_match"),
        completed({ output: { proposalDecisions: [makeDecision({ verdict: "unfit" })] } }),
      ),
    );
    expect(result.to).toBe("blocked_no_candidate");
  });

  it("can skip info_gap_check when the draft guard already passes", () => {
    const result = expectOk(
      transition(
        makeItem("condition_match"),
        completed({ skipInfoGapCheck: true, output: { proposalDecisions: [makeDecision()] } }),
      ),
    );
    expect(result.to).toBe("draft_generation");
  });

  it("does not skip info_gap_check past a failing guard", () => {
    const result = expectOk(
      transition(
        makeItem("condition_match"),
        completed({ skipInfoGapCheck: true, output: { proposalDecisions: [makeDecision({ routeStatus: "conflict" })] } }),
      ),
    );
    expect(result.to).toBe("blocked_conflict");
    expect(result.item.execution.resumeStatus).toBe("info_gap_check");
  });
});

describe("resuming from blocked states", () => {
  it("returns blocked_missing_info to info_gap_check and lets the guard pass after input", () => {
    const blocked = expectOk(
      transition(
        makeGateItem({ blockerMissingInfoIds: ["mi-1"] }, { missingInfo: [makeMissingInfo()] }),
        completed(),
      ),
    );
    expect(blocked.to).toBe("blocked_missing_info");
    expect(blocked.effects).toContainEqual({
      type: "request-human-input",
      workItemId: "wi-1",
      status: "blocked_missing_info",
    });

    const resumed = expectOk(
      transition(blocked.item, {
        type: "human-input-provided",
        at: at(),
        humanId: "human-1",
        input: { missingInfo: [makeMissingInfo({ status: "resolved" })] },
      }),
    );
    expect(resumed.to).toBe("info_gap_check");
    expect(resumed.item.execution.resumeStatus).toBeNull();

    expect(expectOk(transition(resumed.item, completed())).to).toBe("draft_generation");
  });

  it("returns blocked_no_candidate to candidate_search", () => {
    const blocked = expectOk(transition(makeItem("candidate_search"), completed()));
    const resumed = expectOk(
      transition(blocked.item, { type: "human-input-provided", at: at(), humanId: "human-1" }),
    );
    expect(resumed.to).toBe("candidate_search");
  });

  it("returns needs_human_input to info_gap_check by default", () => {
    const item = makeItem("needs_human_input");
    const resumed = expectOk(transition(item, { type: "human-input-provided", at: at(), humanId: "human-1" }));
    expect(resumed.to).toBe("info_gap_check");
  });

  it("rejects human input that carries a fit decision without evidence", () => {
    const result = expectFail(
      transition(makeItem("blocked_missing_info"), {
        type: "human-input-provided",
        at: at(),
        humanId: "human-1",
        input: { proposalDecisions: [makeDecision({ evidenceIds: [] })] },
      }),
    );
    expect(result.error.code).toBe("guard_failed");
  });
});

describe("prepare-only approval flow", () => {
  function awaitingApproval(overrides: Partial<WorkItem> = {}): WorkItem {
    return makeItem("awaiting_approval", { currentDeliverableId: "deliverable-1", currentApprovalId: "approval-1", ...overrides });
  }

  it("records preparation after approval and never moves to an external-send state", () => {
    const result = expectOk(
      transition(awaitingApproval(), { type: "human-approved", at: at(), humanId: "human-1", approvalId: "approval-1" }),
    );
    expect(result.to).toBe("preparation_recorded");
    expect(result.item.nextAction).toEqual({ kind: "close", ownerType: "system" });

    const record = result.effects.find(effect => effect.type === "record-execution");
    expect(record).toMatchObject({ from: "awaiting_approval", to: "preparation_recorded", actorId: "human-1" });
    expect(effectTypes(result).every(type => ["record-execution", "assign-agent", "request-approval", "invalidate-approval", "request-human-input"].includes(type))).toBe(true);
  });

  it("closes only after the preparation record step completes", () => {
    const recorded = expectOk(
      transition(awaitingApproval(), { type: "human-approved", at: at(), humanId: "human-1", approvalId: "approval-1" }),
    );
    const closed = expectOk(transition(recorded.item, completed()));
    expect(closed.to).toBe("closed");
  });

  it("rejects an approval that does not match the current approval request", () => {
    const result = expectFail(
      transition(awaitingApproval(), { type: "human-approved", at: at(), humanId: "human-1", approvalId: "approval-OTHER" }),
    );
    expect(result.error.code).toBe("invalid_trigger");
  });

  it("rejects approval without a current request or with the wrong approver", () => {
    expect(expectFail(transition(awaitingApproval({ currentApprovalId: null }), { type: "human-approved", at: at(), humanId: "human-1", approvalId: "approval-1" })).error.code).toBe("invalid_trigger");
    expect(expectFail(transition(awaitingApproval({ assignedHumanId: "human-2" }), { type: "human-approved", at: at(), humanId: "human-1", approvalId: "approval-1" })).error.code).toBe("invalid_trigger");
  });

  it.each(["approved", "rejected", "expired", "invalidated"] as const)("rejects a %s approval", approvalState => {
    expect(expectFail(transition(awaitingApproval(), { type: "human-approved", at: at(), humanId: "human-1", approvalId: "approval-1", approvalState })).error.code).toBe("invalid_trigger");
  });

  it("returns a rejected item for rework and back into quality_check", () => {
    const rejected = expectOk(
      transition(awaitingApproval(), {
        type: "human-rejected",
        at: at(),
        humanId: "human-1",
        approvalId: "approval-1",
        reason: "単価の記載が不足",
      }),
    );
    expect(rejected.to).toBe("returned_for_rework");
    expect(rejected.item.currentApprovalId).toBeNull();
    expect(rejected.effects).toContainEqual({ type: "assign-agent", workItemId: "wi-1", forStatus: "returned_for_rework" });

    const reworked = expectOk(transition(rejected.item, completed({ output: { currentDeliverableId: "deliverable-2" } })));
    expect(reworked.to).toBe("quality_check");
  });

  it("expires an approval and re-requests it on retry", () => {
    const expired = expectOk(transition(awaitingApproval(), { type: "approval-expired", at: at() }));
    expect(expired.to).toBe("approval_expired");
    expect(expired.effects).toContainEqual({
      type: "invalidate-approval",
      workItemId: "wi-1",
      approvalId: "approval-1",
      reason: "expired",
    });

    const retried = expectOk(transition(expired.item, { type: "retry", at: at() }));
    expect(retried.to).toBe("awaiting_approval");
    expect(retried.effects).toContainEqual({ type: "request-approval", workItemId: "wi-1", deliverableId: "deliverable-1", approvalId: retried.item.currentApprovalId });
  });

  it("invalidates the approval when the deliverable changes, then re-runs quality_check on retry", () => {
    const invalidated = expectOk(
      transition(awaitingApproval(), { type: "deliverable-changed", at: at(), deliverableId: "deliverable-2" }),
    );
    expect(invalidated.to).toBe("approval_invalidated");
    expect(invalidated.item.currentDeliverableId).toBe("deliverable-2");
    expect(invalidated.item.currentApprovalId).toBeNull();
    expect(invalidated.effects).toContainEqual({
      type: "invalidate-approval",
      workItemId: "wi-1",
      approvalId: "approval-1",
      reason: "deliverable_changed",
    });

    const retried = expectOk(transition(invalidated.item, { type: "retry", at: at() }));
    expect(retried.to).toBe("quality_check");
  });

  it("does not request approval without a deliverable", () => {
    const result = expectFail(transition(makeItem("quality_check"), completed()));
    expect(result.error.code).toBe("guard_failed");
    expect(result.error.failures.map(f => f.code)).toEqual(["deliverable_missing"]);
  });
});

describe("failure and retry", () => {
  it("moves intake failures to failed_intake and retries at the same stage", () => {
    const failed = expectOk(
      transition(makeItem("structuring"), {
        type: "agent-failed",
        at: at(),
        error: { code: "parse_error", message: "本文を解析できません" },
      }),
    );
    expect(failed.to).toBe("failed_intake");
    expect(failed.item.execution.lastError).toMatchObject({ code: "parse_error" });

    const retried = expectOk(transition(failed.item, { type: "retry", at: at() }));
    expect(retried.to).toBe("structuring");
    expect(retried.item.execution.attempt).toBe(2);
    expect(retried.item.execution.resumeStatus).toBeNull();
  });

  it.each(["candidate_search", "info_gap_check", "draft_generation", "quality_check"] as const)(
    "returns failed_execution from %s to the stage that failed",
    stage => {
      const failed = expectOk(
        transition(makeItem(stage), { type: "agent-failed", at: at(), agentId: "agent-9", error: { code: "timeout", message: "t" } }),
      );
      expect(failed.to).toBe("failed_execution");
      expect(failed.item.execution.lastAgentId).toBe("agent-9");

      const retried = expectOk(transition(failed.item, { type: "retry", at: at() }));
      expect(retried.to).toBe(stage);
      expect(retried.item.execution.attempt).toBe(2);
    },
  );

  it("refuses to retry failed_execution without a recorded resume status", () => {
    const result = expectFail(transition(makeItem("failed_execution"), { type: "retry", at: at() }));
    expect(result.error.code).toBe("guard_failed");
    expect(result.error.failures.map(f => f.code)).toEqual(["resume_status_missing"]);
  });

  it("stops automatic retry after attempt three", () => {
    const result = expectOk(transition(makeItem("failed_execution", { execution: { attempt: 3, lastAgentId: null, lastError: null, resumeStatus: "quality_check" } }), { type: "retry", at: at() }));
    expect(result.to).toBe("needs_human_input");
  });

  it("refuses to resume into a terminal status even if the stored resume status is wrong", () => {
    const item = makeItem("failed_execution", {
      execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: "closed" },
    });
    expect(expectFail(transition(item, { type: "retry", at: at() })).error.code).toBe("guard_failed");
  });

  it("cannot fail in a state where no agent is running", () => {
    const result = expectFail(
      transition(makeItem("awaiting_approval"), { type: "agent-failed", at: at(), error: { code: "x", message: "y" } }),
    );
    expect(result.error.code).toBe("invalid_transition");
  });
});

describe("cancel and supersede", () => {
  it.each(["intake_received", "candidate_search", "awaiting_approval", "blocked_conflict", "failed_execution", "approval_expired"] as const)(
    "cancels from %s",
    status => {
      const result = expectOk(transition(makeItem(status), { type: "cancel", at: at(), reason: "案件が取り下げられた" }));
      expect(result.to).toBe("cancelled");
      expect(result.item.nextAction).toBeNull();
    },
  );

  it("invalidates a pending approval when cancelled", () => {
    const result = expectOk(
      transition(makeItem("awaiting_approval", { currentApprovalId: "approval-1" }), { type: "cancel", at: at() }),
    );
    expect(result.effects).toContainEqual({
      type: "invalidate-approval",
      workItemId: "wi-1",
      approvalId: "approval-1",
      reason: "cancelled",
    });
    expect(result.item.currentApprovalId).toBeNull();
  });

  it("supersedes an item and records the replacement", () => {
    const result = expectOk(
      transition(makeItem("info_gap_check"), { type: "supersede", at: at(), supersededByWorkItemId: "wi-2" }),
    );
    expect(result.to).toBe("superseded");
    expect(result.item.relations.supersededByWorkItemId).toBe("wi-2");
  });

  it("cannot cancel once preparation has been recorded", () => {
    expect(expectFail(transition(makeItem("preparation_recorded"), { type: "cancel", at: at() })).error.code).toBe("invalid_transition");
  });
});

describe("invalid transitions", () => {
  it.each([
    ["closed", "agent-completed"],
    ["structuring", "human-approved"],
    ["structuring", "retry"],
    ["awaiting_approval", "human-input-provided"],
    ["intake_received", "deliverable-changed"],
    ["draft_generation", "approval-expired"],
    ["blocked_conflict", "agent-completed"],
    ["failed_intake", "agent-completed"],
    ["awaiting_approval", "agent-completed"],
  ] as const)("rejects %s + %s", (status, triggerType) => {
    const trigger = ALL_TRIGGERS.find(t => t.type === triggerType) as TransitionTrigger;
    const result = expectFail(transition(makeItem(status), trigger));
    expect(result.error.code).toBe("invalid_transition");
    expect(result.error.from).toBe(status);
    expect(result.error.trigger).toBe(triggerType);
  });

  it.each(["closed", "cancelled", "superseded"] as const)("accepts no trigger at all once %s", status => {
    for (const trigger of ALL_TRIGGERS) {
      expect(expectFail(transition(makeItem(status), trigger)).error.code).toBe("invalid_transition");
    }
  });
});

describe("purity and bookkeeping", () => {
  it("never mutates the input item or trigger payloads", () => {
    const item = makeGateItem({ blockerMissingInfoIds: ["mi-1"] }, { missingInfo: [makeMissingInfo()] });
    const before = JSON.stringify(item);
    transition(item, completed());
    transition(item, { type: "cancel", at: at() });
    expect(JSON.stringify(item)).toBe(before);
  });

  it("stamps updatedAt from the trigger and clears the agent assignment on a status change", () => {
    const trigger = completed();
    const result = expectOk(transition(makeItem("intake_received"), trigger));
    expect(result.item.updatedAt).toBe(trigger.at);
    expect(result.item.assignedAgentId).toBeNull();
    expect(result.effects).toContainEqual({ type: "assign-agent", workItemId: "wi-1", forStatus: "structuring" });
    expect(result.item.nextAction).toEqual({ kind: "run_agent", ownerType: "agent" });
  });

  it("records who last worked on the item", () => {
    const result = expectOk(transition(makeItem("intake_received"), completed({ agentId: "agent-7" })));
    expect(result.item.execution.lastAgentId).toBe("agent-7");
    expect(result.item.execution.lastError).toBeNull();
  });

  it("reassigns quality_check without changing status when the deliverable changes", () => {
    const result = expectOk(
      transition(makeItem("quality_check", { currentDeliverableId: "d-1" }), {
        type: "deliverable-changed",
        at: at(),
        deliverableId: "d-2",
      }),
    );
    expect(result.from).toBe("quality_check");
    expect(result.to).toBe("quality_check");
    expect(result.item.currentDeliverableId).toBe("d-2");
    expect(result.effects).toContainEqual({ type: "assign-agent", workItemId: "wi-1", forStatus: "quality_check" });
  });

  it("emits an execution record for every successful transition", () => {
    const result = expectOk(transition(makeItem("intake_received"), completed()));
    expect(result.effects[0]).toMatchObject({
      type: "record-execution",
      from: "intake_received",
      to: "structuring",
      trigger: "agent-completed",
    });
  });

  it("keeps the state machine free of React, window and storage dependencies", () => {
    const raw = readFileSync(path.resolve(import.meta.dirname, "stateMachine.ts"), "utf8");
    const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/from ["']react/);
    expect(source).not.toMatch(/\bwindow\b|\bdocument\b|sessionStorage|localStorage|Date\.now|new Date\(/);
  });
});
