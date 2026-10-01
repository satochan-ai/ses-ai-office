import { describe, it, expect } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { startVisualHumanLoopDemo, VISUAL_HUMAN_LOOP_ID } from "@/lib/application/visualOfficeHumanLoopDemo";
import { projectAgentActivity, projectHandoff } from "./agentActivity";
describe("WorkItem由来のAgentActivity", () => {
  it("待機、情報不足、再判定、確認、完了を文字で導出する", async () => {
    expect(projectAgentActivity(undefined).activity).toBe("idle");
    const repo = createInMemoryWorkItemRepository(); await startVisualHumanLoopDemo(repo, "2026-10-01T00:00:00.000Z");
    const item = (await repo.getWorkItem(VISUAL_HUMAN_LOOP_ID))!;
    expect(projectAgentActivity(item).activity).toBe("waiting_human");
    expect(projectAgentActivity({ ...item, status: "info_gap_check" }).activity).toBe("working");
    expect(projectAgentActivity({ ...item, status: "quality_check" }).activity).toBe("reviewing");
    expect(projectAgentActivity({ ...item, status: "closed" }).activity).toBe("completed");
    expect(projectHandoff(item, item)).toBeNull();
    expect(projectHandoff(item, { ...item, assignedAgentId: null })).toBeNull();
    expect(projectHandoff(item, { ...item, id: "other", assignedAgentId: "proposal" })).toBeNull();
    expect(projectHandoff(item, { ...item, assignedAgentId: "proposal" })?.handoff).toEqual({ from: "matching", to: "proposal" });
  });
});
