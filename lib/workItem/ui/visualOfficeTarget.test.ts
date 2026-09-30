import { describe, expect, it } from "vitest";
import { format } from "node:url";
import { demoResultToWorkItem } from "@/lib/runtime/demoAdapter";
import { QA_SEED_RESULT } from "@/lib/runtime/demoQaSeed";
import { projectAgentWorkload } from "@/lib/workItem/projection/agentWorkload";
import { buildVisualOfficeWorkItemHref, buildFocusedAgentWorkload, isVisualOfficeAgent, resolveVisualOfficeTarget } from "./visualOfficeTarget";
const now = "2026-09-30T12:00:00.000Z";
const item = (id = "target") => demoResultToWorkItem(QA_SEED_RESULT, { now, createWorkItemId: () => id });
describe("Visual Office navigation", () => {
  it("generates only the WorkItem query and safely encodes special characters", () => {
    const href = buildVisualOfficeWorkItemHref("a &?#/日本語");
    const url = new URL(format(href), "http://localhost:3003");
    expect(url.pathname).toBe("/office-v3-claude");
    expect([...url.searchParams.keys()]).toEqual(["workItemId"]);
    expect(url.searchParams.get("workItemId")).toBe("a &?#/日本語");
  });
  it("checks profiles and placements including Claude-only agents", () => {
    for (const id of ["matching", "quality", "strategist"]) expect(isVisualOfficeAgent(id)).toBe(true);
    expect(isVisualOfficeAgent(null)).toBe(false);
    expect(isVisualOfficeAgent("unknown")).toBe(false);
  });
  it("resolves the current repository assignment, including a changed assignment", () => {
    const current = item();
    expect(resolveVisualOfficeTarget([current], current.id)).toMatchObject({ ok: true, agentId: "matching" });
    current.assignedAgentId = "quality";
    expect(resolveVisualOfficeTarget([current], current.id)).toMatchObject({ ok: true, agentId: "quality" });
  });
  it("reports a missing ID instead of choosing another item", () => {
    expect(resolveVisualOfficeTarget([item()], "missing")).toEqual({ ok: false, message: "対象のWorkItemが見つかりません" });
  });
  it.each([null, "unknown"])("reports an unresolved agent %s", id => {
    const current = item(); current.assignedAgentId = id; current.status = "awaiting_approval";
    expect(resolveVisualOfficeTarget([current], current.id)).toEqual({ ok: false, message: "このWorkItemの担当AI社員を表示できません" });
  });
  it("uses only the existing demo completion/rework fallback", () => {
    const current = item(); current.assignedAgentId = null; current.status = "returned_for_rework";
    expect(resolveVisualOfficeTarget([current], current.id)).toMatchObject({ ok: true, agentId: "matching" });
    current.mode = "real";
    expect(resolveVisualOfficeTarget([current], current.id).ok).toBe(false);
  });
  it("includes the fourth target without duplicates or changing totals", () => {
    const items = ["a", "b", "c", "d"].map(id => item(id));
    const original = projectAgentWorkload(items, "matching", now);
    const focused = buildFocusedAgentWorkload(original, items, "d", now);
    expect(resolveVisualOfficeTarget(items, "d")).toMatchObject({ ok: true, agentId: "matching", workItemId: "d" });
    expect(focused.items.map(card => card.id)).toEqual(["d", "a", "b"]);
    expect(focused.total).toBe(4);
    expect(focused.needsHumanDecision).toBe(original.needsHumanDecision);
    expect(focused.missingInfo).toBe(original.missingInfo);
    expect(new Set(focused.items.map(card => card.id)).size).toBe(3);
    expect(buildFocusedAgentWorkload(original, items, null, now)).toBe(original);
    expect(buildFocusedAgentWorkload(original, items, "a", now).items.map(card => card.id)).toEqual(["a", "b", "c"]);
  });
  it("does not insert another agent's card", () => {
    const current = item(); current.assignedAgentId = "quality";
    const workload = projectAgentWorkload([current], "matching", now);
    expect(buildFocusedAgentWorkload(workload, [current], current.id, now)).toBe(workload);
  });
});
