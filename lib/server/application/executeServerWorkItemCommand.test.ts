import { describe, expect, it } from "vitest";
import { createFakeServerPersistence } from "@/lib/server/persistence/fakeServerPersistence";
import { workItemRevision } from "@/lib/server/persistence/workItemRevision";
import { createApproval, hashDecisionSnapshot } from "@/lib/workItem/approval";
import { demoResultsToWorkItems } from "@/lib/runtime/demoAdapter";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import { approvalSnapshotForWorkItem } from "@/lib/application/prepareWorkItemApproval";
import type { ServerWorkItemCommandInput } from "@/types/serverWorkItemCommand";
import type { ServerPersistenceUnitOfWork } from "@/types/serverWorkItemPersistence";
import type { WorkItem } from "@/types/workItem";
import { executeServerWorkItemCommand, serverCommandFingerprint } from "./executeServerWorkItemCommand";

const at = "2026-10-01T00:00:00Z";
const source = demoResultsToWorkItems([QA_SEED_RESULT], { now: at, createWorkItemId: () => "w" })[0];
const ready: WorkItem = { ...source, assignedHumanId: "human-A", missingInfo: [], proposalDecisions: source.proposalDecisions.map(d => ({ ...d, verdict: "fit", readiness: "ready_for_human_review", routeStatus: "clear", intentStatus: "confirmed", duplicateStatus: "none", startDateStatus: "matched", disclosureStatus: "defined" })), currentDeliverableId: "deliverable:w", currentApprovalId: "approval-A", status: "awaiting_approval" };
const snapshot = approvalSnapshotForWorkItem(ready);
const pendingApproval = { ...createApproval({ id: "approval-A", workItemId: "w", targetDeliverableId: snapshot.deliverable.id, targetDeliverableVersion: snapshot.deliverable.version, targetDeliverableHash: snapshot.deliverable.hash, targetDecisionSnapshotHash: hashDecisionSnapshot(snapshot.decision), requestedBy: { type: "agent", id: "agent" }, requestedAt: at, scope: { fields: ["personIntent"], permits: ["prepare-only"], conditions: [] }, expiresAt: "2026-10-02", supersedesApprovalId: null }), approver: { type: "human" as const, id: "human-A" } };

async function fixture(item = ready) {
  const persistence = createFakeServerPersistence({ workItems: [{ tenantId: "tenant-A", item: { workItem: item, revision: workItemRevision(5) } }] });
  await persistence.run(tx => tx.related("tenant-A").saveApproval(item.currentApprovalId ? pendingApproval : { ...pendingApproval, state: "invalidated" }));
  let cas = 0; let snapshots = 0; let approvalIds = 0;
  const counted: ServerPersistenceUnitOfWork = { run: operation => persistence.run(tx => operation({ ...tx, workItems: { ...tx.workItems, async save(value) { cas++; return tx.workItems.save(value); } } })) };
  const input: ServerWorkItemCommandInput = { dto: { type: "approve-work-item", workItemId: "w", approvalId: "approval-A" }, actor: { actorId: "human-A", actorType: "human", tenantId: "tenant-A" }, permissions: [], expectedRevision: 5, idempotencyKey: "key", requestId: "request", commandId: "command", clock: () => at, persistence: counted, canAccess: () => true, resolveSnapshot: work => { snapshots++; return approvalSnapshotForWorkItem(work); }, createApprovalId: () => { approvalIds++; return "approval-B"; }, approvalExpiresAt: "2026-10-02", idempotencyExpiresAt: "2026-10-03" };
  const read = () => persistence.run(async tx => ({ work: await tx.workItems.get("tenant-A", "w"), approvals: await tx.related("tenant-A").listApprovalsByWorkItem("w"), evidence: await tx.related("tenant-A").listEvidenceByWorkItem("w"), audits: await tx.audit.list("tenant-A", "w"), idempotency: await tx.idempotency.lookup({ tenantId: "tenant-A", actorId: "human-A", idempotencyKey: "key" }) }));
  return { persistence, input, read, counts: () => ({ cas, snapshots, approvalIds }) };
}
const lastMissing = (): WorkItem => ({ ...ready, currentApprovalId: null, currentDeliverableId: null, status: "needs_human_input", missingInfo: [source.missingInfo.find(info => info.field === "personIntent")!], proposalDecisions: ready.proposalDecisions.map(d => ({ ...d, intentStatus: "unknown", readiness: "blocked" })) });
const resolutionDto = (item: WorkItem): ServerWorkItemCommandInput["dto"] => ({ type: "provide-missing-info", workItemId: "w", missingInfoId: item.missingInfo[0].id, resolution: { field: "personIntent", status: "confirmed", note: "private raw note" } });

