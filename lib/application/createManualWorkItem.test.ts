import { describe, expect, it } from "vitest";
import { createSessionStorageWorkItemRepository, SESSION_WORK_ITEM_REPOSITORY_KEY } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import { projectWorkItemsToDecisionQueue } from "@/lib/workItem/projection/dashboard";
import type { WorkItem } from "@/types/workItem";
import type { MissingInfoResolutionValue } from "@/types/workItemResolution";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { createManualWorkItem, isManualWorkItem, listManualWorkItemSummaries, manualWorkItemId, manualWorkItemTitle, MANUAL_INPUT_LIMITS, validateManualWorkItemInput, withManualTitles } from "./createManualWorkItem";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";
import { initializeDemoWorkItemsFromResults } from "./initializeDemoWorkItems";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";
import { startVisualHumanLoopDemo } from "./visualOfficeHumanLoopDemo";

class StorageStub {
  values = new Map<string, string>();
  fail = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error("quota-exceeded"); this.values.set(key, value); }
}

const at = "2026-10-23T10:00:00.000Z";
const key = "manual-test-0001";
const id = manualWorkItemId(key);
const input = { title: "  架空 Java 保守案件 ", candidateLabel: "候補者A", skills: "Java、Spring Boot", startDate: "unknown", route: "unknown" } as const;
const answers: MissingInfoResolutionValue[] = [
  { field: "proposalRoute", status: "clear" },
  { field: "availabilityStart", status: "matched", date: "2026-11-01" },
  { field: "disclosureScope", status: "defined" },
];
const answer = (repositories: WorkItemRepository, missingInfoId: string, value: MissingInfoResolutionValue, commandId = `cmd-${missingInfoId}`) => executeWorkItemCommandUseCase({
  repositories, command: { type: "provide-missing-info", commandId, workItemId: id, missingInfoId, actorId: "demo-human", issuedAt: at, value }, effectContext: { at, actor: { type: "human", id: "demo-human" } },
});
const missingId = (item: WorkItem, field: string) => item.missingInfo.find(info => info.field === field)!.id;

