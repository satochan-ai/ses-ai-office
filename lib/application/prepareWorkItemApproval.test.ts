import { describe, expect, it } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";
import type { Approval } from "@/types/approval";
import type { WorkItem } from "@/types/workItem";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";
import { createSessionStorageWorkItemRepository, SESSION_WORK_ITEM_REPOSITORY_KEY } from "@/lib/repositories/sessionStorageWorkItemRepository";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { createManualWorkItem, manualWorkItemId } from "./createManualWorkItem";
import { reviseManualWorkItem } from "./reviseManualWorkItem";

const base = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: "wi-1", kind: "matching-proposal", source: { type: "demo-seed", ref: "demo" }, sourceVersion: "v1", createdAt: "2026-09-20T00:00:00Z", updatedAt: "2026-09-20T00:00:00Z", assignedAgentId: "sales", assignedHumanId: "demo-human", relations: { opportunityIds: ["opp-1"], personIds: ["person-1"], partnerIds: [], clientIds: [], companyIds: [], parentWorkItemId: null, supersededByWorkItemId: null }, status: "preparation_recorded", nextAction: null, dueAt: null, missingInfo: [], conflicts: [], evidenceIds: ["e1"], proposalDecisions: [{ opportunityId: "opp-1", personId: "person-1", verdict: "fit", readiness: "ready_for_human_review", routeStatus: "clear", intentStatus: "confirmed", duplicateStatus: "none", startDateStatus: "matched", disclosureStatus: "defined", assessedAt: "2026-09-20T00:00:00Z", evidenceIds: ["e1"], blockerMissingInfoIds: [], blockerConflictIds: [] }], currentDeliverableId: null, approvalRequired: true, currentApprovalId: null, execution: { attempt: 1, lastAgentId: "sales", lastError: null, resumeStatus: null }, mode: "demo", schemaVersion: 1, ...overrides });

