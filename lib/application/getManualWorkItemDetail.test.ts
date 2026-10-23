import { describe, expect, it } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { createSessionStorageWorkItemRepository, SESSION_WORK_ITEM_REPOSITORY_KEY } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import type { WorkItem } from "@/types/workItem";
import type { MissingInfoResolutionValue } from "@/types/workItemResolution";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { createManualWorkItem, listManualWorkItemSummaries, manualWorkItemId } from "./createManualWorkItem";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";
import { formatSavedDate, getManualWorkItemDetail } from "./getManualWorkItemDetail";
import { initializeDemoWorkItemsFromResults } from "./initializeDemoWorkItems";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";
import { getManualRevisionDraft, reviseManualWorkItem } from "./reviseManualWorkItem";

class StorageStub {
  values = new Map<string, string>();
  failRead = false;
  getItem(key: string) { if (this.failRead) throw new Error("read-failed"); return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const key = "manual-detail-0001";
const id = manualWorkItemId(key);
const t0 = "2026-10-23T01:00:00.000Z";
const input = { title: "架空 Java保守案件", candidateLabel: "候補者A", skills: "Java、<b>SQL</b>", startDate: "unknown", route: "unknown" } as const;
const answers: [MissingInfoResolutionValue, string][] = [
  [{ field: "disclosureScope", status: "defined" }, "2026-10-23T01:03:00.000Z"],
  [{ field: "proposalRoute", status: "clear" }, "2026-10-23T01:01:00.000Z"],
  [{ field: "availabilityStart", status: "matched", date: "2026-11-01" }, "2026-10-23T01:02:00.000Z"],
];
const human = { type: "human" as const, id: "demo-human" };

async function created(repository: WorkItemRepository) {
  const result = await createManualWorkItem(input, repository, { submissionKey: key, now: t0 });
  if (!result.ok) throw new Error("not created");
  return result.workItem;
}
async function answered(repository: WorkItemRepository) {
  const item = await created(repository);
  for (const [value, at] of answers) {
    const info = item.missingInfo.find(candidate => candidate.field === value.field)!;
    expect(await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "provide-missing-info", commandId: `c-${value.field}`, workItemId: id, missingInfoId: info.id, actorId: "demo-human", issuedAt: at, value }, effectContext: { at, actor: human } })).toMatchObject({ ok: true });
  }
}
async function pending(repository: WorkItemRepository) {
  await answered(repository);
  const approval = await prepareWorkItemApproval((await repository.getWorkItem(id))!, repository, "2026-10-23T01:04:00.000Z");
  if (!approval) throw new Error("approval not prepared");
  return approval;
}
async function decide(repository: WorkItemRepository, type: "approve-work-item" | "reject-work-item" | "return-for-rework") {
  const approval = await pending(repository);
  const at = "2026-10-23T01:05:00.000Z";
  const item = (await repository.getWorkItem(id))!;
  const command = type === "approve-work-item" ? { type, commandId: "decide", workItemId: id, approvalId: approval.id, actorId: "demo-human", issuedAt: at }
    : type === "reject-work-item" ? { type, commandId: "decide", workItemId: id, approvalId: approval.id, actorId: "demo-human", issuedAt: at, reason: "開示範囲を再確認" }
    : { type, commandId: "decide", workItemId: id, actorId: "demo-human", issuedAt: at, reason: "候補者条件を修正" };
  expect(await executeWorkItemCommandUseCase({ repositories: repository, command, approvalSnapshots: { [approval.id]: approvalSnapshotForWorkItem(item) }, effectContext: { at, actor: human } })).toMatchObject({ ok: true });
}
async function detailOf(repository: WorkItemRepository) {
  const result = await getManualWorkItemDetail(repository, id);
  if (!result.ok) throw new Error(result.code);
  return result.detail;
}

