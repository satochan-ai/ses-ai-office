import type { MissingInfoResolutionValue } from "@/types/workItemResolution";

/** Converts the browser calendar value into the domain's calendar-date value. */
export function buildAvailabilityStartResolution(choice: string, date: string): MissingInfoResolutionValue | null {
  if (choice !== "matched" && choice !== "mismatched") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { field: "availabilityStart", status: choice, date };
}
