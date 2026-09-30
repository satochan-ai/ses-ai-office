import { describe, expect, it } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { createSessionStorageWorkItemRepository, SESSION_WORK_ITEM_REPOSITORY_KEY } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import type { WorkItemRepository } from "@/types/workItemRepository";
import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";
import { initializeDemoWorkItemsFromResults } from "./initializeDemoWorkItems";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";

class FakeStorage {
  values = new Map<string, string>();
  failCommit = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failCommit) throw new Error("quota-exceeded");
    this.values.set(key, value);
  }
}
const at = "2026-09-30T12:00:00.000Z";
const id = "wi-demo-matching-proposal";
const actorId = "demo-human";
const effectContext = { at, actor: { type: "human" as const, id: actorId } };
const commandBase = { commandId: "transaction-test", workItemId: id, actorId, issuedAt: at };
async function snapshot(repository: WorkItemRepository) {
  return { workItems: await repository.listWorkItems(), approvals: await repository.listApprovalsByWorkItem(id), evidence: await repository.listEvidenceByWorkItem(id) };
}
function inject(repository: WorkItemRepository, decorate: (tx: WorkItemRepository) => WorkItemRepository): WorkItemUnitOfWork {
  const boundary = getWorkItemUnitOfWork(repository);
  return { run: operation => boundary.run(tx => operation(decorate(tx))) };
}
async function fixture(backend: string, pending = false, openInfo = false) {
  const storage = new FakeStorage();
  storage.setItem("demo-result", "keep-result");
  storage.setItem("qa-state", "keep-qa");
  const repository = backend === "session" ? createSessionStorageWorkItemRepository(storage) : createInMemoryWorkItemRepository();
  await initializeDemoWorkItemsFromResults([QA_SEED_RESULT], repository, { now: at });
  const initial = (await repository.getWorkItem(id))!;
  if (pending) {
    const eligible = { ...initial, missingInfo: [], proposalDecisions: [] };
    await repository.saveWorkItem(eligible);
    await prepareWorkItemApproval(eligible, repository, at);
    if (openInfo) await repository.saveWorkItem({ ...(await repository.getWorkItem(id))!, missingInfo: initial.missingInfo, proposalDecisions: initial.proposalDecisions });
  }
  await repository.saveEvidence({ id: "existing-evidence", workItemId: id, kind: "human_confirmation", claim: "existing", sourceRef: "demo", sourceVersion: "1", excerpt: "existing", producedBy: { type: "human", id: actorId }, producedAt: at, observedAt: at, verifiedAt: at, validUntil: null });
  const before = await snapshot(repository);
  const raw = storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY);
  const unchanged = async () => {
    expect(await snapshot(repository)).toEqual(before);
    expect(storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(raw);
    expect(storage.getItem("demo-result")).toBe("keep-result");
    expect(storage.getItem("qa-state")).toBe("keep-qa");
  };
  return { repository, storage, unchanged };
}