describe("prepareWorkItemApproval", () => {
  it("uses eligible repository state despite a blocked stale caller", async () => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base({ sourceVersion: "latest" })] });
    const caller = base({ status: "returned_for_rework", currentApprovalId: "stale" });
    expect(await prepareWorkItemApproval(caller, repository, "2026-09-20T01:00:00Z")).toMatchObject({ state: "pending", targetDeliverableHash: "demo-latest" });
  });
  it("respects blocked repository state despite an eligible caller", async () => {
    const current = base({ proposalDecisions: [{ ...base().proposalDecisions[0], readiness: "blocked" }] });
    const repository = createInMemoryWorkItemRepository({ workItems: [current] });
    expect(await prepareWorkItemApproval(base(), repository, "2026-09-20T01:00:00Z")).toBeNull();
    expect(await repository.getWorkItem(current.id)).toEqual(current);
    expect(await repository.listApprovalsByWorkItem(current.id)).toEqual([]);
  });
  it("respects the current repository approval id instead of duplicating preparation", async () => {
    const current = base({ currentApprovalId: "already-existing" });
    const repository = createInMemoryWorkItemRepository({ workItems: [current] });
    expect(await prepareWorkItemApproval(base(), repository, "2026-09-20T01:00:00Z")).toBeNull();
    expect(await repository.getWorkItem(current.id)).toEqual(current);
    expect(await repository.listApprovalsByWorkItem(current.id)).toEqual([]);
  });
  it("throws the existing not-found error when repository WorkItem is absent", async () => {
    const repository = createInMemoryWorkItemRepository();
    await expect(prepareWorkItemApproval(base(), repository, "2026-09-20T01:00:00Z")).rejects.toThrow("work-item-not-found");
    expect(await repository.listWorkItems()).toEqual([]);
    expect(await repository.listApprovalsByWorkItem("wi-1")).toEqual([]);
  });
  it.each(["approve-work-item", "reject-work-item", "return-for-rework"] as const)("executes %s after preparation and preserves its decision on bootstrap", async type => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base()] });
    const approval = await prepareWorkItemApproval(base(), repository, "2026-09-20T01:00:00Z");
    const prepared = (await repository.getWorkItem("wi-1"))!;
    const reason = "提案条件を再確認してください";
    const command = { type, commandId: `test-${type}`, workItemId: prepared.id, approvalId: approval!.id, actorId: "demo-human", issuedAt: "2026-09-20T02:00:00Z", reason };
    expect(await executeWorkItemCommandUseCase({ command, repositories: repository, approvalSnapshots: { [approval!.id]: approvalSnapshotForWorkItem(prepared) }, effectContext: { at: command.issuedAt, actor: { type: "human", id: "demo-human" } } })).toMatchObject({ ok: true });
    const saved = (await repository.getWorkItem(prepared.id))!;
    expect(saved.status).toBe(type === "approve-work-item" ? "preparation_recorded" : "returned_for_rework");
    expect(await repository.getApproval(approval!.id)).toMatchObject({ state: type === "approve-work-item" ? "approved" : type === "reject-work-item" ? "rejected" : "invalidated" });
    if (type === "return-for-rework") {
      expect(saved).toMatchObject({ currentApprovalId: null, reworkInfo: { reason, returnedBy: "demo-human", returnedAt: command.issuedAt } });
      expect(await repository.getApproval(approval!.id)).toMatchObject({ decisionComment: "returned_for_rework" });
    }
    if (type === "reject-work-item") expect(await repository.getApproval(approval!.id)).toMatchObject({ rejectionReason: reason });
    expect(await prepareWorkItemApproval(saved, repository, "2026-09-20T03:00:00Z")).toBeNull();
    expect(await repository.listApprovalsByWorkItem(saved.id)).toHaveLength(1);
  });

  it("creates and persists a pending prepare-only approval with bindings", async () => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base()] }); const item = base();
    const approval = await prepareWorkItemApproval(item, repository, "2026-09-20T01:00:00Z");
    expect(approval).toMatchObject({ id: "approval:wi-1", state: "pending", scope: { permits: ["prepare-only"] }, targetDeliverableId: "deliverable:wi-1", targetDeliverableVersion: 1, targetDeliverableHash: "demo-v1" });
    expect(await repository.getWorkItem(item.id)).toMatchObject({ currentApprovalId: approval?.id, status: "awaiting_approval" });
    expect(await repository.getApproval(approval!.id)).toMatchObject({ workItemId: item.id, targetDecisionSnapshotHash: approval!.targetDecisionSnapshotHash });
    const snapshot = approvalSnapshotForWorkItem(item); expect(snapshot.deliverable.hash).toBe(approval?.targetDeliverableHash);
    item.proposalDecisions[0].routeStatus = "conflict"; expect((await repository.getApproval(approval!.id))?.targetDecisionSnapshotHash).toBe(approval?.targetDecisionSnapshotHash);
  });

  it.each<[string, Partial<WorkItem>]>([
    ["returned for rework", { status: "returned_for_rework" }],
    ["unresolved information", { missingInfo: [{ status: "open" } as WorkItem["missingInfo"][number]] }],
    ["blocked readiness", { proposalDecisions: [{ ...base().proposalDecisions[0], readiness: "blocked" }] }],
    ["approval not required", { approvalRequired: false } as unknown as Partial<WorkItem>],
    ["current approval exists", { currentApprovalId: "approval:wi-1" }],
  ])("does not create approval when %s", async (_label, overrides) => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base(overrides)] }); expect(await prepareWorkItemApproval(base(overrides), repository, "2026-09-20T01:00:00Z")).toBeNull(); expect(await repository.listApprovalsByWorkItem("wi-1")).toHaveLength(0);
  });

  it("does not replace an existing approved or invalidated approval", async () => {
    const item = base({ currentApprovalId: "approval:wi-1" });
    const existing = { ...({} as Approval), id: "approval:wi-1", workItemId: item.id, state: "approved" } as Approval;
    const repository = createInMemoryWorkItemRepository({ workItems: [item], approvals: [existing] });
    expect(await prepareWorkItemApproval(item, repository, "2026-09-20T01:00:00Z")).toBeNull(); expect((await repository.getApproval(existing.id))?.state).toBe("approved");
  });

  it("surfaces repository failures without reporting success", async () => {
    const repository = createInMemoryWorkItemRepository({ workItems: [base()] }); const failing = { ...repository, saveWorkItem: async () => { throw new Error("repository-error"); } };
    await expect(prepareWorkItemApproval(base(), failing, "2026-09-20T01:00:00Z")).rejects.toThrow("repository-error");
  });
});

