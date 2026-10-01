import { readFile } from "node:fs/promises";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import type { Client } from "pg";
import type { Approval } from "@/types/approval";
import { createDatabaseHarness, transaction, migrationPath, type DatabaseHarness } from "./harness";
import { testDatabaseTarget } from "./guard";
import { coreContracts } from "./sharedContracts";
import { work, approval, evidence, pending, completed, audit, at } from "./fixtures";
import { seedWork, getWork, cas, insert, putApproval, readApproval, approvalColumns, decide, evidenceColumns, putEvidence, reserve, lookup, complete, idemColumns, appendAudit, auditColumns } from "./persistence";

// Fail once before any connection/schema creation if opt-in/target is absent.
testDatabaseTarget(process.env);
coreContracts("shared PostgreSQL persistence contract", async () => {
  const h = await createDatabaseHarness();
  try {
    const c = await h.connect();
    for (const tenant of ["a", "b"]) await seedWork(c, tenant, { ...work(), assignedHumanId: `human-${tenant}` });
    return { get: (tenant, id) => getWork(c, tenant, id), save: (tenant, item, revision) => transaction(c, async () => { await getWork(c, tenant, item.id, true); return cas(c, tenant, item, revision); }),
      rollback: item => transaction(c, async () => { await getWork(c, "a", item.id, true); await cas(c, "a", item, 1); throw new Error("injected"); }), close: h.close };
  } catch (error) { await h.close(); throw error; }
});

