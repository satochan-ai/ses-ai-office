import { describe, expect, it } from "vitest";
import { createSessionStorageWorkItemRepository } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { createManualWorkItem, manualWorkItemId } from "./createManualWorkItem";
import { getManualWorkItemDetail } from "./getManualWorkItemDetail";
import { reviseManualWorkItem } from "./reviseManualWorkItem";
import { executeManualHumanAction, projectManualHumanActions, type ManualHumanAction } from "./manualWorkItemHumanActions";
import { startVisualHumanLoopDemo, startVisualBpDemo, startVisualNewClientDemo, startVisualCandidateDemo } from "./visualOfficeHumanLoopDemo";
import type { WorkItemRepository } from "@/types/workItemRepository";
import type { WorkItem, WorkItemStatus } from "@/types/workItem";

class StorageStub {
  value: string | null = null;
  writes = 0;
  failAt = Infinity;
  failRead = false;
  getItem() { if (this.failRead) throw new Error("read-failed"); return this.value; }
  setItem(_key: string, value: string) { this.writes++; if (this.writes === this.failAt) throw new Error("quota-exceeded"); this.value = value; }
}
const now = "2026-10-23T12:00:00.000Z";
const key = "dashboard-human-0001";
const id = manualWorkItemId(key);
const input = { title: "架空 Dashboard QA案件", candidateLabel: "候補者A", skills: "Java", startDate: "unknown", route: "unknown" } as const;
const options = { now, commandId: "dashboard-command" };
const run = (repo: WorkItemRepository, action: ManualHumanAction, target = id) => executeManualHumanAction(repo, target, action, options);
async function setup(confirmed = false) {
  const storage = new StorageStub();
  const repo = createSessionStorageWorkItemRepository(storage);
  expect(await createManualWorkItem(confirmed ? { ...input, startDate: "matched", route: "clear" } : input, repo, { submissionKey: key, now })).toMatchObject({ ok: true });
  return { storage, repo };
}
async function answerAll(repo: WorkItemRepository, target = id) {
  const item = (await repo.getWorkItem(target))!;
  for (const info of item.missingInfo.filter(entry => entry.status === "open")) {
    const choice = info.field === "proposalRoute" ? "clear" : info.field === "availabilityStart" ? "matched" : "defined";
    expect(await run(repo, { type: "answer", missingInfoId: info.id, choice, date: "2026-11-01" }, target)).toMatchObject({ ok: true });
  }
  return (await repo.getWorkItem(target))!.currentApprovalId!;
}
async function detail(repo: WorkItemRepository, target = id) {
  const result = await getManualWorkItemDetail(repo, target);
  if (!result.ok) throw new Error(result.code);
  return result.detail;
}
describe("Dashboard manual Human action connection", () => {
  it("projects unanswered questions, persists answer evidence, refreshes detail and prepares approval only after all answers", async () => {
    const { repo, storage } = await setup();
    const before = await detail(repo);
    expect(before.humanActions.questions).toHaveLength(3);
    expect(before.humanActions.approvalId).toBeNull();
    const question = before.humanActions.questions[0];
    expect(await run(repo, { type: "answer", missingInfoId: question.id, choice: "clear", date: "" })).toMatchObject({ ok: true, preparation: "not-prepared" });
    const after = await detail(repo);
    expect(after.humanActions.questions).toHaveLength(2);
    expect(after.evidence).toHaveLength(2);
    expect(after.missingInfo.find(info => info.id === question.id)?.answered).toBe(true);
    await answerAll(repo);
    const pending = await detail(createSessionStorageWorkItemRepository(storage));
    expect(pending.statusLabel).toBe("準備内容の確認待ち");
    expect(pending.humanActions.questions).toEqual([]);
    expect(pending.humanActions.approvalId).toBe(`approval:${id}`);
    expect(await run(repo, { type: "approve", approvalId: pending.humanActions.approvalId!, reason: "" })).toMatchObject({ ok: true });
    const approved = await detail(createSessionStorageWorkItemRepository(storage));
    expect(approved.statusLabel).toBe("確認済み（準備のみ）");
    expect(approved.humanActions).toEqual({ questions: [], approvalId: null, canPrepare: false });
    expect(approved.evidence).toHaveLength(4);
    expect(await run(repo, { type: "approve", approvalId: pending.humanActions.approvalId!, reason: "" })).toMatchObject({ ok: false });
  });

  it.each(["reject", "rework"] as const)("records %s separately, revises through the existing use case, and reviews a successor without changing old records", async type => {
    const { repo } = await setup();
    const approvalId = await answerAll(repo);
    const reason = type === "reject" ? "架空の却下理由" : "架空の修正依頼理由";
    expect(await run(repo, { type, approvalId, reason })).toMatchObject({ ok: true });
    const old = await detail(repo);
    expect(old.humanActions.approvalId).toBeNull();
    if (type === "reject") { expect(old.approvals[0].reason).toBe(reason); expect(old.rework).toBeNull(); }
    else { expect(old.rework?.reason).toBe(reason); expect(old.approvals[0].stateLabel).toContain("差し戻し"); }
    const oldApproval = await repo.getApproval(approvalId);
    const oldEvidence = await repo.listEvidenceByWorkItem(id);
    const revision = await reviseManualWorkItem(input, repo, { sourceWorkItemId: id, submissionKey: "dashboard-successor-0001", now });
    if (!revision.ok) throw new Error("revision-failed");
    const newApprovalId = await answerAll(repo, revision.workItem.id);
    expect(newApprovalId).not.toBe(approvalId);
    expect(await run(repo, { type: "approve", approvalId, reason: "" }, revision.workItem.id)).toMatchObject({ ok: false });
    expect(await run(repo, { type: "approve", approvalId: newApprovalId, reason: "" }, revision.workItem.id)).toMatchObject({ ok: true });
    expect(await repo.getApproval(approvalId)).toEqual(oldApproval);
    expect(await repo.listEvidenceByWorkItem(id)).toEqual(oldEvidence);
    expect((await detail(repo)).successor).toMatchObject({ id: revision.workItem.id, confirmed: true });
    expect((await detail(repo, revision.workItem.id)).parent).toMatchObject({ id, confirmed: true });
  });

  it("rejects repeated and overlapping answers without adding a second Evidence", async () => {
    const { repo, storage } = await setup();
    const question = (await detail(repo)).humanActions.questions[0];
    const action = { type: "answer", missingInfoId: question.id, choice: "clear", date: "" } as const;
    const results = await Promise.all([run(repo, action), run(createSessionStorageWorkItemRepository(storage), action)]);
    expect(results.map(result => result.ok)).toEqual([true, false]);
    const snapshot = storage.value;
    expect(await run(repo, action)).toMatchObject({ ok: false });
    expect(storage.value).toBe(snapshot);
    expect(await repo.listEvidenceByWorkItem(id)).toHaveLength(2);
  });

  it.each([["proposalRoute", "invalid", ""], ["availabilityStart", "matched", ""], ["availabilityStart", "mismatched", "not-a-date"], ["disclosureScope", "invalid", ""]])("rejects invalid %s input without writes", async (field, choice, date) => {
    const { repo, storage } = await setup();
    const info = (await repo.getWorkItem(id))!.missingInfo.find(entry => entry.field === field)!;
    const before = storage.value;
    expect(await run(repo, { type: "answer", missingInfoId: info.id, choice, date })).toMatchObject({ ok: false });
    expect(storage.value).toBe(before);
  });

  it.each(["reject", "rework"] as const)("rejects blank %s reasons and stale approval IDs", async type => {
    const { repo, storage } = await setup();
    const approvalId = await answerAll(repo);
    const before = storage.value;
    expect(await run(repo, { type, approvalId, reason: " \n " })).toMatchObject({ ok: false });
    expect(await run(repo, { type, approvalId: "other-approval", reason: "理由" })).toMatchObject({ ok: false });
    expect(storage.value).toBe(before);
    expect(await run(repo, { type: "approve", approvalId, reason: "" })).toMatchObject({ ok: true });
    const approved = storage.value;
    expect(await run(repo, { type, approvalId, reason: "古い表示からの理由" })).toMatchObject({ ok: false });
    expect(storage.value).toBe(approved);
  });

  it("hides and rejects a pending Approval that belongs to another WorkItem", async () => {
    const { repo, storage } = await setup();
    const approvalId = await answerAll(repo);
    const approval = (await repo.getApproval(approvalId))!;
    await repo.saveApproval({ ...approval, workItemId: "another-item" });
    expect((await detail(repo)).humanActions.approvalId).toBeNull();
    const before = storage.value;
    expect(await run(repo, { type: "approve", approvalId, reason: "" })).toMatchObject({ ok: false });
    expect(storage.value).toBe(before);
  });

  it.each(["closed", "cancelled", "superseded", "preparation_recorded", "returned_for_rework"] as WorkItemStatus[])("offers no new operations for %s", async status => {
    const { repo, storage } = await setup();
    const item = (await repo.getWorkItem(id))!;
    await repo.saveWorkItem({ ...item, status });
    expect((await detail(repo)).humanActions).toEqual({ questions: [], approvalId: null, canPrepare: false });
    const before = storage.value;
    expect(await run(repo, { type: "answer", missingInfoId: item.missingInfo[0].id, choice: "clear", date: "" })).toMatchObject({ ok: false });
    await run(repo, { type: "prepare" });
    expect(storage.value).toBe(before);
  });

  it("reports read and save failures without success or partial writes, and releases the action guard", async () => {
    const { repo, storage } = await setup();
    const info = (await detail(repo)).humanActions.questions[0];
    const action = { type: "answer", missingInfoId: info.id, choice: "clear", date: "" } as const;
    const before = storage.value;
    storage.failRead = true;
    expect(await run(repo, action)).toMatchObject({ ok: false });
    storage.failRead = false; storage.failAt = storage.writes + 1;
    expect(await run(repo, action)).toMatchObject({ ok: false });
    expect(storage.value).toBe(before);
    storage.failAt = Infinity;
    expect(await run(repo, action)).toMatchObject({ ok: true });
  });

  it("keeps a committed answer when preparation fails and permits a preparation-only retry after reload", async () => {
    const { repo, storage } = await setup(true);
    const info = (await detail(repo)).humanActions.questions[0];
    storage.failAt = storage.writes + 2;
    expect(await run(repo, { type: "answer", missingInfoId: info.id, choice: "defined", date: "" })).toMatchObject({ ok: true, preparation: "failed", message: expect.stringContaining("回答は保存しました") });
    const reopened = createSessionStorageWorkItemRepository(storage);
    const saved = await detail(reopened);
    expect(saved.humanActions).toMatchObject({ questions: [], approvalId: null, canPrepare: true });
    expect(saved.evidence).toHaveLength(2);
    expect(await run(reopened, { type: "prepare" })).toMatchObject({ ok: true, preparation: "prepared" });
    expect((await detail(reopened)).humanActions.approvalId).toBeTruthy();
  });

  it("does not claim preparation succeeded when a saved answer leaves readiness blocked", async () => {
    const { repo } = await setup(true);
    const info = (await detail(repo)).humanActions.questions[0];
    expect(await run(repo, { type: "answer", missingInfoId: info.id, choice: "restricted", date: "" })).toMatchObject({ ok: true, preparation: "not-prepared" });
    expect((await repo.getWorkItem(id))!.currentApprovalId).toBeNull();
  });

  it("does not operate on the four fixed Demo paths or change another manual item", async () => {
    const { repo } = await setup();
    for (const start of [startVisualHumanLoopDemo, startVisualBpDemo, startVisualNewClientDemo, startVisualCandidateDemo]) await start(repo, now);
    const demos = (await repo.listWorkItems()).filter(item => item.id !== id);
    for (const item of demos) {
      expect(projectManualHumanActions(item, [])).toEqual({ questions: [], approvalId: null, canPrepare: false });
      expect(await run(repo, { type: "approve", approvalId: item.currentApprovalId ?? "none", reason: "" }, item.id)).toMatchObject({ ok: false });
    }
    await createManualWorkItem(input, repo, { submissionKey: "dashboard-other-0001", now });
    const otherId = manualWorkItemId("dashboard-other-0001");
    const other = await repo.getWorkItem(otherId);
    await answerAll(repo);
    expect((await repo.listWorkItems()).filter(item => demos.some(demo => demo.id === item.id))).toEqual(demos);
    expect(await repo.getWorkItem(otherId)).toEqual(other);
  });

  it("requires the manual identity contract and assigned demo Human, not just an ID prefix", async () => {
    const { repo } = await setup();
    const item = (await repo.getWorkItem(id))!;
    for (const patch of [{ mode: "real" }, { source: { type: "demo-seed", ref: "fake" } }, { kind: "candidate-screening" }, { assignedHumanId: "other-human" }] as Partial<WorkItem>[]) {
      const changed = { ...item, ...patch };
      expect(projectManualHumanActions(changed, [])).toEqual({ questions: [], approvalId: null, canPrepare: false });
      await repo.saveWorkItem(changed);
      expect(await run(repo, { type: "answer", missingInfoId: item.missingInfo[0].id, choice: "clear", date: "" })).toMatchObject({ ok: false });
    }
  });
});
