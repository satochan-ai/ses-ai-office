import { describe, expect, it } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { createSessionStorageWorkItemRepository, SESSION_WORK_ITEM_REPOSITORY_KEY } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { createSessionStorageWorkItemUnitOfWork } from "@/lib/repositories/sessionStorageWorkItemUnitOfWork";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import { projectWorkItemsToDecisionQueue } from "@/lib/workItem/projection/dashboard";
import type { WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { createManualWorkItem, manualWorkItemId } from "./createManualWorkItem";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";
import { initializeDemoWorkItemsFromResults } from "./initializeDemoWorkItems";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";
import { getManualRevisionDraft, reviseManualWorkItem } from "./reviseManualWorkItem";
import { startVisualHumanLoopDemo } from "./visualOfficeHumanLoopDemo";

class StorageStub {
  values = new Map<string, string>();
  fail = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error("quota-exceeded"); this.values.set(key, value); }
}

const human = { type: "human" as const, id: "demo-human" };
const sourceKey = "revise-source-01"; const sourceId = manualWorkItemId(sourceKey);
const reviseKey = "revise-next-0001"; const revisedId = manualWorkItemId(reviseKey);
const original = { title: "架空 Java保守案件", candidateLabel: "候補者A", skills: "Java", startDate: "matched", route: "clear" } as const;
const revisedInput = { title: "架空 Java保守案件（修正版）", candidateLabel: "候補者A", skills: "Java、Spring Boot", startDate: "unknown", route: "clear" } as const;
const at = (minute: number) => `2026-10-23T01:${String(minute).padStart(2, "0")}:00.000Z`;

const answer = (repositories: WorkItemRepository, item: WorkItem, field: string, value: never, minute: number) => executeWorkItemCommandUseCase({ repositories, command: { type: "provide-missing-info", commandId: `ans-${item.id}-${field}`, workItemId: item.id, missingInfoId: item.missingInfo.find(info => info.field === field)!.id, actorId: "demo-human", issuedAt: at(minute), value }, effectContext: { at: at(minute), actor: human } });
const decide = (repositories: WorkItemRepository, item: WorkItem, approvalId: string, type: "approve-work-item" | "reject-work-item", minute: number) => executeWorkItemCommandUseCase({ repositories, command: type === "approve-work-item" ? { type, commandId: `${type}-${item.id}-${minute}`, workItemId: item.id, approvalId, actorId: "demo-human", issuedAt: at(minute) } : { type, commandId: `${type}-${item.id}-${minute}`, workItemId: item.id, approvalId, actorId: "demo-human", issuedAt: at(minute), reason: "開示範囲を再確認" }, approvalSnapshots: { [approvalId]: approvalSnapshotForWorkItem(item) }, effectContext: { at: at(minute), actor: human } });

/** 元案件を作成→開示範囲回答→承認待ち→差し戻しまたは却下まで進める。 */
async function sent(repository: WorkItemRepository, outcome: "return-for-rework" | "reject-work-item") {
  const created = await createManualWorkItem(original, repository, { submissionKey: sourceKey, now: at(0) });
  if (!created.ok) throw new Error("not created");
  expect(await answer(repository, created.workItem, "disclosureScope", { field: "disclosureScope", status: "defined" } as never, 1)).toMatchObject({ ok: true });
  const approval = (await prepareWorkItemApproval((await repository.getWorkItem(sourceId))!, repository, at(2)))!;
  const item = (await repository.getWorkItem(sourceId))!;
  const result = outcome === "reject-work-item" ? await decide(repository, item, approval.id, "reject-work-item", 3)
    : await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "return-for-rework", commandId: "return", workItemId: sourceId, actorId: "demo-human", issuedAt: at(3), reason: "候補者条件を修正" }, effectContext: { at: at(3), actor: human } });
  expect(result).toMatchObject({ ok: true, workItem: { status: "returned_for_rework" } });
  return approval;
}
const revise = (repository: WorkItemRepository, input: unknown = revisedInput, submissionKey = reviseKey, sourceWorkItemId = sourceId) => reviseManualWorkItem(input, repository, { sourceWorkItemId, submissionKey, now: at(10) });