async function waitBlocked(observer: Client, pid: number) {
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline) {
    const row = (await observer.query<{ blocked: boolean }>("SELECT cardinality(pg_blocking_pids($1))>0 AS blocked", [pid])).rows[0];
    if (row.blocked) return;
    // Poll the actual server lock condition, not an assumed scheduling delay.
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  throw new Error("expected-database-lock-not-observed");
}
const terminal = (state: "approved" | "rejected"): Approval => ({ ...approval(), state, decidedBy: { type: "human", id: "human" }, decidedAt: at, rejectionReason: state === "rejected" ? "synthetic reason" : null });
describe("PostgreSQL-specific contract", () => {
  let h: DatabaseHarness | undefined, c: Client;
  beforeEach(async () => { h = await createDatabaseHarness(); c = await h.connect(); await seedWork(c, "a", work()); });
  afterEach(async () => { await h?.close(); h = undefined; });

  it("full WorkItem roundtrip, bigint is driver string, metadata separate", async () => {
    expect((await getWork(c, "a", "w"))?.workItem).toEqual(work());
    const row = (await c.query("SELECT revision,created_at,entity FROM work_items")).rows[0];
    expect(typeof row.revision).toBe("string"); expect(row.created_at).toBeInstanceOf(Date); expect(row.entity).toEqual(work());
    expect(await c.query("SHOW transaction_isolation").then(r => r.rows[0].transaction_isolation)).toBe("read committed");
  });
  it("same-tenant aggregate FKs reject cross tenant and wrong current Approval", async () => {
    await seedWork(c, "b", { ...work(), id: "other" });
    await expect(putApproval(c, "a", approval("bad", "other"))).rejects.toMatchObject({ code: "23503" });
    await expect(insert(c, "evidence", { ...evidenceColumns("a", evidence()), work_item_id: "other", entity: JSON.stringify({ ...evidence(), workItemId: "other" }) })).rejects.toMatchObject({ code: "23503" });
    await seedWork(c, "a", { ...work(), id: "second" }); await putApproval(c, "a", approval("other-approval", "second"));
    await expect(cas(c, "a", { ...work(), currentApprovalId: "other-approval" }, 1)).rejects.toMatchObject({ code: "23503" });
  });
  it("pending insert, conditional decision, binding and history", async () => {
    await putApproval(c, "a", approval()); expect(await readApproval(c, "a", "approval")).toEqual(approval());
    expect(await decide(c, "a", terminal("approved"))).toEqual({ status: "saved" });
    expect(await decide(c, "a", terminal("rejected"))).toEqual({ status: "conflict" });
    await putApproval(c, "a", { ...approval("next"), supersedesApprovalId: "approval" });
    expect((await readApproval(c, "a", "approval"))?.state).toBe("approved");
    await expect(decide(c, "a", { ...approval("next"), targetDeliverableHash: "changed" })).rejects.toThrow("approval-binding-changed");
  });
  it("Evidence is insert-only, identical replay succeeds, collision preserves original", async () => {
    await putEvidence(c, "a", evidence()); await putEvidence(c, "a", evidence());
    await expect(putEvidence(c, "a", { ...evidence(), excerpt: "different" })).rejects.toThrow("evidence-collision");
    expect((await c.query("SELECT entity FROM evidence")).rows[0].entity).toEqual(evidence());
    expect((await c.query("SELECT count(*)::int AS count FROM evidence")).rows[0].count).toBe(1);
  });
  it("invalidated Approval history survives replacement current Approval", async () => {
    await putApproval(c, "a", approval());
    await transaction(c, async () => {
      await getWork(c, "a", "w", true);
      const invalidated: Approval = { ...approval(), state: "invalidated", decisionComment: "returned_for_rework", invalidation: { detectedAt: at, changedFields: [], previousHash: "hash", currentHash: "hash", changedBy: { type: "human", id: "human" } } };
      expect(await decide(c, "a", invalidated)).toEqual({ status: "saved" });
      await putApproval(c, "a", { ...approval("next"), supersedesApprovalId: "approval" });
      await cas(c, "a", { ...work(), currentApprovalId: "next" }, 1);
    });
    expect((await readApproval(c, "a", "approval"))?.state).toBe("invalidated");
    expect((await readApproval(c, "a", "next"))?.state).toBe("pending");
    expect((await getWork(c, "a", "w"))?.workItem.currentApprovalId).toBe("next");
  });
  it("reservation existing/mismatch, completion guards and replay on new connection", async () => {
    expect((await reserve(c, pending())).status).toBe("reserved");
    expect((await reserve(c, pending())).status).toBe("existing");
    expect((await reserve(c, { ...pending(), fingerprint: "different" })).status).toBe("mismatch");
    expect(await complete(c, { ...completed(), commandId: "wrong" })).toEqual({ status: "conflict" });
    expect(await complete(c, { ...completed(), fingerprint: "wrong" })).toEqual({ status: "conflict" });
    expect(await lookup(c, pending())).toEqual(pending());
    expect(await complete(c, completed())).toEqual({ status: "completed" });
    expect(await complete(c, completed())).toEqual({ status: "conflict" });
    const other = await h!.connect(); expect(await lookup(other, pending())).toEqual(completed());
    expect((await reserve(other, pending())).record).toEqual(completed());
  });
  it.each(["commit", "rollback"])("unique key race after winner %s; processing invisible until commit", async action => {
    const b = await h!.connect(), observer = await h!.connect();
    const pid = (await b.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    await c.query("BEGIN ISOLATION LEVEL READ COMMITTED"); await reserve(c, pending());
    expect(await lookup(b, pending())).toBeNull();
    let finished = false;
    const contender = reserve(b, pending()).then(value => { finished = true; return value; });
    void contender.catch(() => {});
    try {
      await waitBlocked(observer, pid); expect(finished).toBe(false);
      if (action === "commit") await complete(c, completed());
      await c.query(action === "commit" ? "COMMIT" : "ROLLBACK");
      const result = await contender;
      expect(result.status).toBe(action === "commit" ? "existing" : "reserved");
      expect(result.record.status).toBe(action === "commit" ? "succeeded" : "processing");
      // Only a newly reserved caller may enter business execution.
      expect(Number(result.status === "reserved") + Number(action === "commit")).toBe(1);
      expect((await b.query("SELECT count(*)::int AS count FROM idempotency")).rows[0].count).toBe(1);
    } finally { await c.query("ROLLBACK"); await contender.catch(() => {}); }
  });
  it("root FOR UPDATE blocks independent connection and timeout is bounded", async () => {
    const b = await h!.connect(), observer = await h!.connect();
    await c.query("BEGIN ISOLATION LEVEL READ COMMITTED"); await getWork(c, "a", "w", true);
    const pid = (await b.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    const blocked = getWork(b, "a", "w", true); void blocked.catch(() => {});
    try { await waitBlocked(observer, pid); await expect(blocked).rejects.toMatchObject({ code: "55P03" }); }
    finally { await c.query("ROLLBACK"); await blocked.catch(() => {}); }
  });
  it("Approve/Reject same revision: root lock gives one winner, no double decision", async () => {
    await putApproval(c, "a", approval());
    const b = await h!.connect(), observer = await h!.connect();
    await c.query("BEGIN ISOLATION LEVEL READ COMMITTED"); await getWork(c, "a", "w", true);
    const pid = (await b.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    const loser = transaction(b, async () => {
      const latest = await getWork(b, "a", "w", true);
      if (latest!.revision !== 1) return "conflict";
      await decide(b, "a", terminal("rejected")); await cas(b, "a", { ...work(), status: "returned_for_rework" }, 1); return "saved";
    }); void loser.catch(() => {});
    try {
      await waitBlocked(observer, pid); await decide(c, "a", terminal("approved"));
      await cas(c, "a", { ...work(), currentApprovalId: "approval", status: "preparation_recorded" }, 1); await c.query("COMMIT");
      expect(await loser).toBe("conflict"); expect((await readApproval(b, "a", "approval"))?.state).toBe("approved");
      expect((await getWork(b, "a", "w"))?.revision).toBe(2);
    } finally { await c.query("ROLLBACK"); await loser.catch(() => {}); }
  });
  it.each(["injected", "stale"])("whole aggregate rollback on %s failure", async failure => {
    await expect(transaction(c, async () => {
      await getWork(c, "a", "w", true); // required root-first order
      await putApproval(c, "a", approval()); await putEvidence(c, "a", evidence());
      await reserve(c, pending()); await appendAudit(c, audit());
      const saved = await cas(c, "a", { ...work(), currentApprovalId: "approval" }, failure === "stale" ? 2 : 1);
      if (saved.status !== "saved") throw new Error("stale");
      await complete(c, completed()); throw new Error("injected");
    })).rejects.toThrow(failure);
    const other = await h!.connect(); expect(await getWork(other, "a", "w")).toEqual({ workItem: work(), revision: 1 });
    for (const table of ["approvals", "evidence", "idempotency", "audit"]) expect((await other.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count).toBe(0);
  });
  it("Audit insert and duplicate rejection without sensitive payload columns", async () => {
    await appendAudit(c, audit()); await expect(appendAudit(c, audit())).rejects.toMatchObject({ code: "23505" });
    const columns = (await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='audit'", [h!.target.schema])).rows.map(row => row.column_name);
    expect(columns).not.toContain("entity"); expect(columns).not.toContain("excerpt");
    expect((await c.query("SELECT audit_id FROM audit WHERE tenant_id=$1 AND work_item_id=$2 ORDER BY created_at,audit_id", ["a", "w"])).rows.map(row => row.audit_id)).toEqual(["audit"]);
  });
  it("CHECKs reject missing JSON, unsafe revision, invalid Approval/Idempotency/Audit", async () => {
    await expect(c.query("UPDATE work_items SET entity='{}'::jsonb")).rejects.toMatchObject({ code: "23514" });
    await expect(c.query("UPDATE work_items SET revision=9007199254740992")).rejects.toMatchObject({ code: "23514" });
    await expect(c.query("UPDATE work_items SET approval_required=false")).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "approvals", approvalColumns("a", { ...terminal("rejected"), rejectionReason: " " }))).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "approvals", { ...approvalColumns("a", approval()), scope: "{}" })).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "approvals", approvalColumns("a", { ...terminal("approved"), rejectionReason: "invalid" }))).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "approvals", approvalColumns("a", { ...approval(), state: "invalidated" }))).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "idempotency", { ...idemColumns(pending()), safe_result: "{}" })).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "idempotency", { ...idemColumns(completed()), completed_at: null })).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "idempotency", { ...idemColumns(completed()), safe_result: JSON.stringify({ ...completed().result, internalMessage: "forbidden" }) })).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "audit", { ...auditColumns(audit()), safe_error_code: "internal-error" })).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "audit", { ...auditColumns(audit()), safe_error_code: "conflict" })).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "audit", { ...auditColumns(audit()), outcome: "rejected", safe_error_code: "conflict" })).rejects.toMatchObject({ code: "23514" });
    await expect(insert(c, "audit", { ...auditColumns(audit()), completed_at: "2026-09-30T00:00:00.000Z" })).rejects.toMatchObject({ code: "23514" });
  });
  it("migration reapplication fails explicitly, no silent IF NOT EXISTS", async () => {
    await expect(c.query(await readFile(migrationPath, "utf8"))).rejects.toMatchObject({ code: "42P07" });
    await c.query("ROLLBACK"); expect((await getWork(c, "a", "w"))?.revision).toBe(1);
  });
});
