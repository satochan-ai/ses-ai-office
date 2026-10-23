import { describe, expect, it } from "vitest";
import { canRejectWorkItem, canReturnForRework, canShowApprovalDecisions, createHumanCommandGuard, hasCommandReason, nextActionState } from "./agentWorkItemActions";
import { projectAgentWorkload } from "./agentWorkload";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { createManualWorkItem } from "@/lib/application/createManualWorkItem";
import { executeWorkItemCommandUseCase } from "@/lib/application/executeWorkItemCommand";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "@/lib/application/prepareWorkItemApproval";
import type { Approval } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";

const item = (status: WorkItem["status"] = "awaiting_approval", id = "wi-1"): WorkItem => ({ id, kind: "matching-proposal", source: { type: "manual", ref: "x" }, sourceVersion: "1", createdAt: "2026-09-20", updatedAt: "2026-09-20", assignedAgentId: "agent", assignedHumanId: "demo-human", relations: { opportunityIds: [], personIds: [], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status, nextAction: null, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: [], proposalDecisions: [], currentDeliverableId: "d", approvalRequired: true, currentApprovalId: "approval:wi-1", execution: { attempt: 1, lastAgentId: "agent", lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1 });
const approval = (state: Approval["state"] = "pending", workItemId = "wi-1"): Approval => ({ id: "approval:wi-1", workItemId, targetDeliverableId: "d", targetDeliverableVersion: 1, targetDeliverableHash: "h", targetDecisionSnapshotHash: "s", requestedBy: { type: "agent", id: "agent" }, requestedAt: "2026-09-20", approver: null, decidedBy: null, decidedAt: null, scope: { fields: [], permits: ["prepare-only"], conditions: [] }, expiresAt: "2099-01-01", state, decisionComment: null, rejectionReason: null, supersedesApprovalId: null, invalidation: null });

describe("Visual Office WorkItem action boundaries", () => {
  it("does not invoke a second command while the first is unresolved", async () => {
    const guard = createHumanCommandGuard();
    let release!: () => void;
    let calls = 0;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const first = guard.run(async () => { calls += 1; await waiting; return { ok: true }; });
    expect(guard.isBusy()).toBe(true);
    expect(await guard.run(async () => { calls += 1; return { ok: true }; })).toMatchObject({ ok: false });
    expect(calls).toBe(1);
    release(); await first;
    expect(guard.isBusy()).toBe(false);
    expect(await guard.run(async () => ({ ok: true }))).toMatchObject({ ok: true });
  });

  it("releases the command guard after an exception", async () => {
    const guard = createHumanCommandGuard();
    await expect(guard.run(async () => { throw new Error("repository-error"); })).rejects.toThrow("repository-error");
    expect(guard.isBusy()).toBe(false);
    expect(await guard.run(async () => ({ ok: true }))).toMatchObject({ ok: true });
  });

  it.each([["pending", "pending"], ["approved", "approved"], ["rejected", "rejected"], ["invalidated", "invalidated"]] as const)("reject is based on current pending approval: %s", (_label, state) => {
    expect(canRejectWorkItem(item(), approval(state))).toBe(state === "pending");
  });
  it("reject rejects missing or mismatched approvals", () => {
    expect(canRejectWorkItem(item(), null)).toBe(false);
    expect(canRejectWorkItem(item(), approval("pending", "other"))).toBe(false);
  });
  it("return uses the existing transition rules", () => {
    expect(canReturnForRework(item("awaiting_approval"))).toBe(true);
    expect(canReturnForRework(item("quality_check"))).toBe(true);
    expect(canReturnForRework(item("closed"))).toBe(false);
  });
  it("requires a non-blank reason", () => { expect(hasCommandReason("")).toBe(false); expect(hasCommandReason(" ")).toBe(false); expect(hasCommandReason("修正理由")).toBe(true); });
  it("keeps reject and return actions mutually exclusive while submitting", () => { expect(nextActionState(nextActionState("idle", "edit"), "submit")).toBe("submitting"); expect(nextActionState("submitting", "submit")).toBe("submitting"); });
  it("supports cancel and keeps failed commands out of success state", () => { expect(nextActionState("editing", "cancel")).toBe("idle"); expect(nextActionState("submitting", "error")).toBe("error"); });
});

describe("approval decision actions in the Visual Office detail panel", () => {
  it.each<[string, WorkItem, Approval | null, boolean]>([
    ["a valid pending approval", item("awaiting_approval"), approval("pending"), true],
    ["missing information", { ...item("blocked_missing_info"), currentApprovalId: null }, null, false],
    ["an approved preparation", item("preparation_recorded"), approval("approved"), false],
    ["a rejection", { ...item("returned_for_rework"), currentApprovalId: null }, null, false],
    ["a rejected approval still referenced", item("returned_for_rework"), approval("rejected"), false],
    ["a return for rework", { ...item("returned_for_rework"), currentApprovalId: null }, approval("invalidated"), false],
    ["a superseded item", { ...item("superseded"), currentApprovalId: null }, null, false],
    ["a cancelled item", item("cancelled"), approval("pending"), false],
    ["a closed item", item("closed"), approval("approved"), false],
    ["quality check without an approval", { ...item("quality_check"), currentApprovalId: null }, null, false],
    ["no current approval id", { ...item("awaiting_approval"), currentApprovalId: null }, approval("pending"), false],
    ["a different current approval id", { ...item("awaiting_approval"), currentApprovalId: "approval:other" }, approval("pending"), false],
    ["an approval for another WorkItem", item("awaiting_approval"), approval("pending", "wi-other"), false],
    ["a missing approval record", item("awaiting_approval"), null, false],
  ])("shows approve / reject / rework only for %s when valid", (_label, workItem, current, expected) => {
    expect(canShowApprovalDecisions(workItem, current)).toBe(expected);
  });

  it("follows a manual item through answer, pending, approval and the refused rework after approval", async () => {
    const repository = createInMemoryWorkItemRepository(); const at = "2026-10-23T03:00:00.000Z"; const actor = { type: "human" as const, id: "demo-human" };
    const created = await createManualWorkItem({ title: "架空 操作表示案件", candidateLabel: "候補者A", skills: "Java", startDate: "matched", route: "clear" }, repository, { submissionKey: "action-boundary-01", now: at });
    if (!created.ok) throw new Error("not created");
    const id = created.workItem.id;
    const card = async () => projectAgentWorkload(await repository.listWorkItems(), "matching", at).items.find(entry => entry.id === id)!;
    const approvalOf = async (workItem: { currentApprovalId: string | null }) => workItem.currentApprovalId ? repository.getApproval(workItem.currentApprovalId) : null;
    expect(canShowApprovalDecisions(await card(), null)).toBe(false);
    expect((await card()).missingInfo.filter(info => info.status === "open")).toHaveLength(1);
    await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "provide-missing-info", commandId: "ans", workItemId: id, missingInfoId: created.workItem.missingInfo[0].id, actorId: "demo-human", issuedAt: at, value: { field: "disclosureScope", status: "defined" } }, effectContext: { at, actor } });
    const pending = (await prepareWorkItemApproval((await repository.getWorkItem(id))!, repository, at))!;
    expect(canShowApprovalDecisions(await card(), await approvalOf(await card()))).toBe(true);
    const prepared = (await repository.getWorkItem(id))!;
    expect(await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "approve-work-item", commandId: "approve", workItemId: id, approvalId: pending.id, actorId: "demo-human", issuedAt: at }, approvalSnapshots: { [pending.id]: approvalSnapshotForWorkItem(prepared) }, effectContext: { at, actor } })).toMatchObject({ ok: true });
    const approved = (await repository.getWorkItem(id))!;
    // 承認後も保存済みの結果（approved）は読めるが、確認操作は出さない。担当AIが外れるためパネルにも載らない。
    expect(await approvalOf(approved)).toMatchObject({ state: "approved" });
    expect(canShowApprovalDecisions(approved, await approvalOf(approved))).toBe(false);
    expect(projectAgentWorkload(await repository.listWorkItems(), "matching", at).items.some(entry => entry.id === id)).toBe(false);
    // UI以外から実行されても、既存Application・Domainが拒否し保存内容は変わらない。
    const before = { item: await repository.getWorkItem(id), approvals: await repository.listApprovalsByWorkItem(id) };
    expect(await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "return-for-rework", commandId: "late-rework", workItemId: id, actorId: "demo-human", issuedAt: at, reason: "承認後の修正" }, effectContext: { at, actor } })).toMatchObject({ ok: false, code: "effect-application-failed" });
    expect(await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "reject-work-item", commandId: "late-reject", workItemId: id, approvalId: pending.id, actorId: "demo-human", issuedAt: at, reason: "承認後の却下" }, approvalSnapshots: { [pending.id]: approvalSnapshotForWorkItem(approved) }, effectContext: { at, actor } })).toMatchObject({ ok: false });
    expect(await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "approve-work-item", commandId: "late-approve", workItemId: id, approvalId: pending.id, actorId: "demo-human", issuedAt: at }, approvalSnapshots: { [pending.id]: approvalSnapshotForWorkItem(approved) }, effectContext: { at, actor } })).toMatchObject({ ok: false });
    expect({ item: await repository.getWorkItem(id), approvals: await repository.listApprovalsByWorkItem(id) }).toEqual(before);
  });
});