describe("reviseManualWorkItem", () => {
  it.each([
    ["return-for-rework", { kind: "returned", reason: "候補者条件を修正" }, "invalidated"],
    ["reject-work-item", { kind: "rejected", reason: "開示範囲を再確認" }, "rejected"],
  ] as const)("creates a successor after %s and supersedes the source through the domain transition", async (outcome, revision, approvalState) => {
    const repository = createInMemoryWorkItemRepository(); const oldApproval = await sent(repository, outcome);
    const before = (await repository.getWorkItem(sourceId))!;
    const evidenceBefore = await repository.listEvidenceByWorkItem(sourceId);
    expect(await getManualRevisionDraft(repository, sourceId)).toEqual({ ok: true, input: original, revision });
    const result = await revise(repository);
    expect(result).toMatchObject({ ok: true, created: true, revision });
    const source = (await repository.getWorkItem(sourceId))!;
    expect(source).toMatchObject({ status: "superseded", nextAction: null, relations: { supersededByWorkItemId: revisedId } });
    expect({ ...source, status: before.status, nextAction: before.nextAction, updatedAt: before.updatedAt, relations: before.relations }).toEqual(before);
    expect(source).toMatchObject({ proposalDecisions: before.proposalDecisions, missingInfo: before.missingInfo, evidenceIds: before.evidenceIds });
    expect(source.reworkInfo ?? null).toEqual(before.reworkInfo ?? null);
    expect(await repository.listEvidenceByWorkItem(sourceId)).toEqual(evidenceBefore);
    expect(await repository.getApproval(oldApproval.id)).toMatchObject({ state: approvalState });
    const revised = (await repository.getWorkItem(revisedId))!;
    expect(revised).toMatchObject({ mode: "demo", source: { type: "manual" }, kind: "matching-proposal", status: "blocked_missing_info", currentApprovalId: null, relations: { parentWorkItemId: sourceId, supersededByWorkItemId: null }, execution: { lastAgentId: null, resumeStatus: null } });
    expect(revised.missingInfo.map(info => [info.field, info.status])).toEqual([["availabilityStart", "open"], ["disclosureScope", "open"]]);
    expect(revised.missingInfo.every(info => info.workItemId === revisedId)).toBe(true);
    expect(revised.proposalDecisions[0]).toMatchObject({ readiness: "blocked", routeStatus: "clear", startDateStatus: "unknown", disclosureStatus: "unknown", evidenceIds: revised.evidenceIds });
    expect(await repository.listEvidenceByWorkItem(revisedId)).toMatchObject([{ kind: "source_excerpt", excerpt: JSON.stringify(revisedInput) }]);
    expect(projectWorkItemsToDecisionQueue(await repository.listWorkItems(), at(11)).cards.map(card => card.workItemId)).toEqual([revisedId]);
  });

  it("runs the successor through Human answers, a new approval and approval while the old approval stays unusable", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    const oldApproval = await sent(repository, "return-for-rework"); await revise(repository);
    let revised = (await repository.getWorkItem(revisedId))!;
    expect(await prepareWorkItemApproval(revised, repository, at(11))).toBeNull();
    expect(await answer(repository, revised, "availabilityStart", { field: "availabilityStart", status: "matched", date: "2026-11-01" } as never, 12)).toMatchObject({ ok: true });
    expect(await answer(repository, revised, "disclosureScope", { field: "disclosureScope", status: "defined" } as never, 13)).toMatchObject({ ok: true });
    const approval = (await prepareWorkItemApproval((await repository.getWorkItem(revisedId))!, repository, at(14)))!;
    expect(approval).toMatchObject({ id: `approval:${revisedId}`, workItemId: revisedId, state: "pending", scope: { permits: ["prepare-only"] } });
    expect(approval.id).not.toBe(oldApproval.id);
    expect(approval.targetDecisionSnapshotHash).not.toBe(oldApproval.targetDecisionSnapshotHash);
    revised = (await repository.getWorkItem(revisedId))!;
    expect(await decide(repository, revised, oldApproval.id, "approve-work-item", 15)).toMatchObject({ ok: false });
    const source = (await repository.getWorkItem(sourceId))!;
    expect(await decide(repository, source, oldApproval.id, "approve-work-item", 15)).toMatchObject({ ok: false });
    expect(await decide(repository, revised, approval.id, "approve-work-item", 16)).toMatchObject({ ok: true, workItem: { status: "preparation_recorded" }, approval: { state: "approved" } });
    const reopened = createSessionStorageWorkItemRepository(storage);
    expect(await reopened.getWorkItem(sourceId)).toMatchObject({ status: "superseded", relations: { supersededByWorkItemId: revisedId } });
    expect(await reopened.getWorkItem(revisedId)).toMatchObject({ status: "preparation_recorded", relations: { parentWorkItemId: sourceId } });
    expect(await reopened.getApproval(oldApproval.id)).toMatchObject({ state: "invalidated" });
    expect(await reopened.getApproval(approval.id)).toMatchObject({ state: "approved" });
  });

  it("returns the saved successor for the same submission and refuses a second successor", async () => {
    const repository = createInMemoryWorkItemRepository(); await sent(repository, "return-for-rework");
    const first = await revise(repository);
    const again = await revise(repository, { ...revisedInput, title: "別の内容" });
    expect(again).toMatchObject({ ok: true, created: false, revision: { kind: "returned" } });
    expect(again.ok && first.ok && again.workItem).toEqual(first.ok && first.workItem);
    expect(await revise(repository, revisedInput, "revise-next-0002")).toMatchObject({ ok: false, code: "already-superseded" });
    expect(await repository.getWorkItem(manualWorkItemId("revise-next-0002"))).toBeNull();
    expect((await repository.listWorkItems()).map(item => item.id).sort()).toEqual([revisedId, sourceId].sort());
  });

  it("rejects ID collisions without touching the source", async () => {
    const repository = createInMemoryWorkItemRepository(); await sent(repository, "return-for-rework");
    const before = await repository.getWorkItem(sourceId);
    expect(await revise(repository, revisedInput, sourceKey)).toMatchObject({ ok: false, code: "id-conflict" });
    const other = await createManualWorkItem(original, repository, { submissionKey: reviseKey, now: at(5) });
    expect(other.ok).toBe(true);
    expect(await revise(repository)).toMatchObject({ ok: false, code: "id-conflict" });
    expect(await repository.getWorkItem(sourceId)).toEqual(before);
  });

  it("rolls back every write when saving fails and can be retried safely", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    await sent(repository, "return-for-rework");
    const snapshot = storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY);
    storage.fail = true;
    expect(await revise(repository)).toMatchObject({ ok: false, code: "repository-error" });
    storage.fail = false;
    expect(storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(snapshot);
    const session = createSessionStorageWorkItemUnitOfWork(storage);
    const failingEvidence = { run: <T,>(operation: (repo: WorkItemRepository) => Promise<T>) => session.run(repo => operation({ ...repo, saveEvidence: async () => { throw new Error("evidence-write-failed"); } })) };
    expect(await reviseManualWorkItem(revisedInput, repository, { sourceWorkItemId: sourceId, submissionKey: reviseKey, now: at(10), unitOfWork: failingEvidence })).toMatchObject({ ok: false, code: "repository-error" });
    expect(storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(snapshot);
    expect(await revise(repository)).toMatchObject({ ok: true, created: true });
  });

  it.each([
    ["whitespace", { ...revisedInput, title: "  " }],
    ["too long", { ...revisedInput, skills: "a".repeat(101) }],
    ["invalid choice", { ...revisedInput, route: "conflict" }],
    ["not an object", null],
  ])("rejects invalid input (%s) without writing", async (_name, input) => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    await sent(repository, "return-for-rework"); const snapshot = storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY);
    expect(await revise(repository, input)).toMatchObject({ ok: false, code: "invalid-input" });
    expect(await revise(repository, revisedInput, "BAD KEY")).toMatchObject({ ok: false, code: "invalid-submission-key" });
    expect(storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(snapshot);
  });

  it("refuses sources that are missing, not manual or not returned for rework", async () => {
    const repository = createInMemoryWorkItemRepository();
    await initializeDemoWorkItemsFromResults([QA_SEED_RESULT], repository, { now: at(0) });
    const created = await createManualWorkItem(original, repository, { submissionKey: sourceKey, now: at(0) });
    expect(await revise(repository, revisedInput, reviseKey, "wi-manual-missing")).toMatchObject({ ok: false, code: "source-not-found" });
    expect(await revise(repository, revisedInput, reviseKey, "wi-demo-matching-proposal")).toMatchObject({ ok: false, code: "not-manual" });
    expect(await revise(repository)).toMatchObject({ ok: false, code: "invalid-state" });
    expect(await getManualRevisionDraft(repository, sourceId)).toEqual({ ok: false, code: "invalid-state" });
    // 承認済みの案件も対象外。
    if (!created.ok) throw new Error();
    await answer(repository, created.workItem, "disclosureScope", { field: "disclosureScope", status: "defined" } as never, 1);
    const approval = (await prepareWorkItemApproval((await repository.getWorkItem(sourceId))!, repository, at(2)))!;
    await decide(repository, (await repository.getWorkItem(sourceId))!, approval.id, "approve-work-item", 3);
    expect(await revise(repository)).toMatchObject({ ok: false, code: "invalid-state" });
    expect(await repository.getWorkItem(revisedId)).toBeNull();
  });

  it("refuses contradictory or missing rework records instead of guessing the reason", async () => {
    const returned = createInMemoryWorkItemRepository(); await sent(returned, "return-for-rework");
    const returnedItem = (await returned.getWorkItem(sourceId))!; const returnedApprovals = await returned.listApprovalsByWorkItem(sourceId);
    const rejected = createInMemoryWorkItemRepository(); await sent(rejected, "reject-work-item");
    const rejectedItem = (await rejected.getWorkItem(sourceId))!; const rejectedApprovals = await rejected.listApprovalsByWorkItem(sourceId);
    const cases: [WorkItem, typeof returnedApprovals][] = [
      [{ ...returnedItem, reworkInfo: null }, returnedApprovals],
      [returnedItem, rejectedApprovals],
      [{ ...rejectedItem, reworkInfo: { reason: "混在", returnedAt: at(3), returnedBy: "demo-human" } }, rejectedApprovals],
      [rejectedItem, rejectedApprovals.map(approval => ({ ...approval, rejectionReason: " " }))],
      [{ ...returnedItem, currentApprovalId: "approval:stale" }, returnedApprovals],
    ];
    for (const [item, approvals] of cases) {
      const repository = createInMemoryWorkItemRepository({ workItems: [item], approvals, evidence: await returned.listEvidenceByWorkItem(sourceId) });
      expect(await revise(repository)).toMatchObject({ ok: false, code: "inconsistent-reason" });
      expect(await repository.getWorkItem(sourceId)).toEqual(item);
    }
  });

  it("leaves other manual items and the demo WorkItems untouched", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    await initializeDemoWorkItemsFromResults([QA_SEED_RESULT], repository, { now: at(0) });
    await startVisualHumanLoopDemo(repository, at(0));
    await createManualWorkItem({ ...original, title: "別の架空案件" }, repository, { submissionKey: "revise-other-01", now: at(0) });
    await sent(repository, "return-for-rework");
    const others = (await repository.listWorkItems()).filter(item => item.id !== sourceId);
    const otherApprovals = await repository.listApprovalsByWorkItem("wi-demo-matching-proposal");
    expect(await revise(repository)).toMatchObject({ ok: true });
    const after = await createSessionStorageWorkItemRepository(storage).listWorkItems();
    expect(after.filter(item => item.id !== sourceId && item.id !== revisedId)).toEqual(others);
    expect(await repository.listApprovalsByWorkItem("wi-demo-matching-proposal")).toEqual(otherApprovals);
  });
});
