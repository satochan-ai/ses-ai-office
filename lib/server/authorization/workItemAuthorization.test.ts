import { describe, expect, it } from "vitest";
import { demoResultsToWorkItems } from "@/lib/runtime/demoAdapter";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import { createApproval } from "@/lib/workItem/approval";
import { resolveMissingInfo } from "@/lib/workItem/missingInfo";
import type { Approval } from "@/types/approval";
import type { WorkItemAuthorizationInput } from "@/types/workItemAuthorization";
import { authorizeWorkItemCommand } from "./workItemAuthorization";

const at = "2026-10-01T00:00:00Z";
const workItem = { ...demoResultsToWorkItems([QA_SEED_RESULT], { now: at, createWorkItemId: () => "w" })[0], assignedHumanId: "human", currentApprovalId: "a" };
const approval: Approval = { ...createApproval({ id: "a", workItemId: "w", targetDeliverableId: "d", targetDeliverableVersion: 1, targetDeliverableHash: "hash", targetDecisionSnapshotHash: "decision", requestedBy: { type: "agent", id: "agent" }, requestedAt: at, scope: { fields: [], permits: ["prepare-only"], conditions: [] }, expiresAt: "2026-10-02", supersedesApprovalId: null }), approver: { type: "human", id: "human" } };
const context: WorkItemAuthorizationInput["context"] = { actor: { actorId: "human", actorType: "human", tenantId: "tenant" }, permissions: [] };
const input = (patch: Partial<WorkItemAuthorizationInput> = {}): WorkItemAuthorizationInput => ({ context, tenantId: "tenant", workItem, approval, command: { type: "approve-work-item", workItemId: "w", approvalId: "a" }, ...patch });
const other = { ...context, actor: { ...context.actor, actorId: "other" } };
const denied = (reason: string) => ({ allowed: false, reason });

describe("WorkItem authorization policy", () => {
  it.each(["approve-work-item", "reject-work-item"] as const)("requires current pending explicit approver for %s", type => {
    const base = input({ command: { type, workItemId: "w", approvalId: "a" } });
    expect(authorizeWorkItemCommand(base)).toEqual({ allowed: true });
    expect(authorizeWorkItemCommand({ ...base, context: other })).toEqual(denied("not_approver"));
    expect(authorizeWorkItemCommand({ ...base, tenantId: "other" })).toEqual(denied("tenant_mismatch"));
    expect(authorizeWorkItemCommand({ ...base, command: { type, workItemId: "w", approvalId: "old" } })).toEqual(denied("approval_not_current"));
    expect(authorizeWorkItemCommand({ ...base, approval: { ...approval, state: "approved" } })).toEqual(denied("approval_not_pending"));
    expect(authorizeWorkItemCommand({ ...base, approval: { ...approval, workItemId: "other" } })).toEqual(denied("approval_not_current"));
    expect(authorizeWorkItemCommand({ ...base, approval: { ...approval, id: "other" } })).toEqual(denied("approval_not_current"));
    expect(authorizeWorkItemCommand({ ...base, approval: null })).toEqual(denied("approval_not_current"));
    expect(authorizeWorkItemCommand({ ...base, workItem: { ...workItem, currentApprovalId: null } })).toEqual(denied("approval_not_current"));
    expect(authorizeWorkItemCommand({ ...base, approval: { ...approval, approver: null } })).toEqual(denied("not_approver"));
    expect(authorizeWorkItemCommand({ ...base, approval: { ...approval, approver: { type: "agent", id: "human" } } })).toEqual(denied("not_approver"));
    expect(authorizeWorkItemCommand({ ...base, context: { ...other, permissions: ["resolve-missing-info"] } })).toEqual(denied("not_approver"));
  });
  it("permits return only for the assigned Human", () => {
    const base = input({ command: { type: "return-for-rework", workItemId: "w" } });
    expect(authorizeWorkItemCommand(base)).toEqual({ allowed: true });
    expect(authorizeWorkItemCommand({ ...base, context: other })).toEqual(denied("not_assigned"));
    expect(authorizeWorkItemCommand({ ...base, workItem: { ...workItem, assignedHumanId: null } })).toEqual(denied("not_assigned"));
    expect(authorizeWorkItemCommand({ ...base, context: { ...other, permissions: ["resolve-missing-info"] } })).toEqual(denied("not_assigned"));
    expect(authorizeWorkItemCommand({ ...base, workItem: { ...workItem, assignedHumanId: null }, context: { ...context, permissions: ["resolve-missing-info"] } })).toEqual(denied("not_assigned"));
    expect(authorizeWorkItemCommand({ ...base, tenantId: "other" })).toEqual(denied("tenant_mismatch"));
  });
  it("requires existing MissingInfo plus assignment or resolution permission", () => {
    const base = input({ command: { type: "provide-missing-info", workItemId: "w", missingInfoId: workItem.missingInfo[0].id } });
    expect(authorizeWorkItemCommand(base)).toEqual({ allowed: true });
    expect(authorizeWorkItemCommand({ ...base, context: other })).toEqual(denied("permission_required"));
    expect(authorizeWorkItemCommand({ ...base, context: { ...other, permissions: ["resolve-missing-info"] } })).toEqual({ allowed: true });
    expect(authorizeWorkItemCommand({ ...base, command: { type: "provide-missing-info", workItemId: "w", missingInfoId: "absent" } })).toEqual(denied("missing_info_not_found"));
    expect(authorizeWorkItemCommand({ ...base, tenantId: "other" })).toEqual(denied("tenant_mismatch"));
    expect(authorizeWorkItemCommand({ ...base, workItem: { ...workItem, assignedHumanId: null } })).toEqual(denied("permission_required"));
  });
  it.each(["agent", "system"] as const)("rejects %s for every Human command", actorType => {
    const commands: WorkItemAuthorizationInput["command"][] = [
      { type: "approve-work-item", workItemId: "w", approvalId: "a" },
      { type: "reject-work-item", workItemId: "w", approvalId: "a" },
      { type: "return-for-rework", workItemId: "w" },
      { type: "provide-missing-info", workItemId: "w", missingInfoId: workItem.missingInfo[0].id },
    ];
    for (const command of commands) expect(authorizeWorkItemCommand(input({ command, context: { ...context, actor: { ...context.actor, actorType }, permissions: ["resolve-missing-info"] } }))).toEqual(denied("human_actor_required"));
  });
  it("rejects a mismatched command target before evaluating permissions", () => {
    expect(authorizeWorkItemCommand(input({ command: { type: "return-for-rework", workItemId: "other" } }))).toEqual(denied("command_not_permitted"));
  });
  it("leaves resolved MissingInfo business state to Domain and does not mutate inputs", () => {
    const resolved = { ...workItem, missingInfo: workItem.missingInfo.map(info => ({ ...info, status: "resolved" as const })) };
    const base = input({ workItem: resolved, command: { type: "provide-missing-info", workItemId: "w", missingInfoId: resolved.missingInfo[0].id } });
    const before = JSON.stringify(base);
    expect(authorizeWorkItemCommand(base)).toEqual({ allowed: true });
    expect(resolveMissingInfo({ workItem: resolved, missingInfoId: resolved.missingInfo[0].id, actorId: "human", resolvedAt: at, value: { field: "personIntent", status: "confirmed" } })).toMatchObject({ ok: false, code: "missing-info-already-resolved" });
    expect(JSON.stringify(base)).toBe(before);
  });
});