describe("Fake Server command facade", () => {
  it.each(["approve-work-item", "reject-work-item", "return-for-rework"] as const)("atomically executes %s with one aggregate CAS", async type => {
    const f = await fixture();
    const dto = type === "return-for-rework" ? { type, workItemId: "w", reason: "再作業" } : { type, workItemId: "w", approvalId: "approval-A", reason: "再作業" };
    expect(await executeServerWorkItemCommand({ ...f.input, dto })).toEqual({ ok: true, result: { commandId: "command", workItemId: "w", outcome: "succeeded" } });
    const saved = await f.read();
    expect(saved.work?.revision).toBe(6);
    expect(saved.approvals[0].state).toBe(type === "approve-work-item" ? "approved" : type === "reject-work-item" ? "rejected" : "invalidated");
    expect(saved.work?.workItem.status).toBe(type === "approve-work-item" ? "preparation_recorded" : "returned_for_rework");
    if (type !== "approve-work-item") expect(saved.work?.workItem.currentApprovalId).toBeNull();
    if (type === "return-for-rework") expect(saved.work?.workItem.reworkInfo?.returnedBy).toBe("human-A");
    else expect(saved.approvals[0].decidedBy?.id).toBe("human-A");
    expect(saved.audits).toHaveLength(1);
    expect(saved.audits[0]).toMatchObject({ actor: { id: "human-A" }, beforeRevision: 5, afterRevision: 6, outcome: "succeeded" });
    expect(saved.idempotency?.status).toBe("succeeded");
    expect(f.counts().cas).toBe(1);
  });
  it("denies wrong approver without changes", async () => {
    const f = await fixture(); const before = await f.read();
    expect(await executeServerWorkItemCommand({ ...f.input, actor: { ...f.input.actor, actorId: "human-B" } })).toEqual({ ok: false, error: { code: "forbidden" } });
    expect(await f.read()).toEqual(before); expect(f.counts().cas).toBe(0);
  });
  it("replays the same receipt after state and revision change without Domain or writes", async () => {
    const f = await fixture(); const first = await executeServerWorkItemCommand(f.input); const before = await f.read(); const counts = f.counts();
    expect(await executeServerWorkItemCommand({ ...f.input, commandId: "retry-command", requestId: "retry-request", clock: () => "later" })).toEqual(first);
    expect(await f.read()).toEqual(before); expect(f.counts()).toEqual(counts);
    expect(await executeServerWorkItemCommand({ ...f.input, canAccess: () => false })).toEqual({ ok: false, error: { code: "forbidden" } });
    expect(await f.read()).toEqual(before);
  });
  it("replays MissingInfo success without extra Evidence, preparation or audit", async () => {
    const item = lastMissing(); const f = await fixture(item); const input = { ...f.input, dto: resolutionDto(item) };
    const first = await executeServerWorkItemCommand(input); const before = await f.read(); const counts = f.counts();
    expect(first.ok).toBe(true);
    expect(await executeServerWorkItemCommand({ ...input, commandId: "retry" })).toEqual(first);
    expect(await f.read()).toEqual(before); expect(f.counts()).toEqual(counts);
  });
  it("rejects changed payload on the same key", async () => {
    const f = await fixture(); const dto = { type: "reject-work-item" as const, workItemId: "w", approvalId: "approval-A", reason: "first" };
    await executeServerWorkItemCommand({ ...f.input, dto }); const before = await f.read();
    expect(await executeServerWorkItemCommand({ ...f.input, dto: { ...dto, reason: "second" } })).toEqual({ ok: false, error: { code: "conflict", subcode: "idempotency_mismatch" } });
    expect(await f.read()).toEqual(before);
  });
  it("returns in-progress for a reserved same fingerprint", async () => {
    const f = await fixture();
    await f.persistence.run(tx => tx.idempotency.reserve({ tenantId: "tenant-A", actorId: "human-A", idempotencyKey: "key", commandId: "original", fingerprint: serverCommandFingerprint(f.input.dto, 5), createdAt: at, expiresAt: "later", status: "processing", completedAt: null, result: null }));
    const before = await f.read();
    expect(await executeServerWorkItemCommand(f.input)).toEqual({ ok: false, error: { code: "conflict", subcode: "command_in_progress" } });
    expect(await f.read()).toEqual(before);
  });
  it("rejects stale revision before Domain or CAS", async () => {
    const f = await fixture(); const before = await f.read();
    expect(await executeServerWorkItemCommand({ ...f.input, expectedRevision: 4 })).toEqual({ ok: false, error: { code: "conflict", subcode: "stale_revision" } });
    expect(await f.read()).toEqual(before); expect(f.counts()).toEqual({ cas: 0, snapshots: 0, approvalIds: 0 });
  });
  it("rejects a sequential second command expecting the old revision", async () => {
    const f = await fixture(); await executeServerWorkItemCommand(f.input); const before = await f.read();
    expect(await executeServerWorkItemCommand({ ...f.input, dto: { type: "return-for-rework", workItemId: "w", reason: "修正" }, commandId: "second", idempotencyKey: "second" })).toEqual({ ok: false, error: { code: "conflict", subcode: "stale_revision" } });
    expect(await f.read()).toEqual(before);
  });
  it("distinguishes stale revision from invalid Approval state", async () => {
    const f = await fixture(); await f.persistence.run(tx => tx.related("tenant-A").saveApproval({ ...pendingApproval, state: "approved" }));
    expect(await executeServerWorkItemCommand({ ...f.input, expectedRevision: 4 })).toMatchObject({ ok: false, error: { code: "conflict", subcode: "stale_revision" } });
    expect(await executeServerWorkItemCommand(f.input)).toEqual({ ok: false, error: { code: "invalid_state" } });
  });
  it("resolves final MissingInfo and prepares explicit approver with +1 revision and retained history", async () => {
    const item = lastMissing(); const f = await fixture(item);
    expect(await executeServerWorkItemCommand({ ...f.input, dto: resolutionDto(item) })).toMatchObject({ ok: true });
    const saved = await f.read();
    expect(saved.work).toMatchObject({ revision: 6, workItem: { currentApprovalId: "approval-B", status: "awaiting_approval" } });
    expect(saved.approvals).toHaveLength(2);
    expect(saved.approvals.find(a => a.id === "approval-A")?.state).toBe("invalidated");
    expect(saved.approvals.find(a => a.id === "approval-B")).toMatchObject({ approver: { type: "human", id: "human-A" }, state: "pending" });
    expect(saved.evidence).toHaveLength(1); expect(saved.evidence[0].producedBy.id).toBe("human-A");
    expect(saved.work?.workItem.missingInfo[0].status).toBe("resolved");
    expect(f.counts().cas).toBe(1);
    expect(JSON.stringify(saved.audits)).not.toContain("private raw note");
    expect(Object.keys(saved.audits[0])).not.toContain("workItem");
  });
  it("allows a permitted information provider without assigning them as approver", async () => {
    const item = lastMissing(); const f = await fixture(item);
    expect(await executeServerWorkItemCommand({ ...f.input, dto: resolutionDto(item), actor: { ...f.input.actor, actorId: "human-B" }, permissions: ["resolve-missing-info"] })).toMatchObject({ ok: true });
    const saved = await f.read();
    expect(saved.evidence[0].producedBy.id).toBe("human-B");
    expect(saved.approvals.find(a => a.id === "approval-B")?.approver?.id).toBe("human-A");
  });
  it("does not automatically prepare a returned WorkItem", async () => {
    const item = { ...lastMissing(), status: "returned_for_rework" as const }; const f = await fixture(item);
    expect(await executeServerWorkItemCommand({ ...f.input, dto: resolutionDto(item) })).toMatchObject({ ok: true });
    const saved = await f.read(); expect(saved.work?.workItem.currentApprovalId).toBeNull(); expect(saved.approvals).toHaveLength(1);
  });
  it("hides a target from another tenant", async () => {
    const f = await fixture(); const before = await f.read();
    expect(await executeServerWorkItemCommand({ ...f.input, actor: { ...f.input.actor, tenantId: "tenant-B" } })).toEqual({ ok: false, error: { code: "not_found" } });
    expect(await f.read()).toEqual(before);
  });
  it("rolls back every entity and metadata on Audit append failure", async () => {
    const item = lastMissing(); const f = await fixture(item); const before = await f.read();
    const persistence: ServerPersistenceUnitOfWork = { run: operation => f.persistence.run(tx => operation({ ...tx, audit: { ...tx.audit, async append(record) { await tx.audit.append(record); throw new Error("secret internal failure"); } } })) };
    expect(await executeServerWorkItemCommand({ ...f.input, dto: resolutionDto(item), persistence })).toEqual({ ok: false, error: { code: "transaction_error" } });
    expect(await f.read()).toEqual(before);
  });
  it("rejects already resolved Domain state and rolls back reservation", async () => {
    const item = { ...lastMissing(), missingInfo: lastMissing().missingInfo.map(m => ({ ...m, status: "resolved" as const })) }; const f = await fixture(item); const before = await f.read();
    expect(await executeServerWorkItemCommand({ ...f.input, dto: resolutionDto(item) })).toEqual({ ok: false, error: { code: "invalid_state" } });
    expect(await f.read()).toEqual(before);
  });
  it("produces deterministic fingerprints independent of object order", () => {
    const dto = resolutionDto(lastMissing());
    const reordered = { resolution: { note: "private raw note", status: "confirmed" as const, field: "personIntent" as const }, missingInfoId: lastMissing().missingInfo[0].id, workItemId: "w", type: "provide-missing-info" as const };
    expect(serverCommandFingerprint(dto, 5)).toBe(serverCommandFingerprint(reordered, 5));
    expect(serverCommandFingerprint(dto, 5)).not.toBe(serverCommandFingerprint(dto, 6));
  });
  it("aborts related writes and reservation if final CAS conflicts", async () => {
    const f = await fixture(); const before = await f.read();
    const persistence: ServerPersistenceUnitOfWork = { run: operation => f.persistence.run(tx => operation({ ...tx, workItems: { ...tx.workItems, async save() { return { status: "conflict" }; } } })) };
    expect(await executeServerWorkItemCommand({ ...f.input, persistence })).toEqual({ ok: false, error: { code: "conflict", subcode: "stale_revision" } });
    expect(await f.read()).toEqual(before);
  });
  it("aborts all writes if idempotency completion fails", async () => {
    const f = await fixture(); const before = await f.read();
    const persistence: ServerPersistenceUnitOfWork = { run: operation => f.persistence.run(tx => operation({ ...tx, idempotency: { ...tx.idempotency, async complete() { return { status: "conflict" }; } } })) };
    expect(await executeServerWorkItemCommand({ ...f.input, persistence })).toEqual({ ok: false, error: { code: "transaction_error" } });
    expect(await f.read()).toEqual(before);
  });
  it("surfaces commit failure and keeps one outer transaction", async () => {
    const f = await fixture(); const before = await f.read(); let runs = 0;
    const persistence: ServerPersistenceUnitOfWork = { run: operation => f.persistence.run(async tx => { runs++; await operation(tx); throw new Error("commit-failure"); }) };
    expect(await executeServerWorkItemCommand({ ...f.input, persistence })).toEqual({ ok: false, error: { code: "transaction_error" } });
    expect(runs).toBe(1); expect(await f.read()).toEqual(before);
  });
  it("rolls back Evidence failure caught by the existing Application", async () => {
    const item = lastMissing(); const f = await fixture(item); const before = await f.read();
    const persistence: ServerPersistenceUnitOfWork = { run: operation => f.persistence.run(tx => operation({ ...tx, related: tenant => ({ ...tx.related(tenant), async saveEvidence(value) { await tx.related(tenant).saveEvidence(value); throw new Error("evidence-failure"); } }) })) };
    expect(await executeServerWorkItemCommand({ ...f.input, dto: resolutionDto(item), persistence })).toEqual({ ok: false, error: { code: "transaction_error" } });
    expect(await f.read()).toEqual(before);
  });
  it("rejects invalid Server revision before persistence access", async () => {
    const f = await fixture(); const before = await f.read();
    expect(await executeServerWorkItemCommand({ ...f.input, expectedRevision: 0 })).toEqual({ ok: false, error: { code: "validation_error" } });
    expect(await f.read()).toEqual(before);
  });
});
