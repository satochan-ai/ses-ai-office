import { randomUUID } from "node:crypto";
export type TestDatabaseTarget = { connectionString: string; database: string; schema: string };
const schemaPattern = /^ses_ai_office_test_[a-f0-9]{32}$/;
// DATABASE_URLへfallbackしない。credentialをエラーへ含めない。
export function testDatabaseTarget(env: Readonly<Record<string, string | undefined>>): TestDatabaseTarget {
  if (!env.TEST_DATABASE_URL) throw new Error("test-db-url-required");
  if (env.TEST_DB_ALLOW_DDL !== "test-only") throw new Error("test-db-opt-in-required");
  let url: URL;
  try { url = new URL(env.TEST_DATABASE_URL); } catch { throw new Error("test-db-invalid-url"); }
  const query = [...url.searchParams];
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.hash || query.some(([key, value]) => key !== "sslmode" || value !== "verify-full") || query.length > 1) throw new Error("test-db-invalid-url");
  let database: string;
  try { database = decodeURIComponent(url.pathname.slice(1)); } catch { throw new Error("test-db-invalid-url"); }
  if (!/^ses_ai_office_test(?:_[a-z0-9_]+)?$/.test(database) || env.TEST_DB_EXPECTED_DATABASE !== database) throw new Error("test-db-database-not-confirmed");
  return { connectionString: env.TEST_DATABASE_URL, database, schema: `ses_ai_office_test_${randomUUID().replaceAll("-", "")}` };
}
export function assertTestSchema(target: TestDatabaseTarget, database: string, schema = target.schema): void {
  if (database !== target.database || schema !== target.schema || !schemaPattern.test(schema)) throw new Error("test-db-scope-refused");
}
