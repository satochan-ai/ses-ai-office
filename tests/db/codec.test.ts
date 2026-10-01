import { describe, expect, it } from "vitest";
import { decodeRevision, decodeWork, workColumns } from "./codec";
import { work } from "./fixtures";
describe("PostgreSQL test revision codec", () => {
  it.each(["0", "-1", "1.5", "9007199254740992", "not-a-number", 1, null])("rejects invalid bigint %s", value => { expect(() => decodeRevision(value)).toThrow("invalid-revision"); });
  it("decodes safe endpoints without a global pg parser", () => { expect(decodeRevision("1")).toBe(1); expect(decodeRevision("9007199254740991")).toBe(Number.MAX_SAFE_INTEGER); });
  it("rejects a projected column mismatch", () => { const item = work(); const row = { ...workColumns("a", item), entity: item, revision: "1" }; expect(decodeWork(row).workItem).toEqual(item); expect(() => decodeWork({ ...row, assigned_human_id: "different" })).toThrow("test-codec-column-mismatch"); });
});