describe("getManualWorkItemDetail", () => {
  it("shows the saved input and open questions of a fresh manual item", async () => {
    const repository = createInMemoryWorkItemRepository(); await created(repository);
    const detail = await detailOf(repository);
    expect(detail).toMatchObject({ id, title: "架空 Java保守案件", statusLabel: "確認事項への回答待ち", createdAt: formatSavedDate(t0), approvals: [], rework: null, missingEvidenceCount: 0 });
    expect(detail.inputLines).toEqual([
      { label: "架空案件名", value: "架空 Java保守案件" }, { label: "架空候補者の呼称", value: "候補者A" }, { label: "必須スキル", value: "Java、<b>SQL</b>" },
      { label: "開始時期の一致（登録時）", value: "未確認" }, { label: "商流（登録時）", value: "未確認" },
    ]);
    expect(detail.missingInfo.map(info => [info.label, info.answered, info.answer])).toEqual([["商流（提案経路）", false, null], ["開始時期", false, null], ["情報開示範囲", false, null]]);
    expect(detail.evidence).toMatchObject([{ kindLabel: "登録時の入力記録", relatedTo: null, linked: true }]);
  });

  it("shows Human answers and evidence in saved time order, then a pending confirmation", async () => {
    const repository = createInMemoryWorkItemRepository(); await answered(repository);
    let detail = await detailOf(repository);
    expect(detail.statusLabel).toBe("確認事項は回答済み（内容確認の準備前）");
    expect(detail.missingInfo.map(info => [info.label, info.answer, info.answeredAt])).toEqual([
      ["商流（提案経路）", "確認済み", formatSavedDate(answers[1][1])], ["開始時期", "一致・2026-11-01", formatSavedDate(answers[2][1])], ["情報開示範囲", "開示可能", formatSavedDate(answers[0][1])],
    ]);
    expect(detail.evidence.map(entry => [entry.kindLabel, entry.relatedTo, entry.lines[0]?.value])).toEqual([
      ["登録時の入力記録", null, "架空 Java保守案件"], ["Humanによる確認記録", "商流（提案経路）", "確認済み"], ["Humanによる確認記録", "開始時期", "一致・2026-11-01"], ["Humanによる確認記録", "情報開示範囲", "開示可能"],
    ]);
    await prepareWorkItemApproval((await repository.getWorkItem(id))!, repository, "2026-10-23T01:04:00.000Z");
    detail = await detailOf(repository);
    expect(detail.statusLabel).toBe("準備内容の確認待ち");
    expect(detail.approvals).toMatchObject([{ stateLabel: "確認待ち", decidedAt: null, reason: null, current: true }]);
  });

  it("keeps an approved item readable from the saved state after reload even though Visual Office cannot open it", async () => {
    const storage = new StorageStub(); await decide(createSessionStorageWorkItemRepository(storage), "approve-work-item");
    const reopened = createSessionStorageWorkItemRepository(storage);
    const item = (await reopened.getWorkItem(id))!;
    expect(item).toMatchObject({ assignedAgentId: null, execution: { lastAgentId: null } });
    const detail = await detailOf(reopened);
    expect(detail.statusLabel).toBe("確認済み（準備のみ）");
    expect(detail.approvals).toMatchObject([{ stateLabel: "確認済み（準備のみ）", decidedAt: formatSavedDate("2026-10-23T01:05:00.000Z"), current: true }]);
    expect(detail.evidence).toHaveLength(4);
    expect(detail.missingInfo.every(info => info.answered)).toBe(true);
  });

  it("distinguishes a rejection from a return for rework without inventing a rework action", async () => {
    const rejected = createInMemoryWorkItemRepository(); await decide(rejected, "reject-work-item");
    expect(await detailOf(rejected)).toMatchObject({ statusLabel: "修正が必要", rework: null, approvals: [{ stateLabel: "承認しない（修正が必要）", reason: "開示範囲を再確認", current: false }] });
    const returned = createInMemoryWorkItemRepository(); await decide(returned, "return-for-rework");
    const detail = await detailOf(returned);
    expect(detail).toMatchObject({ statusLabel: "修正が必要", rework: { reason: "候補者条件を修正", returnedAt: formatSavedDate("2026-10-23T01:05:00.000Z") }, approvals: [{ stateLabel: "差し戻しにより無効", reason: null, current: false }] });
    expect(detail.evidence).toHaveLength(4);
  });

  it("reads only manual items and does not write to storage", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    await initializeDemoWorkItemsFromResults([QA_SEED_RESULT], repository, { now: t0 }); await created(repository);
    const before = storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY);
    expect(await getManualWorkItemDetail(repository, "wi-demo-matching-proposal")).toEqual({ ok: false, code: "not-manual" });
    expect(await getManualWorkItemDetail(repository, "wi-manual-missing")).toEqual({ ok: false, code: "not-found" });
    expect((await getManualWorkItemDetail(repository, id)).ok).toBe(true);
    expect(storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(before);
  });

  it("does not treat an ID prefix alone as a manual item", async () => {
    const repository = createInMemoryWorkItemRepository(); const item = await created(repository);
    for (const spoof of [{ ...item, source: { type: "demo-seed" as const, ref: "demo" } }, { ...item, mode: "real" as const }, { ...item, kind: "bp-alliance" as const }]) {
      expect(await getManualWorkItemDetail(createInMemoryWorkItemRepository({ workItems: [spoof] }), id)).toEqual({ ok: false, code: "not-manual" });
    }
  });

  it("shows missing and unlinked evidence honestly and ignores records for another WorkItem", async () => {
    const repository = createInMemoryWorkItemRepository(); const item = await created(repository);
    const noEvidence = createInMemoryWorkItemRepository({ workItems: [item] });
    expect(await detailOf(noEvidence)).toMatchObject({ title: null, inputLines: [], evidence: [], missingEvidenceCount: 1 });
    const other = { id: "evidence:other", workItemId: "wi-manual-other", kind: "human_confirmation" as const, claim: "x", sourceRef: "x", sourceVersion: "1", excerpt: "他案件の記録", producedBy: human, producedAt: t0, observedAt: null, verifiedAt: null, validUntil: null };
    const stray = { ...other, id: "evidence:stray", workItemId: id, excerpt: "未登録の記録" };
    const base = createInMemoryWorkItemRepository({ workItems: [item], evidence: [...(await repository.listEvidenceByWorkItem(id)), stray] });
    const leaky: WorkItemRepository = { ...base, listEvidenceByWorkItem: async workItemId => [...await base.listEvidenceByWorkItem(workItemId), other] };
    const detail = await detailOf(leaky);
    expect(detail.evidence.map(entry => [entry.id, entry.linked, entry.lines[0]?.value])).toEqual([[`evidence:manual-input:${id}`, true, "架空 Java保守案件"], ["evidence:stray", false, "未登録の記録"]]);
  });

  it("shows invalid dates, unknown states and older shapes without repairing them", async () => {
    const repository = createInMemoryWorkItemRepository(); const item = await created(repository);
    const evidence = await repository.listEvidenceByWorkItem(id);
    const legacy = { ...item, createdAt: "not-a-date", status: "structuring", missingInfo: undefined, evidenceIds: undefined } as unknown as WorkItem;
    const approval = { ...(await pending(createInMemoryWorkItemRepository())), state: "mystery", requestedAt: "bad" } as never;
    const stored = createInMemoryWorkItemRepository({ workItems: [legacy], evidence: [{ ...evidence[0], producedAt: "" }], approvals: [approval] });
    const detail = await detailOf(stored);
    expect(detail).toMatchObject({ createdAt: "日時不明", statusLabel: "その他の状態（structuring）", missingInfo: [], missingEvidenceCount: 0, approvals: [{ stateLabel: "不明な状態（mystery）", requestedAt: "日時不明" }], evidence: [{ createdAt: "日時不明", linked: false }] });
    expect(await stored.getWorkItem(id)).toEqual(legacy);
  });

  it("reports repository read failures and corrupt storage without changing data", async () => {
    const storage = new StorageStub(); await created(createSessionStorageWorkItemRepository(storage));
    storage.failRead = true;
    expect(await getManualWorkItemDetail(createSessionStorageWorkItemRepository(storage), id)).toEqual({ ok: false, code: "repository-error" });
    const corrupt = new StorageStub(); corrupt.values.set(SESSION_WORK_ITEM_REPOSITORY_KEY, JSON.stringify({ version: 0, items: [] }));
    expect(await getManualWorkItemDetail(createSessionStorageWorkItemRepository(corrupt), id)).toEqual({ ok: false, code: "repository-error" });
    expect(corrupt.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(JSON.stringify({ version: 0, items: [] }));
  });
});

