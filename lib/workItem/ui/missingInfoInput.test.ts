import { describe, expect, it } from "vitest";
import { buildAvailabilityStartResolution } from "./missingInfoInput";

describe("buildAvailabilityStartResolution", () => {
  it("maps a browser calendar date without timezone conversion", () => {
    expect(buildAvailabilityStartResolution("matched", "2026-10-01")).toEqual({ field: "availabilityStart", status: "matched", date: "2026-10-01" });
  });
  it("rejects empty and malformed values", () => {
    expect(buildAvailabilityStartResolution("matched", "")).toBeNull();
    expect(buildAvailabilityStartResolution("matched", "2026/10/01")).toBeNull();
    expect(buildAvailabilityStartResolution("", "2026-10-01")).toBeNull();
  });
});
