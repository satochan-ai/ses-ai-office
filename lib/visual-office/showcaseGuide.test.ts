import { afterEach, describe, expect, it, vi } from "vitest";
import { createInMemoryWorkItemRepository } from "@/lib/repositories/inMemoryWorkItemRepository";
import { createSessionStorageWorkItemRepository } from "@/lib/repositories/sessionStorageWorkItemRepository";
import { startVisualHumanLoopDemo, resumeVisualHumanLoopDemo, startVisualNewClientDemo, startVisualBpDemo, startVisualCandidateDemo, VISUAL_HUMAN_LOOP_ID } from "@/lib/application/visualOfficeHumanLoopDemo";
import { executeWorkItemCommandUseCase } from "@/lib/application/executeWorkItemCommand";
import { approvalSnapshotForWorkItem } from "@/lib/application/prepareWorkItemApproval";
import { MAIN_SHOWCASE_SCENARIO, projectShowcaseStep, schedulePresentationFrame, showcaseReplayFrames } from "./showcaseGuide";
const at = "2026-10-01T00:00:00.000Z";
const context = { at, actor: { type: "human" as const, id: "demo-human" } };
type Repository = ReturnType<typeof createInMemoryWorkItemRepository>;
async function answer(repo: Repository) {
  const item = (await repo.getWorkItem(VISUAL_HUMAN_LOOP_ID))!;
  return executeWorkItemCommandUseCase({ repositories: repo, command: { type: "provide-missing-info", commandId: "showcase-answer", workItemId: item.id, missingInfoId: item.missingInfo[0].id, actorId: "demo-human", issuedAt: at, value: { field: "availabilityStart", status: "matched", date: "2026-10-01" } }, effectContext: context });
}
describe("Main Showcase表示境界", () => {
  afterEach(() => vi.useRealTimers());
  it("既存固定matchingを利用し、保存成功後の既存frameから全6工程を導出する", async () => {
    const repo = createInMemoryWorkItemRepository();
    expect(MAIN_SHOWCASE_SCENARIO).toBe("matching");
    const intro = await startVisualHumanLoopDemo(repo, at);
    const waiting = (await repo.getWorkItem(VISUAL_HUMAN_LOOP_ID))!;
    expect(intro.map(frame => projectShowcaseStep(waiting, undefined, frame, true, intro[0]).step)).toEqual([1, 2, 2, 3]);
    expect(projectShowcaseStep(waiting, undefined).step).toBe(3);
    expect((await answer(repo)).ok).toBe(true);
    const resumed = await resumeVisualHumanLoopDemo(repo, at);
    const ready = (await repo.getWorkItem(waiting.id))!;
    const approval = (await repo.getApproval(ready.currentApprovalId!))!;
    expect(resumed.map(frame => projectShowcaseStep(ready, approval, frame, true, resumed[0]).step)).toEqual([4, 5, 5, 6]);
    expect(projectShowcaseStep(ready, approval)).toMatchObject({ step: 6, completed: false });
    expect(await repo.listWorkItems()).toHaveLength(1);
  });
  it("唯一の表示timerをpause/cleanup/resumeでき、Human待ち終端では進まない", () => {
    vi.useFakeTimers(); const advance = vi.fn();
    const cleanup = schedulePresentationFrame(0, 4, false, advance);
    vi.advanceTimersByTime(1199); expect(advance).not.toHaveBeenCalled();
    cleanup!(); schedulePresentationFrame(0, 4, true, advance);
    vi.advanceTimersByTime(5000); expect(advance).not.toHaveBeenCalled();
    schedulePresentationFrame(0, 4, false, advance);
    vi.advanceTimersByTime(1200); expect(advance).toHaveBeenCalledExactlyOnceWith(1);
    schedulePresentationFrame(3, 4, false, advance);
    vi.advanceTimersByTime(5000); expect(advance).toHaveBeenCalledTimes(1);
  });
  it("回答保存失敗なら状態を進めず、演出停止・再生も保存状態を変更しない", async () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const repo = createSessionStorageWorkItemRepository(storage); await startVisualHumanLoopDemo(repo, at);
    const before = (await repo.getWorkItem(VISUAL_HUMAN_LOOP_ID))!;
    const save = vi.spyOn(storage, "setItem").mockImplementationOnce(() => { throw new Error("test write failure"); });
    expect((await answer(repo)).ok).toBe(false); save.mockRestore();
    expect(await repo.getWorkItem(before.id)).toEqual(before);
    expect(await resumeVisualHumanLoopDemo(repo, at)).toEqual([]);
    expect(projectShowcaseStep(before, undefined).step).toBe(3);
    vi.useFakeTimers(); schedulePresentationFrame(0, 4, true, vi.fn()); vi.runAllTimers();
    expect(await repo.getWorkItem(before.id)).toEqual(before);
  });
  it.each(["approve-work-item", "reject-work-item", "return-for-rework"] as const)("%s保存/reload/再開始でもresetなし、approveだけ完了", async type => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const repo = createSessionStorageWorkItemRepository(storage);
    const intro = await startVisualHumanLoopDemo(repo, at); await answer(repo);
    const frames = await resumeVisualHumanLoopDemo(repo, at);
    const ready = (await repo.getWorkItem(VISUAL_HUMAN_LOOP_ID))!;
    const approvalId = ready.currentApprovalId!;
    const result = await executeWorkItemCommandUseCase({ repositories: repo, command: { type, commandId: "showcase-decision", workItemId: ready.id, approvalId, actorId: "demo-human", issuedAt: at, reason: "内容の修正" }, approvalSnapshots: { [approvalId]: approvalSnapshotForWorkItem(ready) }, effectContext: context });
    expect(result.ok).toBe(true);
    const reopened = createSessionStorageWorkItemRepository(storage);
    const item = (await reopened.getWorkItem(ready.id))!, approval = (await reopened.getApproval(approvalId))!;
    const before = JSON.stringify([...values]);
    const fresh = await startVisualHumanLoopDemo(reopened, at);
    expect(fresh).toEqual([]);
    expect(projectShowcaseStep(item, approval)).toMatchObject({ step: 6, completed: type === "approve-work-item", rework: type !== "approve-work-item" });
    expect(showcaseReplayFrames(fresh, [], "matching")).toEqual([]); // reloadでは履歴を捏造しない
    expect(showcaseReplayFrames(fresh, frames, "matching")).toEqual(frames);
    expect(showcaseReplayFrames(fresh, frames, "bp")).toEqual([]);
    expect(projectShowcaseStep(item, approval, intro[2], true, intro[0])).toMatchObject({ step: 2, completed: false });
    expect([...values]).toEqual(JSON.parse(before)); // guide再開始/表示/終了に保存処理なし
    expect(await reopened.listWorkItems()).toHaveLength(1);
  });
  it("pending/回答済みも再開始時に保持し、他3Demoを変更しない", async () => {
    const repo = createInMemoryWorkItemRepository();
    await startVisualNewClientDemo(repo, at); await startVisualBpDemo(repo, at); await startVisualCandidateDemo(repo, at);
    const other = await repo.listWorkItems();
    await startVisualHumanLoopDemo(repo, at); await answer(repo);
    const resolved = (await repo.getWorkItem(VISUAL_HUMAN_LOOP_ID))!;
    expect(projectShowcaseStep(resolved, undefined).completed).toBe(false);
    expect(await startVisualHumanLoopDemo(repo, at)).toEqual([]);
    expect(await repo.getWorkItem(resolved.id)).toEqual(resolved);
    await resumeVisualHumanLoopDemo(repo, at);
    const pending = (await repo.getWorkItem(resolved.id))!;
    expect(await startVisualHumanLoopDemo(repo, at)).toEqual([]);
    expect(await repo.getWorkItem(pending.id)).toEqual(pending);
    for (const item of other) expect(await repo.getWorkItem(item.id)).toEqual(item);
    expect(await repo.listWorkItems()).toHaveLength(4);
  });
});
