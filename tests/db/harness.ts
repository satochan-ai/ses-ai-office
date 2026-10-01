import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { assertTestSchema, testDatabaseTarget, type TestDatabaseTarget } from "./guard";

export const migrationPath = new URL("../../db/migrations/001_create_work_item_server_persistence.sql", import.meta.url);
export type DatabaseHarness = { target: TestDatabaseTarget; connect(): Promise<Client>; close(): Promise<void> };

// 既存test-only databaseのみ。database/account/roleは作成しない。
export async function createDatabaseHarness(): Promise<DatabaseHarness> {
  const target = testDatabaseTarget(process.env);
  const clients = new Set<Client>();
  let created = false;
  async function connect(scoped = true): Promise<Client> {
    const client = new Client({ connectionString: target.connectionString, connectionTimeoutMillis: 5000, statement_timeout: 8000, query_timeout: 10000 });
    // 接続先エラーのcredential/URLをVitest出力へ流さない。
    try { await client.connect(); } catch { await client.end().catch(() => {}); throw new Error("test-db-connection-failed"); }
    clients.add(client);
    client.on("error", () => { /* 実行中queryへ伝播。raw接続情報を出力しない。 */ });
    try {
      const row = (await client.query<{ database: string; schema: string }>("SELECT current_database() AS database, current_schema() AS schema")).rows[0];
      assertTestSchema(target, row.database);
      if (scoped) {
        await client.query(`SET search_path TO "${target.schema}"`);
        const actual = (await client.query<{ schema: string }>("SELECT current_schema() AS schema")).rows[0].schema;
        assertTestSchema(target, row.database, actual);
      }
      await client.query("SET lock_timeout TO '2000ms'");
      await client.query("SET idle_in_transaction_session_timeout TO '10000ms'");
      return client;
    } catch (error) { clients.delete(client); await client.end(); throw error; }
  }
  async function close() {
    // 所有clientのtransactionを中止してから、生成したschemaだけをdropする。
    const failures: unknown[] = [];
    for (const client of clients) {
      try { await client.end(); } catch (error) { failures.push(error); }
    }
    clients.clear();
    if (created) {
      const cleanup = await connect(false);
      try {
        const actual = (await cleanup.query<{ database: string }>("SELECT current_database() AS database")).rows[0].database;
        assertTestSchema(target, actual);
        await cleanup.query(`DROP SCHEMA "${target.schema}" CASCADE`);
        created = false;
      } finally { clients.delete(cleanup); await cleanup.end(); }
    }
    if (failures.length) throw new Error("test-db-client-cleanup-failed");
  }
  try {
    const admin = await connect(false);
    await admin.query(`CREATE SCHEMA "${target.schema}"`);
    created = true;
    await admin.query(`SET search_path TO "${target.schema}"`);
    assertTestSchema(target, target.database, (await admin.query<{ schema: string }>("SELECT current_schema() AS schema")).rows[0].schema);
    try { await admin.query(await readFile(migrationPath, "utf8")); }
    catch (error) { await admin.query("ROLLBACK"); throw error; }
    return { target, connect: () => connect(), close };
  } catch (error) {
    try { await close(); } catch { throw new Error("test-db-setup-and-cleanup-failed"); }
    throw error;
  }
}

export async function transaction<T>(client: Client, operation: () => Promise<T>): Promise<T> {
  await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
  try { const result = await operation(); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK"); throw error; }
}