describe("manual work item revision in the detail view", () => {
  const nextKey = "manual-detail-next-01"; const nextId = manualWorkItemId(nextKey);
  const revisedInput = { ...input, title: "架空 Java保守案件（修正版）", skills: "Java、Spring Boot", startDate: "matched", route: "clear" } as const;
  const reviseFrom = (repository: WorkItemRepository, submissionKey = nextKey) => reviseManualWorkItem(revisedInput, repository, { sourceWorkItemId: id, submissionKey, now: "2026-10-23T01:10:00.000Z" });

  it.each([["return-for-rework", "returned", "候補者条件を修正"], ["reject-work-item", "rejected", "開示範囲を再確認"]] as const)("offers revision after %s with the reason from its own record", async (type, kind, reason) => {
    const repository = createInMemoryWorkItemRepository(); await decide(repository, type);
    expect(await getManualRevisionDraft(repository, id)).toEqual({ ok: true, input: { ...input, skills: "Java、<b>SQL</b>" }, revision: { kind, reason } });
  });

  it("does not offer revision before rework is needed or after approval", async () => {
    const fresh = createInMemoryWorkItemRepository(); await created(fresh);
    expect(await getManualRevisionDraft(fresh, id)).toEqual({ ok: false, code: "invalid-state" });
    const waiting = createInMemoryWorkItemRepository(); await pending(waiting);
    expect(await getManualRevisionDraft(waiting, id)).toEqual({ ok: false, code: "invalid-state" });
    const approved = createInMemoryWorkItemRepository(); await decide(approved, "approve-work-item");
    expect(await getManualRevisionDraft(approved, id)).toEqual({ ok: false, code: "invalid-state" });
  });

  it("shows the superseded source and its successor with confirmed links after reload, keeping old records", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    await decide(repository, "return-for-rework");
    const sourceBefore = await detailOf(repository);
    expect(await reviseFrom(repository)).toMatchObject({ ok: true, created: true });
    const reopened = createSessionStorageWorkItemRepository(storage);
    const source = await detailOf(reopened);
    expect(source).toMatchObject({ statusLabel: "修正版へ置換済み", successor: { id: nextId, title: "架空 Java保守案件（修正版）", confirmed: true }, parent: null });
    expect(source.evidence).toEqual(sourceBefore.evidence);
    expect(source.approvals).toEqual(sourceBefore.approvals);
    expect(source.rework).toEqual(sourceBefore.rework);
    const successor = await getManualWorkItemDetail(reopened, nextId);
    expect(successor).toMatchObject({ ok: true, detail: { statusLabel: "確認事項への回答待ち", parent: { id, title: "架空 Java保守案件", confirmed: true }, successor: null, approvals: [], missingInfo: [{ label: "情報開示範囲", answered: false }] } });
    expect(await listManualWorkItemSummaries(reopened, await reopened.listWorkItems())).toEqual([
      { id: nextId, title: "架空 Java保守案件（修正版）", status: "blocked_missing_info", canOpenInVisualOffice: true },
      { id, title: "架空 Java保守案件", status: "superseded", canOpenInVisualOffice: false },
    ]);
    // 古い詳細表示から再度修正しようとしても、元案件は置換済みとして拒否され何も変わらない。
    expect(await getManualRevisionDraft(reopened, id)).toEqual({ ok: false, code: "invalid-state" });
    const snapshot = storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY);
    expect(await reviseFrom(reopened, "manual-detail-next-02")).toMatchObject({ ok: false, code: "already-superseded" });
    expect(storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(snapshot);
  });

  it("does not name a related item whose back-reference is missing or different", async () => {
    const repository = createInMemoryWorkItemRepository(); await decide(repository, "reject-work-item"); await reviseFrom(repository);
    const source = (await repository.getWorkItem(id))!; const successor = (await repository.getWorkItem(nextId))!;
    const evidence = [...await repository.listEvidenceByWorkItem(id), ...await repository.listEvidenceByWorkItem(nextId)];
    const mismatched = createInMemoryWorkItemRepository({ workItems: [source, { ...successor, relations: { ...successor.relations, parentWorkItemId: "wi-manual-other" } }], evidence });
    expect(await detailOf(mismatched)).toMatchObject({ successor: { id: nextId, title: null, confirmed: false } });
    const missing = createInMemoryWorkItemRepository({ workItems: [source], evidence });
    expect(await detailOf(missing)).toMatchObject({ statusLabel: "修正版へ置換済み", successor: { id: nextId, title: null, confirmed: false } });
    const orphan = createInMemoryWorkItemRepository({ workItems: [successor], evidence });
    expect(await getManualWorkItemDetail(orphan, nextId)).toMatchObject({ ok: true, detail: { parent: { id, title: null, confirmed: false } } });
  });
});
