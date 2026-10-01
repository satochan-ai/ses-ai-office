import { describe, it, expect } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { createSessionStorageWorkItemRepository } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { startVisualCandidateDemo, resumeVisualCandidateDemo, VISUAL_CANDIDATE_ID, startVisualHumanLoopDemo, startVisualNewClientDemo, startVisualBpDemo, CANDIDATE_MEMO } from "./visualOfficeHumanLoopDemo";
import { executeWorkItemCommandUseCase } from "./executeWorkItemCommand";
import { approvalSnapshotForWorkItem, prepareWorkItemApproval } from "./prepareWorkItemApproval";
import { projectAgentActivity } from "@/lib/visual-office/agentActivity";
import type { WorkItemRepository } from "@/types/workItemRepository";
const at = "2026-10-01T12:00:00.000Z";
async function answer(repo: WorkItemRepository, status: "confirmed" | "declined") {
  const item = (await repo.getWorkItem(VISUAL_CANDIDATE_ID))!;
  return executeWorkItemCommandUseCase({ repositories: repo, command: { type: "provide-missing-info", commandId: `answer-${status}`, workItemId: item.id, missingInfoId: item.missingInfo[0].id, value: { field: "personIntent", status }, actorId: "demo-human", issuedAt: at }, effectContext: { at, actor: { type: "human", id: "demo-human" } } });
}
describe("candidate visual Demo", () => {
  it("seeds one candidate and one question, with no preparation before Human answer", async () => {
    const repo = createInMemoryWorkItemRepository(); const frames = await startVisualCandidateDemo(repo, at);
    expect(frames.map(f => f.activity)).toEqual(["working", "reviewing", "waiting_human"]);
    expect(frames[0].agentId).toBe("recruit");
    const item = (await repo.getWorkItem(VISUAL_CANDIDATE_ID))!;
    expect(item).toMatchObject({ kind: "candidate-screening", assignedAgentId: "recruit", candidateContext: { personIntent: { status: "unknown", evidenceId: null } }, missingInfo: [{ field: "personIntent", status: "open" }], proposalDecisions: [], currentApprovalId: null });
    expect(await resumeVisualCandidateDemo(repo, at)).toEqual([]); expect(await prepareWorkItemApproval(item, repo, at)).toBeNull();
    expect(await startVisualCandidateDemo(repo, at)).toEqual([]); expect(await repo.listWorkItems()).toHaveLength(1);
    expect(CANDIDATE_MEMO.questions).toHaveLength(3); expect(CANDIDATE_MEMO.unknown).toHaveLength(2);
  });
  it.each(["approve-work-item", "reject-work-item"] as const)("confirmed → handoff → pending → %s survives reload and replay", async type => {
    const values = new Map<string, string>(); const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const repo = createSessionStorageWorkItemRepository(storage); await startVisualCandidateDemo(repo, at);
    expect(await answer(repo, "confirmed")).toMatchObject({ ok: true });
    const frames = await resumeVisualCandidateDemo(repo, at);
    expect(frames.map(f => f.activity)).toEqual(["reviewing", "working", "handoff", "reviewing", "waiting_human"]);
    expect(frames[2].handoff).toEqual({ from: "recruit", to: "proposal" });
    const item = (await repo.getWorkItem(VISUAL_CANDIDATE_ID))!;
    expect(item).toMatchObject({ assignedAgentId: "proposal", status: "awaiting_approval", candidateContext: { personIntent: { status: "confirmed" } }, missingInfo: [{ status: "resolved" }], proposalDecisions: [] });
    expect(await repo.getEvidence(item.candidateContext!.personIntent.evidenceId!)).toMatchObject({ kind: "human_confirmation" });
    expect(await repo.getApproval(item.currentApprovalId!)).toMatchObject({ state: "pending", scope: { permits: ["prepare-only"] } });
    expect(await answer(repo, "confirmed")).toMatchObject({ ok: false });
    expect(await executeWorkItemCommandUseCase({ repositories: repo, command: { type, commandId: type, workItemId: item.id, approvalId: item.currentApprovalId!, actorId: "demo-human", issuedAt: at, reason: "メモを修正" }, approvalSnapshots: { [item.currentApprovalId!]: approvalSnapshotForWorkItem(item) }, effectContext: { at, actor: { type: "human", id: "demo-human" } } })).toMatchObject({ ok: true });
    const reopened = createSessionStorageWorkItemRepository(storage); const saved = (await reopened.getWorkItem(item.id))!; const approval = (await reopened.getApproval(item.currentApprovalId!))!;
    expect(approval.state).toBe(type === "approve-work-item" ? "approved" : "rejected");
    expect(saved.candidateContext!.personIntent.status).toBe("confirmed");
    expect(projectAgentActivity(saved, approval)).toMatchObject(type === "approve-work-item" ? { activity: "completed", text: "Human面談確認メモ確認完了（連絡・予約・提案なし）" } : { activity: "working", text: "面談確認メモの修正が必要です" });
    expect(await startVisualCandidateDemo(reopened, at)).toEqual([]); expect(await resumeVisualCandidateDemo(reopened, at)).toEqual([]); expect(await reopened.getWorkItem(item.id)).toEqual(saved);
    expect(await reopened.listWorkItems()).toHaveLength(1);
  });
  it("declined stays stopped without handoff or Approval and cannot be replayed into confirmed", async () => {
    const repo = createInMemoryWorkItemRepository(); await startVisualCandidateDemo(repo, at); expect(await answer(repo, "declined")).toMatchObject({ ok: true });
    const frames = await resumeVisualCandidateDemo(repo, at); expect(frames.some(f => f.handoff || f.activity === "completed")).toBe(false);
    const saved = (await repo.getWorkItem(VISUAL_CANDIDATE_ID))!;
    expect(saved).toMatchObject({ assignedAgentId: "recruit", candidateContext: { personIntent: { status: "declined" } }, currentApprovalId: null, missingInfo: [{ status: "resolved" }], proposalDecisions: [], nextAction: null });
    expect(saved.status).not.toBe("returned_for_rework"); expect(projectAgentActivity(saved).text).toContain("停止");
    expect(await prepareWorkItemApproval(saved, repo, at)).toBeNull(); expect(await repo.listApprovalsByWorkItem(saved.id)).toEqual([]);
    expect(await startVisualCandidateDemo(repo, at)).toEqual([]); expect(await resumeVisualCandidateDemo(repo, at)).toEqual([]); expect(await answer(repo, "confirmed")).toMatchObject({ ok: false }); expect(await repo.getWorkItem(saved.id)).toEqual(saved);
  });
  it("does not mutate any of the existing three Demo items or approvals", async () => {
    const repo = createInMemoryWorkItemRepository(); await startVisualHumanLoopDemo(repo, at); await startVisualNewClientDemo(repo, at); await startVisualBpDemo(repo, at);
    const before = await repo.listWorkItems(); const approvals = await Promise.all(before.map(item => repo.listApprovalsByWorkItem(item.id)));
    await startVisualCandidateDemo(repo, at); await answer(repo, "confirmed"); await resumeVisualCandidateDemo(repo, at);
    for (let i = 0; i < before.length; i++) { expect(await repo.getWorkItem(before[i].id)).toEqual(before[i]); expect(await repo.listApprovalsByWorkItem(before[i].id)).toEqual(approvals[i]); }
    expect(await repo.listWorkItems()).toHaveLength(4);
  });
  it.each(["real", "manual"])("guards %s fixed-ID collisions", async invalid => {
    const repo = createInMemoryWorkItemRepository(); await startVisualCandidateDemo(repo, at); const original = (await repo.getWorkItem(VISUAL_CANDIDATE_ID))!;
    const protectedItem = invalid === "real" ? { ...original, mode: "real" as const } : { ...original, source: { type: "manual" as const, ref: "protected" } }; await repo.saveWorkItem(protectedItem);
    await expect(startVisualCandidateDemo(repo, at)).rejects.toThrow("demo-only"); await expect(resumeVisualCandidateDemo(repo, at)).rejects.toThrow("demo-only"); expect(await repo.getWorkItem(original.id)).toEqual(protectedItem);
  });
  it("never upgrades a legacy fixed-ID Demo item without context", async () => {
    const repo = createInMemoryWorkItemRepository(); await startVisualCandidateDemo(repo, at); const legacy = (await repo.getWorkItem(VISUAL_CANDIDATE_ID))!; delete legacy.candidateContext; await repo.saveWorkItem(legacy);
    expect(await startVisualCandidateDemo(repo, at)).toEqual([]); expect(await resumeVisualCandidateDemo(repo, at)).toEqual([]); expect(await repo.getWorkItem(legacy.id)).toEqual(legacy);
  });
});