describe("createManualWorkItem", () => {
  it("creates a manual demo WorkItem with domain MissingInfo, input evidence and a queue card", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    const result = await createManualWorkItem(input, repository, { submissionKey: key, now: at });
    expect(result).toMatchObject({ ok: true, created: true });
    if (!result.ok) return;
    const item = result.workItem;
    expect(item).toMatchObject({ id, kind: "matching-proposal", mode: "demo", source: { type: "manual", ref: `manual-input:${id}` }, status: "blocked_missing_info", assignedAgentId: "matching", assignedHumanId: "demo-human", approvalRequired: true, currentApprovalId: null, nextAction: { kind: "provide_human_input", ownerType: "human" } });
    expect(isManualWorkItem(item)).toBe(true);
    expect(item.missingInfo.map(info => info.field)).toEqual(["proposalRoute", "availabilityStart", "disclosureScope"]);
    expect(item.missingInfo.every(info => info.status === "open" && info.subjectPersonId === item.relations.personIds[0])).toBe(true);
    expect(item.proposalDecisions).toEqual([expect.objectContaining({ verdict: "unknown", readiness: "blocked", routeStatus: "unknown", startDateStatus: "unknown", disclosureStatus: "unknown", intentStatus: "unknown", blockerMissingInfoIds: item.missingInfo.map(info => info.id), evidenceIds: item.evidenceIds })]);
    const evidence = await repository.getEvidence(item.evidenceIds[0]);
    expect(evidence).toMatchObject({ kind: "source_excerpt", producedBy: { type: "human", id: "demo-human" }, observedAt: null, verifiedAt: null });
    expect(manualWorkItemTitle(evidence)).toBe("架空 Java 保守案件");
    expect(JSON.parse(storage.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)!).workItems).toHaveLength(1);
    expect(projectWorkItemsToDecisionQueue(await repository.listWorkItems(), at).cards).toMatchObject([{ workItemId: id, bucket: "missing_info", statusLabel: "情報不足", requiredHumanAction: "不足情報を確認する", isDemo: true }]);
  });

  it("asks only disclosure scope when route and start date were confirmed at input", async () => {
    const result = await createManualWorkItem({ ...input, startDate: "matched", route: "clear" }, createInMemoryWorkItemRepository(), { submissionKey: key, now: at });
    expect(result.ok && result.workItem.missingInfo.map(info => info.field)).toEqual(["disclosureScope"]);
    expect(result.ok && result.workItem.proposalDecisions[0]).toMatchObject({ routeStatus: "clear", startDateStatus: "matched" });
  });

  it("runs Human answers, approval preparation and approval through existing commands and survives reload", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    const created = await createManualWorkItem(input, repository, { submissionKey: key, now: at });
    if (!created.ok) throw new Error("not created");
    for (const value of answers) {
      expect(await prepareWorkItemApproval((await repository.getWorkItem(id))!, repository, at)).toBeNull();
      expect(await answer(repository, missingId(created.workItem, value.field), value)).toMatchObject({ ok: true, evidence: [expect.objectContaining({ kind: "human_confirmation", producedBy: { type: "human", id: "demo-human" } })] });
    }
    const resolved = (await repository.getWorkItem(id))!;
    expect(resolved.missingInfo.every(info => info.status === "resolved")).toBe(true);
    expect(resolved.proposalDecisions[0]).toMatchObject({ readiness: "ready_for_human_review", routeStatus: "clear", startDateStatus: "matched", disclosureStatus: "defined" });
    expect(await repository.listEvidenceByWorkItem(id)).toHaveLength(4);
    const approval = await prepareWorkItemApproval(resolved, repository, at);
    expect(approval).toMatchObject({ workItemId: id, state: "pending", scope: { permits: ["prepare-only"] } });
    const prepared = (await repository.getWorkItem(id))!;
    expect(projectWorkItemsToDecisionQueue([prepared], at).cards).toMatchObject([{ workItemId: id, bucket: "awaiting_approval" }]);
    expect(await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "approve-work-item", commandId: "approve-manual", workItemId: id, approvalId: approval!.id, actorId: "demo-human", issuedAt: at }, approvalSnapshots: { [approval!.id]: approvalSnapshotForWorkItem(prepared) }, effectContext: { at, actor: { type: "human", id: "demo-human" } } })).toMatchObject({ ok: true, workItem: { status: "preparation_recorded" }, approval: { state: "approved" } });
    const reopened = createSessionStorageWorkItemRepository(storage);
    expect(await reopened.getWorkItem(id)).toMatchObject({ status: "preparation_recorded", currentApprovalId: approval!.id });
    expect(await reopened.getApproval(approval!.id)).toMatchObject({ state: "approved", decidedBy: { type: "human", id: "demo-human" } });
    expect(await reopened.listEvidenceByWorkItem(id)).toHaveLength(4);
  });

  it.each([
    ["missing fields", {}, ["title", "candidateLabel", "skills", "startDate", "route"]],
    ["whitespace only", { ...input, title: " 　 ", candidateLabel: "\t" }, ["title", "candidateLabel"]],
    ["too long", { ...input, title: "案".repeat(MANUAL_INPUT_LIMITS.title + 1), skills: "a".repeat(MANUAL_INPUT_LIMITS.skills + 1) }, ["title", "skills"]],
    ["invalid choices", { ...input, startDate: "mismatched", route: "conflict" }, ["startDate", "route"]],
    ["non-string and control characters", { ...input, title: 1, skills: "Java\nSQL" }, ["title", "skills"]],
  ] as const)("rejects %s without saving", async (_name, value, fields) => {
    const storage = new StorageStub();
    const result = await createManualWorkItem(value, createSessionStorageWorkItemRepository(storage), { submissionKey: key, now: at });
    expect(result).toMatchObject({ ok: false, code: "invalid-input" });
    expect(!result.ok && "errors" in result ? result.errors.map(error => error.field) : []).toEqual(fields);
    expect(storage.values.size).toBe(0);
  });

  it("accepts the exact maximum length and normalizes whitespace", () => {
    expect(validateManualWorkItemInput({ ...input, title: "案".repeat(MANUAL_INPUT_LIMITS.title), skills: " Java   SQL " })).toMatchObject({ ok: true, value: { skills: "Java SQL" } });
  });

  it("does not create a second WorkItem when the same submission is sent again", async () => {
    const repository = createInMemoryWorkItemRepository();
    const first = await createManualWorkItem(input, repository, { submissionKey: key, now: at });
    const second = await createManualWorkItem({ ...input, title: "別名" }, repository, { submissionKey: key, now: "2026-10-23T11:00:00.000Z" });
    expect(second).toMatchObject({ ok: true, created: false });
    expect(second.ok && first.ok && second.workItem).toEqual(first.ok && first.workItem);
    expect(await repository.listWorkItems()).toHaveLength(1);
    expect(await repository.listEvidenceByWorkItem(id)).toHaveLength(1);
  });

  it("rejects invalid submission keys and an existing non-manual WorkItem at the same ID", async () => {
    expect(await createManualWorkItem(input, createInMemoryWorkItemRepository(), { submissionKey: "BAD KEY", now: at })).toMatchObject({ ok: false, code: "invalid-submission-key" });
    const other = (await createManualWorkItem(input, createInMemoryWorkItemRepository(), { submissionKey: key, now: at }));
    if (!other.ok) throw new Error("not created");
    const repository = createInMemoryWorkItemRepository({ workItems: [{ ...other.workItem, source: { type: "demo-seed", ref: "demo" } }] });
    expect(await createManualWorkItem(input, repository, { submissionKey: key, now: at })).toMatchObject({ ok: false, code: "id-conflict" });
    expect(await repository.listEvidenceByWorkItem(id)).toHaveLength(0);
  });

  it("reports repository failures without partial saves or repairing corrupt data", async () => {
    const storage = new StorageStub(); storage.fail = true;
    expect(await createManualWorkItem(input, createSessionStorageWorkItemRepository(storage), { submissionKey: key, now: at })).toMatchObject({ ok: false, code: "repository-error" });
    expect(storage.values.size).toBe(0);
    const corrupt = new StorageStub(); corrupt.values.set(SESSION_WORK_ITEM_REPOSITORY_KEY, "{broken");
    expect(await createManualWorkItem(input, createSessionStorageWorkItemRepository(corrupt), { submissionKey: key, now: at })).toMatchObject({ ok: false, code: "repository-error" });
    expect(corrupt.values.get(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe("{broken");
  });

  it("rejects double, invalid and inconsistent answers without changing the WorkItem", async () => {
    const repository = createInMemoryWorkItemRepository();
    const created = await createManualWorkItem(input, repository, { submissionKey: key, now: at });
    if (!created.ok) throw new Error("not created");
    const routeId = missingId(created.workItem, "proposalRoute");
    expect(await answer(repository, routeId, { field: "proposalRoute", status: "clear" })).toMatchObject({ ok: true });
    const afterFirst = await repository.getWorkItem(id);
    expect(await answer(repository, routeId, { field: "proposalRoute", status: "conflict" }, "again")).toMatchObject({ ok: false, code: "domain-rejected" });
    expect(await answer(repository, missingId(created.workItem, "availabilityStart"), { field: "availabilityStart", status: "matched" })).toMatchObject({ ok: false, code: "domain-rejected" });
    expect(await answer(repository, missingId(created.workItem, "disclosureScope"), { field: "proposalRoute", status: "clear" }, "wrong-field")).toMatchObject({ ok: false, code: "domain-rejected" });
    expect(await repository.getWorkItem(id)).toEqual(afterFirst);
    const broken = { ...afterFirst!, proposalDecisions: afterFirst!.proposalDecisions.map(decision => ({ ...decision, personId: "manual-person:other" })) };
    const inconsistent = createInMemoryWorkItemRepository({ workItems: [broken] });
    expect(await answer(inconsistent, missingId(broken, "disclosureScope"), { field: "disclosureScope", status: "defined" })).toMatchObject({ ok: false, code: "domain-rejected" });
    expect(await inconsistent.getWorkItem(id)).toEqual(broken);
  });

  it("does not prepare approval when an answer keeps the decision blocked", async () => {
    const repository = createInMemoryWorkItemRepository();
    const created = await createManualWorkItem({ ...input, route: "clear" }, repository, { submissionKey: key, now: at });
    if (!created.ok) throw new Error("not created");
    await answer(repository, missingId(created.workItem, "availabilityStart"), { field: "availabilityStart", status: "mismatched", date: "2027-01-01" });
    await answer(repository, missingId(created.workItem, "disclosureScope"), { field: "disclosureScope", status: "defined" });
    const item = (await repository.getWorkItem(id))!;
    expect(item.proposalDecisions[0].readiness).toBe("blocked");
    expect(await prepareWorkItemApproval(item, repository, at)).toBeNull();
  });

  it("lists manual summaries and renames only manual Decision Queue cards", async () => {
    const repository = createInMemoryWorkItemRepository();
    await initializeDemoWorkItemsFromResults([QA_SEED_RESULT], repository, { now: at });
    await createManualWorkItem(input, repository, { submissionKey: key, now: at });
    await createManualWorkItem({ ...input, title: "架空 後続案件" }, repository, { submissionKey: "manual-test-0002", now: "2026-10-23T11:00:00.000Z" });
    const items = await repository.listWorkItems();
    const summaries = await listManualWorkItemSummaries(repository, items);
    expect(summaries).toEqual([{ id: manualWorkItemId("manual-test-0002"), title: "架空 後続案件", status: "blocked_missing_info", canOpenInVisualOffice: true }, { id, title: "架空 Java 保守案件", status: "blocked_missing_info", canOpenInVisualOffice: true }]);
    const queue = withManualTitles(projectWorkItemsToDecisionQueue(items, at), summaries);
    expect(queue.cards.find(card => card.workItemId === id)?.title).toBe("手入力（架空）：架空 Java 保守案件");
    expect(queue.cards.find(card => card.workItemId === "wi-demo-matching-proposal")?.title).toBe("案件 qa-human-loop-opportunity");
  });

  it("leaves existing demo WorkItems untouched while a manual item is created, answered and approved", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage);
    await initializeDemoWorkItemsFromResults([QA_SEED_RESULT], repository, { now: at });
    await startVisualHumanLoopDemo(repository, at);
    const demoBefore = await repository.listWorkItems();
    const created = await createManualWorkItem({ ...input, route: "clear", startDate: "matched" }, repository, { submissionKey: key, now: at });
    if (!created.ok) throw new Error("not created");
    await answer(repository, missingId(created.workItem, "disclosureScope"), { field: "disclosureScope", status: "defined" });
    const approval = await prepareWorkItemApproval((await repository.getWorkItem(id))!, repository, at);
    await executeWorkItemCommandUseCase({ repositories: repository, command: { type: "approve-work-item", commandId: "approve", workItemId: id, approvalId: approval!.id, actorId: "demo-human", issuedAt: at }, approvalSnapshots: { [approval!.id]: approvalSnapshotForWorkItem((await repository.getWorkItem(id))!) }, effectContext: { at, actor: { type: "human", id: "demo-human" } } });
    const after = await repository.listWorkItems();
    expect(after.filter(item => item.id !== id)).toEqual(demoBefore);
    expect(after.find(item => item.id === id)?.status).toBe("preparation_recorded");
    // 承認遷移で担当AIが外れ、AI実行履歴を偽装しないためVisual Officeの導線は出さない。
    expect(await listManualWorkItemSummaries(repository, after)).toMatchObject([{ id, status: "preparation_recorded", canOpenInVisualOffice: false }]);
    expect(after.find(item => item.id === id)?.execution.lastAgentId).toBeNull();
  });
});