describe.each(["session", "in-memory"])("%s application transaction boundary", backend => {
  it("discards WorkItem and approved Approval when Approval save throws after writing", async () => {
    const { repository, unchanged } = await fixture(backend, true);
    const item = (await repository.getWorkItem(id))!;
    let savedApproval = false;
    const result = await executeWorkItemCommandUseCase({ repositories: repository,
      unitOfWork: inject(repository, tx => ({ ...tx, async saveApproval(approval) { await tx.saveApproval(approval); savedApproval = true; throw new Error("save-approval-failed"); } })),
      command: { ...commandBase, type: "approve-work-item", approvalId: item.currentApprovalId! },
      approvalSnapshots: { [item.currentApprovalId!]: approvalSnapshotForWorkItem(item) }, effectContext });
    expect(savedApproval).toBe(true);
    expect(result).toMatchObject({ ok: false, code: "repository-error" });
    await unchanged();
  });
  it("discards WorkItem and newly written Evidence when Evidence save throws", async () => {
    const { repository, unchanged } = await fixture(backend);
    const item = (await repository.getWorkItem(id))!;
    let savedEvidence = false;
    const result = await executeWorkItemCommandUseCase({ repositories: repository,
      unitOfWork: inject(repository, tx => ({ ...tx, async saveEvidence(evidence) { await tx.saveEvidence(evidence); savedEvidence = true; throw new Error("save-evidence-failed"); } })),
      command: { ...commandBase, type: "provide-missing-info", missingInfoId: item.missingInfo.find(info => info.field === "personIntent")!.id, value: { field: "personIntent", status: "confirmed" } }, effectContext });
    expect(savedEvidence).toBe(true);
    expect(result).toMatchObject({ ok: false, code: "repository-error" });
    await unchanged();
  });
  it("discards all three entities when Evidence fails after WorkItem and Approval writes", async () => {
    const { repository, unchanged } = await fixture(backend, true);
    const item = (await repository.getWorkItem(id))!;
    const approval = (await repository.getApproval(item.currentApprovalId!))!;
    await expect(getWorkItemUnitOfWork(repository).run(async tx => {
      await tx.saveWorkItem({ ...item, status: "preparation_recorded" });
      await tx.saveApproval({ ...approval, state: "approved" });
      await tx.saveEvidence({ id: "new-evidence", workItemId: id, kind: "human_confirmation", claim: "confirmed", sourceRef: "demo", sourceVersion: "1", excerpt: "confirmed", producedBy: { type: "human", id: actorId }, producedAt: at, observedAt: at, verifiedAt: at, validUntil: null });
      throw new Error("evidence-post-write-failure");
    })).rejects.toThrow("evidence-post-write-failure");
    await unchanged();
  });
  it("discards WorkItem, Evidence and Approval invalidation when DomainEffect fails", async () => {
    const { repository, unchanged } = await fixture(backend, true, true);
    const item = (await repository.getWorkItem(id))!;
    let savedEvidence = false;
    let invalidated = false;
    const result = await executeWorkItemCommandUseCase({ repositories: repository,
      unitOfWork: inject(repository, tx => ({ ...tx,
        async saveEvidence(evidence) { await tx.saveEvidence(evidence); savedEvidence = true; },
        async saveApproval(approval) { await tx.saveApproval(approval); invalidated = approval.state === "invalidated"; throw new Error("invalid-state"); },
      })),
      command: { ...commandBase, type: "provide-missing-info", missingInfoId: item.missingInfo.find(info => info.field === "personIntent")!.id, value: { field: "personIntent", status: "confirmed" } }, effectContext });
    expect(savedEvidence).toBe(true);
    expect(invalidated).toBe(true);
    expect(result).toMatchObject({ ok: false, code: "effect-application-failed" });
    await unchanged();
  });
  it("discards prepared WorkItem and Approval when preparation save fails", async () => {
    const { repository, storage } = await fixture(backend);
    const item = { ...(await repository.getWorkItem(id))!, missingInfo: [], proposalDecisions: [] };
    await repository.saveWorkItem(item);
    const before = await snapshot(repository);
    const raw = storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY);
    let written = false;
    await expect(prepareWorkItemApproval({ ...item, missingInfo: [], proposalDecisions: [] }, repository, at,
      inject(repository, tx => ({ ...tx, async saveApproval(approval) { await tx.saveApproval(approval); written = true; throw new Error("preparation-failed"); } })))).rejects.toThrow("preparation-failed");
    expect(written).toBe(true);
    expect(await snapshot(repository)).toEqual(before);
    expect(storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(raw);
  });
});

describe("session transaction storage boundary", () => {
  it.each(["not-json", JSON.stringify({ schemaVersion: 99 })])("preserves corrupt or unsupported snapshot and does not run operation", async raw => {
    const storage = new FakeStorage();
    storage.setItem(SESSION_WORK_ITEM_REPOSITORY_KEY, raw);
    const repository = createSessionStorageWorkItemRepository(storage);
    let ran = false;
    await expect(getWorkItemUnitOfWork(repository).run(async () => { ran = true; })).rejects.toThrow();
    expect(ran).toBe(false);
    expect(storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(raw);
  });
  it("reports final commit failure without publishing staged changes", async () => {
    const { repository, storage, unchanged } = await fixture("session", true);
    const item = (await repository.getWorkItem(id))!;
    storage.failCommit = true;
    const result = await executeWorkItemCommandUseCase({ repositories: repository,
      command: { ...commandBase, type: "approve-work-item", approvalId: item.currentApprovalId! },
      approvalSnapshots: { [item.currentApprovalId!]: approvalSnapshotForWorkItem(item) }, effectContext });
    expect(result).toMatchObject({ ok: false, code: "repository-error" });
    await unchanged();
  });
  it("keeps absent repository key absent on failure", async () => {
    const storage = new FakeStorage();
    const repository = createSessionStorageWorkItemRepository(storage);
    await expect(getWorkItemUnitOfWork(repository).run(async tx => {
      await initializeDemoWorkItemsFromResults([QA_SEED_RESULT], tx, { now: at });
      throw new Error("abort");
    })).rejects.toThrow("abort");
    expect(storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBeNull();
  });
  it("fails closed for a repository without an atomic boundary", async () => {
    const repository = { ...createInMemoryWorkItemRepository() };
    expect(await executeWorkItemCommandUseCase({ repositories: repository, command: { ...commandBase, type: "return-for-rework", reason: "repair" }, effectContext })).toMatchObject({ ok: false, code: "repository-error" });
  });
});
