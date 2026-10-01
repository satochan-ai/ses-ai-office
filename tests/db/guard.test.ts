import { describe, expect, it } from "vitest";
import { assertTestSchema, testDatabaseTarget } from "./guard";
const safe = { TEST_DATABASE_URL: "postgresql://test:unused@localhost/ses_ai_office_test", TEST_DB_ALLOW_DDL: "test-only", TEST_DB_EXPECTED_DATABASE: "ses_ai_office_test" };
describe("test database mutation guard", () => {
  it("requires dedicated URL", () => { expect(() => testDatabaseTarget({ DATABASE_URL: safe.TEST_DATABASE_URL })).toThrow("test-db-url-required"); });
  it("requires explicit opt-in", () => { expect(() => testDatabaseTarget({ ...safe, TEST_DB_ALLOW_DDL: undefined })).toThrow("test-db-opt-in-required"); });
  it.each(["production", "postgres", "neondb", "ses_ai_office"])("refuses database %s", database => { expect(() => testDatabaseTarget({ ...safe, TEST_DATABASE_URL: `postgres://localhost/${database}`, TEST_DB_EXPECTED_DATABASE: database })).toThrow("test-db-database-not-confirmed"); });
  it("requires confirmation", () => { expect(() => testDatabaseTarget({ ...safe, TEST_DB_EXPECTED_DATABASE: "other" })).toThrow(); });
  it("allows verified TLS without accepting connection options", () => { expect(() => testDatabaseTarget({ ...safe, TEST_DATABASE_URL: `${safe.TEST_DATABASE_URL}?sslmode=verify-full` })).not.toThrow(); expect(() => testDatabaseTarget({ ...safe, TEST_DATABASE_URL: `${safe.TEST_DATABASE_URL}?sslmode=no-verify` })).toThrow(); });
  it.each(["https://localhost/ses_ai_office_test", `${safe.TEST_DATABASE_URL}?options=unsafe`, "invalid"])("refuses URL form without exposing it", url => { expect(() => testDatabaseTarget({ ...safe, TEST_DATABASE_URL: url })).toThrow("test-db-invalid-url"); });
  it("scopes cleanup to one unique schema and database", () => { const a = testDatabaseTarget(safe); const b = testDatabaseTarget(safe); expect(a.schema).not.toBe(b.schema); expect(() => assertTestSchema(a, a.database)).not.toThrow(); expect(() => assertTestSchema(a, "production")).toThrow(); expect(() => assertTestSchema(a, a.database, "public")).toThrow(); expect(() => assertTestSchema(a, a.database, b.schema)).toThrow(); });
});
