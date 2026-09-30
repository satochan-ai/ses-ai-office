import { describe, expect, it } from "vitest";
import { demoResultsToWorkItems } from "@/lib/runtime/demoAdapter";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import type { CompletedRecord, ProcessingRecord, WorkItemAuditRecord } from "@/types/serverWorkItemPersistence";
import { createApproval } from "@/lib/workItem/approval";
import { createFakeServerPersistence } from "./fakeServerPersistence";
import { workItemRevision } from "./workItemRevision";
const at = "2026-10-01T00:00:00Z";
const item = demoResultsToWorkItems([QA_SEED_RESULT], { now: at, createWorkItemId: () => "w" })[0];
const pending: ProcessingRecord = { tenantId: "a", actorId: "human", idempotencyKey: "key", commandId: "command", fingerprint: "opaque", status: "processing", createdAt: at, completedAt: null, expiresAt: "2026-10-02", result: null };
const completed: CompletedRecord = { ...pending, status: "succeeded", completedAt: at, result: { commandId: "command", workItemId: "w", outcome: "succeeded" } };
const audit: WorkItemAuditRecord = { auditId: "audit", tenantId: "a", commandId: "command", requestId: "request", idempotencyKey: "key", workItemId: "w", actor: { type: "human", id: "human" }, commandType: "approve-work-item", receivedAt: at, completedAt: at, reasonReference: null, beforeRevision: workItemRevision(3), afterRevision: workItemRevision(4), outcome: "succeeded", safeErrorCode: null };
const fixture = (revision = 3) => createFakeServerPersistence({ workItems: [{ tenantId: "a", item: { workItem: item, revision: workItemRevision(revision) } }] });
// Audit型への機密項目追加を型検査で検出する。
const privacyContract: Extract<keyof WorkItemAuditRecord, "resolution" | "excerpt" | "workItem" | "approval" | "message"> extends never ? true : false = true;
void privacyContract;
describe("Server persistence contracts and atomic fake", () => {
  it("isolates related entities and rolls their changes back with the transaction", async () => {
    const fake = fixture();
    const approval = createApproval({ id: "approval", workItemId: "w", targetDeliverableId: "deliverable", targetDeliverableVersion: 1, targetDeliverableHash: "hash", targetDecisionSnapshotHash: "decision", requestedBy: { type: "human", id: "human" }, requestedAt: at, scope: { fields: [], permits: ["prepare-only"], conditions: [] }, expiresAt: "2026-10-02", supersedesApprovalId: null });
    const evidence = { id: "evidence", workItemId: "w", kind: "human_confirmation" as const, claim: "confirmed", sourceRef: "demo", sourceVersion: "1", excerpt: "demo", producedBy: { type: "human" as const, id: "human" }, producedAt: at, observedAt: at, verifiedAt: at, validUntil: null };
    await fake.run(async tx => { await tx.related("a").saveApproval(approval); await tx.related("a").saveEvidence(evidence); });
    expect(await fake.run(tx => tx.related("b").getApproval("approval"))).toBeNull();
    expect(await fake.run(tx => tx.related("b").getEvidence("evidence"))).toBeNull();
    await expect(fake.run(async tx => {
      await tx.related("a").saveApproval({ ...approval, state: "approved" });
      await tx.related("a").saveEvidence({ ...evidence, claim: "changed" });
      throw new Error("abort-related");
    })).rejects.toThrow("abort-related");
    expect(await fake.run(tx => tx.related("a").getApproval("approval"))).toEqual(approval);
    expect(await fake.run(tx => tx.related("a").getEvidence("evidence"))).toEqual(evidence);
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid revision %s", value => { expect(() => workItemRevision(value)).toThrow("invalid-revision"); });
  it("starts at revision one and increments only on save", async () => {
    const fake = fixture(1);
    expect(await fake.run(tx => tx.workItems.get("a", "w"))).toMatchObject({ revision: 1 });
    expect(await fake.run(tx => tx.workItems.get("a", "w"))).toMatchObject({ revision: 1 });
    expect(await fake.run(tx => tx.workItems.save({ tenantId: "a", workItem: item, expectedRevision: workItemRevision(1) }))).toEqual({ status: "saved", revision: 2 });
  });
  it("saves correct CAS and rejects stale CAS without overwrite", async () => {
    const fake = fixture();
    expect(await fake.run(tx => tx.workItems.save({ tenantId: "a", workItem: { ...item, updatedAt: "latest" }, expectedRevision: workItemRevision(3) }))).toEqual({ status: "saved", revision: 4 });
    expect(await fake.run(tx => tx.workItems.save({ tenantId: "a", workItem: item, expectedRevision: workItemRevision(3) }))).toEqual({ status: "conflict" });
    expect(await fake.run(tx => tx.workItems.get("a", "w"))).toMatchObject({ revision: 4, workItem: { updatedAt: "latest" } });
  });
  it("isolates tenant reads and writes and returns not_found", async () => {
    const fake = fixture();
    expect(await fake.run(tx => tx.workItems.get("b", "w"))).toBeNull();
    expect(await fake.run(tx => tx.workItems.save({ tenantId: "b", workItem: item, expectedRevision: workItemRevision(3) }))).toEqual({ status: "not_found" });
    expect(await fake.run(tx => tx.workItems.get("a", "w"))).toMatchObject({ revision: 3 });
  });
  it("reserves once, retains original commandId and exposes processing/mismatch", async () => {
    const fake = fixture();
    expect(await fake.run(tx => tx.idempotency.reserve(pending))).toEqual({ status: "reserved", record: pending });
    expect(await fake.run(tx => tx.idempotency.reserve({ ...pending, commandId: "new" }))).toEqual({ status: "existing", record: pending });
    expect(await fake.run(tx => tx.idempotency.reserve({ ...pending, fingerprint: "different" }))).toEqual({ status: "mismatch", record: pending });
    expect(await fake.run(tx => tx.idempotency.lookup(pending))).toEqual(pending);
    expect(await fake.run(tx => tx.idempotency.lookup({ ...pending, tenantId: "b" }))).toBeNull();
    expect(await fake.run(tx => tx.idempotency.lookup({ ...pending, actorId: "other" }))).toBeNull();
  });
  it("completes once and replays exactly the stored receipt", async () => {
    const fake = fixture();
    await fake.run(tx => tx.idempotency.reserve(pending));
    expect(await fake.run(tx => tx.idempotency.complete(completed))).toEqual({ status: "completed" });
    expect(await fake.run(tx => tx.idempotency.reserve({ ...pending, commandId: "new" }))).toEqual({ status: "existing", record: completed });
    expect(await fake.run(tx => tx.idempotency.complete(completed))).toEqual({ status: "conflict" });
  });
  it("stores safe terminal rejection and rejects missing or mismatched completion", async () => {
    const fake = fixture();
    expect(await fake.run(tx => tx.idempotency.complete(completed))).toEqual({ status: "not_found" });
    await fake.run(tx => tx.idempotency.reserve(pending));
    expect(await fake.run(tx => tx.idempotency.complete({ ...completed, fingerprint: "wrong" }))).toEqual({ status: "conflict" });
    const rejected: CompletedRecord = { ...pending, status: "rejected", completedAt: at, result: { code: "invalid_state" } };
    expect(await fake.run(tx => tx.idempotency.complete(rejected))).toEqual({ status: "completed" });
    expect(await fake.run(tx => tx.idempotency.lookup(pending))).toEqual(rejected);
  });
  it("appends immutable audit and rejects same tenant/id overwrite", async () => {
    const fake = fixture();
    expect(await fake.run(tx => tx.audit.append(audit))).toEqual({ status: "appended" });
    expect(await fake.run(tx => tx.audit.append({ ...audit, requestId: "overwrite" }))).toEqual({ status: "duplicate" });
    const read = await fake.run(tx => tx.audit.list("a", "w"));
    expect(read).toEqual([audit]); read[0].requestId = "mutated";
    expect(await fake.run(tx => tx.audit.list("a", "w"))).toEqual([audit]);
    expect(await fake.run(tx => tx.audit.list("b", "w"))).toEqual([]);
  });
  it("rolls back CAS, reservation/completion and audit on post-append failure", async () => {
    const fake = fixture();
    const before = await fake.run(async tx => ({ work: await tx.workItems.get("a", "w"), command: await tx.idempotency.lookup(pending), audits: await tx.audit.list("a", "w") }));
    await expect(fake.run(async tx => {
      expect(await tx.workItems.save({ tenantId: "a", workItem: { ...item, updatedAt: "changed" }, expectedRevision: workItemRevision(3) })).toMatchObject({ status: "saved" });
      await tx.idempotency.reserve(pending); await tx.idempotency.complete(completed); await tx.audit.append(audit);
      throw new Error("audit-append-failure");
    })).rejects.toThrow("audit-append-failure");
    expect(await fake.run(async tx => ({ work: await tx.workItems.get("a", "w"), command: await tx.idempotency.lookup(pending), audits: await tx.audit.list("a", "w") }))).toEqual(before);
  });
  it("commits all business metadata together", async () => {
    const fake = fixture();
    await fake.run(async tx => { await tx.workItems.save({ tenantId: "a", workItem: item, expectedRevision: workItemRevision(3) }); await tx.idempotency.reserve(pending); await tx.idempotency.complete(completed); await tx.audit.append(audit); });
    expect(await fake.run(tx => tx.workItems.get("a", "w"))).toMatchObject({ revision: 4 });
    expect(await fake.run(tx => tx.idempotency.lookup(pending))).toEqual(completed);
    expect(await fake.run(tx => tx.audit.list("a", "w"))).toEqual([audit]);
  });
});
