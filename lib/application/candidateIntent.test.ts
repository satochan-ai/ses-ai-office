import { describe, expect, it } from "vitest";
import { demoResultToWorkItem } from "@/lib/runtime/demoAdapter";
import { resolveMissingInfo } from "@/lib/workItem/missingInfo";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { createSessionStorageWorkItemRepository, SESSION_WORK_ITEM_REPOSITORY_KEY } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import type { WorkItem } from "@/types/workItem";
import type { MissingInfoResolutionValue } from "@/types/workItemResolution";
import type { WorkItemRepository } from "@/types/workItemRepository";
import type { WorkItemUnitOfWork } from "@/types/workItemUnitOfWork";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";
import { prepareWorkItemApproval } from "./prepareWorkItemApproval";

const at = "2026-10-01T12:00:00.000Z";
const seed = (): WorkItem => demoResultToWorkItem({ version: 2, source: "office-v3-claude", mock: true, scenarioId: "candidate-screening", scenarioTitle: "Demo", completedAt: at, finalAgentId: "recruiter", finalAgentName: "Demo", resultTitle: "候補者確認", resultSummary: "架空候補者", candidateId: "person-demo", candidateName: "架空候補者" }, { now: at, createWorkItemId: () => "candidate-work" });
const item = (): WorkItem => ({ ...seed(), status: "needs_human_input", missingInfo: [{ id: "intent-question", workItemId: "candidate-work", field: "personIntent", subjectPersonId: "person-demo", question: "本人意向", status: "open", raisedAt: at, resolvedAt: null }] });
const resolve = (workItem: WorkItem, value: MissingInfoResolutionValue = { field: "personIntent", status: "confirmed" }, missingInfoId = "intent-question") => resolveMissingInfo({ workItem, value, missingInfoId, actorId: "demo-human", resolvedAt: at });
class StorageStub {
  values = new Map<string, string>();
  fail = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error("commit-failed"); this.values.set(key, value); }
}
const command = { type: "provide-missing-info" as const, commandId: "candidate-command", workItemId: "candidate-work", actorId: "demo-human", issuedAt: at, missingInfoId: "intent-question", value: { field: "personIntent" as const, status: "confirmed" as const } };
const execute = (repositories: WorkItemRepository, unitOfWork?: WorkItemUnitOfWork) => executeWorkItemCommandUseCase({ repositories, unitOfWork, command, effectContext: { at, actor: { type: "human", id: "demo-human" } } });

