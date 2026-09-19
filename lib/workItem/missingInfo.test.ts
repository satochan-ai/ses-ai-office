import { describe, expect, it } from "vitest";
import type { ProposalDecision, WorkItem } from "@/types/workItem";
import { resolveMissingInfo } from "./missingInfo";

const decision = (overrides: Partial<ProposalDecision> = {}): ProposalDecision => ({ opportunityId: "o", personId: "p", verdict: "unknown", readiness: "blocked", routeStatus: "unknown", intentStatus: "unknown", duplicateStatus: "unknown", startDateStatus: "unknown", disclosureStatus: "unknown", assessedAt: "2026-09-19", evidenceIds: [], blockerMissingInfoIds: [], blockerConflictIds: [], ...overrides });
const make = (field: "proposalRoute" | "personIntent" | "availabilityStart" | "informationFreshness" | "duplicateProposal" | "disclosureScope", overrides: Partial<WorkItem> = {}): WorkItem => ({ id: "w", kind: "matching-proposal", source: { type: "demo-seed", ref: "demo" }, sourceVersion: "1", createdAt: "2026-09-19", updatedAt: "2026-09-19", assignedAgentId: null, assignedHumanId: "h", relations: { opportunityIds: ["o"], personIds: ["p"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status: "needs_human_input", nextAction: { kind: "provide_human_input", ownerType: "human" }, dueAt: null, missingInfo: [{ id: "m", workItemId: "w", field, subjectPersonId: "p", question: "?", status: "open", raisedAt: "2026-09-19", resolvedAt: null }], conflicts: [], evidenceIds: [], proposalDecisions: [decision()], currentDeliverableId: null, approvalRequired: true, currentApprovalId: null, execution: { attempt: 1, lastAgentId: null, lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1, ...overrides });
const base = { actorId: "h", resolvedAt: "2026-09-19T12:00:00.000Z" };

describe("missing info resolution domain", () => {
  it.each([
    ["proposalRoute", { field: "proposalRoute", status: "clear" }],
    ["personIntent", { field: "personIntent", status: "confirmed" }],
    ["availabilityStart", { field: "availabilityStart", status: "matched", date: "2026-10-01" }],
    ["informationFreshness", { field: "informationFreshness", note: "本人確認済み" }],
    ["duplicateProposal", { field: "duplicateProposal", status: "none" }],
    ["disclosureScope", { field: "disclosureScope", status: "defined" }],
  ] as const)("resolves %s, adds human evidence, and recalculates readiness", (field, value) => {
    const workItem = make(field); const result = resolveMissingInfo({ ...base, workItem, missingInfoId: "m", value });
    expect(result).toMatchObject({ ok: true, resolvedMissingInfoId: "m", evidenceId: "evidence:missing-info:m:2026-09-19T12:00:00.000Z" });
    if (result.ok) { expect(result.workItem.missingInfo[0]).toMatchObject({ status: "resolved", resolvedAt: base.resolvedAt, resolvedBy: { id: "h" } }); expect(result.workItem.evidenceIds).toHaveLength(1); expect(result.workItem.proposalDecisions[0].readiness).toBe(field === "disclosureScope" ? "ready_for_human_review" : "blocked"); }
  });
  it("applies negative statuses safely and keeps readiness blocked", () => {
    for (const [field, value, key] of [["personIntent", { field: "personIntent", status: "declined" }, "intentStatus"], ["proposalRoute", { field: "proposalRoute", status: "conflict" }, "routeStatus"], ["duplicateProposal", { field: "duplicateProposal", status: "confirmed" }, "duplicateStatus"], ["availabilityStart", { field: "availabilityStart", status: "mismatched", date: "2026-11-01" }, "startDateStatus"]] as const) {
      const result = resolveMissingInfo({ ...base, workItem: make(field), missingInfoId: "m", value }); expect(result.ok).toBe(true); if (result.ok) expect(result.workItem.proposalDecisions[0]).toMatchObject({ [key]: value.status, readiness: "blocked" });
    }
  });
  it("is idempotent by rejecting resolved or unknown info and preserves input", () => {
    const workItem = make("personIntent"); const before = JSON.stringify(workItem);
    expect(resolveMissingInfo({ ...base, workItem, missingInfoId: "unknown", value: { field: "personIntent", status: "confirmed" } })).toMatchObject({ ok: false, code: "missing-info-not-found" });
    const resolved = make("personIntent", { missingInfo: [{ ...make("personIntent").missingInfo[0], status: "resolved", resolvedAt: base.resolvedAt }] });
    expect(resolveMissingInfo({ ...base, workItem: resolved, missingInfoId: "m", value: { field: "personIntent", status: "confirmed" } })).toMatchObject({ ok: false, code: "missing-info-already-resolved" });
    resolveMissingInfo({ ...base, workItem, missingInfoId: "m", value: { field: "personIntent", status: "confirmed" } }); expect(JSON.stringify(workItem)).toBe(before);
  });
  it("emits approval invalidation when a current approval exists", () => {
    const result = resolveMissingInfo({ ...base, workItem: make("personIntent", { currentApprovalId: "ap1" }), missingInfoId: "m", value: { field: "personIntent", status: "confirmed" } });
    expect(result).toMatchObject({ ok: true, effects: [{ type: "record-execution" }, { type: "invalidate-approval", approvalId: "ap1" }] });
  });
});