describe("prepareWorkItemApproval does not reopen ended work or overwrite approval records", () => {
  class StorageStub {
    values = new Map<string, string>();
    fail = false;
    getItem(key: string) { return this.values.get(key) ?? null; }
    setItem(key: string, value: string) { if (this.fail) throw new Error("quota-exceeded"); this.values.set(key, value); }
  }
  const human = { type: "human" as const, id: "demo-human" };
  const at = (minute: number) => `2026-10-23T02:${String(minute).padStart(2, "0")}:00.000Z`;
  const sourceId = manualWorkItemId("prep-guard-source");
  const input = { title: "架空 承認準備ガード案件", candidateLabel: "候補者A", skills: "Java", startDate: "matched", route: "clear" } as const;

  async function pendingManual(repository: WorkItemRepository, key = "prep-guard-source") {
    const id = manualWorkItemId(key);
    const created = await createManualWorkItem(input, repository, { submissionKey: key, now: at(0) });
    if (!created.ok) throw new Error("not created");
    await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "provide-missing-info", commandId: `ans-${key}`, workItemId: id, missingInfoId: created.workItem.missingInfo[0].id, actorId: "demo-human", issuedAt: at(1), value: { field: "disclosureScope", status: "defined" } }, effectContext: { at: at(1), actor: human } });
    const approval = await prepareWorkItemApproval((await repository.getWorkItem(id))!, repository, at(2));
    if (!approval) throw new Error("approval not prepared");
    return { id, approval };
  }
  async function decided(repository: WorkItemRepository, type: "approve-work-item" | "reject-work-item" | "return-for-rework") {
    const { id, approval } = await pendingManual(repository);
    const item = (await repository.getWorkItem(id))!;
    const command = type === "return-for-rework" ? { type, commandId: "decide", workItemId: id, actorId: "demo-human", issuedAt: at(3), reason: "修正" }
      : type === "reject-work-item" ? { type, commandId: "decide", workItemId: id, approvalId: approval.id, actorId: "demo-human", issuedAt: at(3), reason: "不可" }
      : { type, commandId: "decide", workItemId: id, approvalId: approval.id, actorId: "demo-human", issuedAt: at(3) };
    expect(await executeWorkItemCommandUseCase({ repositories: repository, command, approvalSnapshots: { [approval.id]: approvalSnapshotForWorkItem(item) }, effectContext: { at: at(3), actor: human } })).toMatchObject({ ok: true });
    return { id, approval };
  }
  const snapshot = async (repository: WorkItemRepository, id: string) => ({ item: await repository.getWorkItem(id), approvals: await repository.listApprovalsByWorkItem(id), evidence: await repository.listEvidenceByWorkItem(id) });

  it.each([["return-for-rework", "invalidated"], ["reject-work-item", "rejected"]] as const)("keeps a superseded source and its approval unchanged after %s when every item is prepared", async (type, approvalState) => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    const { approval } = await decided(repository, type);
    expect(await reviseManualWorkItem({ ...input, title: "架空 承認準備ガード案件（修正版）" }, repository, { sourceWorkItemId: sourceId, submissionKey: "prep-guard-next", now: at(4) })).toMatchObject({ ok: true });
    const before = await snapshot(repository, sourceId);
    expect(before.item).toMatchObject({ status: "superseded", currentApprovalId: null });
    expect(before.approvals).toMatchObject([{ id: approval.id, state: approvalState }]);
    const raw = storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY);
    // Visual Officeの読み込み時と同じく、置換済みの元案件にも呼ぶ。
    expect(await prepareWorkItemApproval(before.item!, repository, at(5))).toBeNull();
    expect(await snapshot(repository, sourceId)).toEqual(before);
    expect(storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(raw);
  });

  it.each([["approved", "approve-work-item"], ["rejected", "reject-work-item"], ["invalidated", "return-for-rework"]] as const)("never overwrites an existing %s approval with the same id even when the item looks preparable", async (state, type) => {
    const repository = createInMemoryWorkItemRepository(); const { id } = await decided(repository, type);
    // 現在の承認IDが外れ、準備条件だけは満たして見えるWorkItem（不整合・旧データを想定）。
    const looksPreparable: WorkItem = { ...(await repository.getWorkItem(id))!, status: "blocked_missing_info", currentApprovalId: null };
    const stored = createInMemoryWorkItemRepository({ workItems: [looksPreparable], approvals: await repository.listApprovalsByWorkItem(id), evidence: await repository.listEvidenceByWorkItem(id) });
    const before = await snapshot(stored, id);
    expect(before.approvals).toMatchObject([{ state }]);
    expect(await prepareWorkItemApproval(looksPreparable, stored, at(5))).toBeNull();
    expect(await snapshot(stored, id)).toEqual(before);
  });

  it.each(["closed", "cancelled", "superseded", "returned_for_rework", "awaiting_approval", "approval_invalidated", "approval_expired", "failed_execution", "failed_intake", "intake_received"] as const)("does not prepare an approval in status %s", async status => {
    const repository = createInMemoryWorkItemRepository(); const created = await createManualWorkItem(input, repository, { submissionKey: "prep-guard-source", now: at(0) });
    if (!created.ok) throw new Error("not created");
    const resolved: WorkItem = { ...created.workItem, status, missingInfo: created.workItem.missingInfo.map(info => ({ ...info, status: "resolved" as const, resolvedAt: at(1) })), proposalDecisions: created.workItem.proposalDecisions.map(decision => ({ ...decision, readiness: "ready_for_human_review" as const, disclosureStatus: "defined" as const })) };
    const evidence = await repository.listEvidenceByWorkItem(sourceId);
    const stored = createInMemoryWorkItemRepository({ workItems: [resolved], evidence });
    expect(await prepareWorkItemApproval(resolved, stored, at(5))).toBeNull();
    expect(await snapshot(stored, sourceId)).toEqual({ item: resolved, approvals: [], evidence });
  });

  it("keeps a repeated call on a pending approval safe and still prepares other items normally", async () => {
    const repository = createInMemoryWorkItemRepository(); const { id, approval } = await pendingManual(repository);
    const before = await snapshot(repository, id);
    expect(before.approvals).toMatchObject([{ id: approval.id, state: "pending" }]);
    expect(await prepareWorkItemApproval((await repository.getWorkItem(id))!, repository, at(6))).toBeNull();
    expect(await snapshot(repository, id)).toEqual(before);
    const other = await pendingManual(repository, "prep-guard-other");
    expect(other.approval).toMatchObject({ id: `approval:${other.id}`, state: "pending" });
    expect(await snapshot(repository, id)).toEqual(before);
  });

  it("does not leave a partial update when saving fails", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    const created = await createManualWorkItem(input, repository, { submissionKey: "prep-guard-source", now: at(0) });
    if (!created.ok) throw new Error("not created");
    await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "provide-missing-info", commandId: "ans", workItemId: sourceId, missingInfoId: created.workItem.missingInfo[0].id, actorId: "demo-human", issuedAt: at(1), value: { field: "disclosureScope", status: "defined" } }, effectContext: { at: at(1), actor: human } });
    const raw = storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY); storage.fail = true;
    await expect(prepareWorkItemApproval((await repository.getWorkItem(sourceId))!, repository, at(2))).rejects.toThrow();
    storage.fail = false;
    expect(storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(raw);
    expect(await prepareWorkItemApproval((await repository.getWorkItem(sourceId))!, repository, at(3))).toMatchObject({ state: "pending" });
  });
});