describe("candidate intent domain", () => {
  it("initializes explicit unknown context from the candidate Result only", () => {
    expect(seed()).toMatchObject({ candidateContext: { personId: "person-demo", personIntent: { status: "unknown", evidenceId: null } }, assignedAgentId: "recruiter", proposalDecisions: [], approvalRequired: true });
  });
  it.each(["confirmed", "declined"] as const)("resolves %s without a ProposalDecision or business transition", status => {
    const original = item(); const before = JSON.stringify(original);
    const result = resolve(original, { field: "personIntent", status, note: "保存しない自由文" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workItem.candidateContext?.personIntent).toEqual({ status, evidenceId: result.evidenceId });
    expect(result.workItem.missingInfo[0]).toMatchObject({ status: "resolved", resolvedBy: { type: "human", id: "demo-human" }, resolvedAt: at, resolution: JSON.stringify({ field: "personIntent", status }) });
    expect(result.evidence).toMatchObject({ kind: "human_confirmation", claim: `personIntent:person-demo:${status}`, producedBy: { type: "human", id: "demo-human" }, producedAt: at, observedAt: null, verifiedAt: null });
    expect(JSON.stringify(result)).not.toContain("保存しない自由文");
    expect(result.workItem.proposalDecisions).toEqual([]);
    expect(result.workItem.status).toBe(original.status); expect(result.workItem.nextAction).toEqual(original.nextAction); expect(result.effects).toEqual([]);
    expect(JSON.stringify(original)).toBe(before);
    expect(resolve(result.workItem)).toMatchObject({ ok: false, code: "missing-info-already-resolved" });
  });
  it.each(["context absent", "no person", "multiple people", "context mismatch", "subject mismatch", "question work item mismatch", "evidence collision"])("rejects %s without mutation", condition => {
    const current = item();
    if (condition === "context absent") delete current.candidateContext;
    if (condition === "no person") current.relations.personIds = [];
    if (condition === "multiple people") current.relations.personIds.push("other");
    if (condition === "context mismatch") current.candidateContext!.personId = "other";
    if (condition === "subject mismatch") current.missingInfo[0].subjectPersonId = "other";
    if (condition === "question work item mismatch") current.missingInfo[0].workItemId = "other";
    if (condition === "evidence collision") current.evidenceIds.push(`evidence:missing-info:intent-question:${at}`);
    const before = JSON.stringify(current); expect(resolve(current)).toMatchObject({ ok: false, code: "domain-rejected" }); expect(JSON.stringify(current)).toBe(before);
  });
  it("allows a null subject only with an explicit single matching context", () => { const current = item(); current.missingInfo[0].subjectPersonId = null; expect(resolve(current).ok).toBe(true); });
  it("rejects wrong field, invalid answer and absent question", () => {
    expect(resolve(item(), { field: "disclosureScope", status: "defined" })).toMatchObject({ ok: false, code: "unsupported-missing-info-field" });
    expect(resolve(item(), { field: "personIntent", status: "stale" } as unknown as MissingInfoResolutionValue)).toMatchObject({ ok: false, code: "invalid-resolution" });
    expect(resolve(item(), undefined, "absent")).toMatchObject({ ok: false, code: "missing-info-not-found" });
  });
  it("does not use candidate context for another kind or candidate's other fields", () => {
    expect(resolve({ ...item(), kind: "new-client-outreach" })).toMatchObject({ ok: false, code: "proposal-decision-not-found" });
    const current = item(); current.missingInfo[0].field = "disclosureScope";
    expect(resolve(current, { field: "disclosureScope", status: "defined" })).toMatchObject({ ok: false, code: "proposal-decision-not-found" });
  });
});

describe("candidate preparation guard", () => {
  it.each(["unknown", "declined", "confirmed"] as const)("uses latest %s context even with a stale caller", async status => {
    const current = seed(); current.candidateContext!.personIntent.status = status;
    const repository = createInMemoryWorkItemRepository({ workItems: [current] });
    const caller = seed(); caller.candidateContext!.personIntent.status = status === "confirmed" ? "unknown" : "confirmed";
    const approval = await prepareWorkItemApproval(caller, repository, at);
    if (status === "confirmed") expect(approval).toMatchObject({ state: "pending", scope: { permits: ["prepare-only"] } });
    else { expect(approval).toBeNull(); expect(await repository.getWorkItem(current.id)).toEqual(current); expect(await repository.listApprovalsByWorkItem(current.id)).toEqual([]); }
  });
  it("keeps the legacy preparation contract for an old item without context", async () => { const current = seed(); delete current.candidateContext; const repository = createInMemoryWorkItemRepository({ workItems: [current] }); expect(await prepareWorkItemApproval(current, repository, at)).toMatchObject({ state: "pending" }); });
});

describe("candidate guard scope", () => {
  it("retains the open question guard even with confirmed intent", async () => {
    const current = item(); current.candidateContext!.personIntent.status = "confirmed";
    const repository = createInMemoryWorkItemRepository({ workItems: [current] });
    expect(await prepareWorkItemApproval(current, repository, at)).toBeNull();
  });
  it("does not change preparation semantics for another kind", async () => {
    const current = { ...seed(), kind: "bp-alliance" as const };
    const repository = createInMemoryWorkItemRepository({ workItems: [current] });
    expect(await prepareWorkItemApproval(current, repository, at)).toMatchObject({ state: "pending" });
  });
});

describe.each(["memory", "session"])("candidate %s atomicity and persistence", backend => {
  async function fixture() {
    const storage = new StorageStub();
    const repository = backend === "session" ? createSessionStorageWorkItemRepository(storage) : createInMemoryWorkItemRepository();
    await repository.saveWorkItem(item());
    return { repository, storage };
  }
  it("reads latest state and saves context, resolved info and Evidence together", async () => {
    const { repository, storage } = await fixture();
    const stale = await repository.getWorkItem(command.workItemId);
    const current = item(); current.candidateContext!.personIntent.status = "declined"; await repository.saveWorkItem(current);
    expect(stale?.candidateContext?.personIntent.status).toBe("unknown");
    expect(await execute(repository)).toMatchObject({ ok: true });
    const reloaded = backend === "session" ? createSessionStorageWorkItemRepository(storage) : repository;
    const saved = (await reloaded.getWorkItem(command.workItemId))!;
    expect(saved).toMatchObject({ candidateContext: { personIntent: { status: "confirmed" } }, missingInfo: [{ status: "resolved" }], proposalDecisions: [] });
    expect(await reloaded.getEvidence(saved.candidateContext!.personIntent.evidenceId!)).toMatchObject({ kind: "human_confirmation", producedAt: at });
    expect(await execute(repository)).toMatchObject({ ok: false, code: "domain-rejected" });
    expect(await reloaded.listEvidenceByWorkItem(saved.id)).toHaveLength(1);
  });
  it.each(["work-item", "evidence", "transaction"])("rolls back %s failure after staged writes", async failure => {
    const { repository, storage } = await fixture();
    const before = await repository.getWorkItem(command.workItemId); const raw = storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY);
    const boundary = getWorkItemUnitOfWork(repository);
    const unitOfWork: WorkItemUnitOfWork = { run: operation => boundary.run(async tx => {
      const decorated = { ...tx,
        async saveWorkItem(value: WorkItem) { await tx.saveWorkItem(value); if (failure === "work-item") throw new Error("save-failed"); },
        async saveEvidence(value: Parameters<WorkItemRepository["saveEvidence"]>[0]) { await tx.saveEvidence(value); if (failure === "evidence") throw new Error("save-failed"); },
      };
      const result = await operation(decorated); if (failure === "transaction") throw new Error("abort"); return result;
    }) };
    expect(await execute(repository, unitOfWork)).toMatchObject({ ok: false, code: "repository-error" });
    expect(await repository.getWorkItem(command.workItemId)).toEqual(before);
    expect(await repository.listEvidenceByWorkItem(command.workItemId)).toEqual([]);
    expect(storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(raw);
  });
  it("rejects a collision present only in the Evidence repository", async () => {
    const { repository } = await fixture(); const result = resolve(item()); if (!result.ok) throw new Error("fixture");
    await repository.saveEvidence({ ...result.evidence, workItemId: "other", claim: "existing" });
    expect(await execute(repository)).toMatchObject({ ok: false, code: "domain-rejected" });
    expect(await repository.getWorkItem(command.workItemId)).toEqual(item());
    expect(await repository.getEvidence(result.evidenceId)).toMatchObject({ workItemId: "other", claim: "existing" });
  });
});

describe("candidate session compatibility", () => {
  it("reads old items without adding context or rewriting storage", async () => {
    const storage = new StorageStub(); const old = seed(); delete old.candidateContext;
    const repository = createSessionStorageWorkItemRepository(storage); await repository.saveWorkItem(old);
    const raw = storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY);
    expect(await createSessionStorageWorkItemRepository(storage).getWorkItem(old.id)).toEqual(old);
    expect(storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(raw);
    expect(JSON.parse(raw!).version).toBe(1);
  });
  it("does not publish candidate changes on final commit failure", async () => {
    const storage = new StorageStub(); const repository = createSessionStorageWorkItemRepository(storage); await repository.saveWorkItem(item());
    const raw = storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY); storage.fail = true;
    expect(await execute(repository)).toMatchObject({ ok: false, code: "repository-error" });
    expect(storage.getItem(SESSION_WORK_ITEM_REPOSITORY_KEY)).toBe(raw); expect(await repository.getWorkItem(command.workItemId)).toEqual(item());
  });
});
