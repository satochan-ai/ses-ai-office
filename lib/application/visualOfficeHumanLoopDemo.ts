import type { WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { demoResultToWorkItem } from "@/lib/runtime/demoAdapter";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import { transition, type TransitionTrigger } from "@/lib/workItem/stateMachine";
import { prepareWorkItemApproval } from "./prepareWorkItemApproval";
import { projectAgentActivity, projectHandoff, type ActivityFrame } from "@/lib/visual-office/agentActivity";
export const VISUAL_HUMAN_LOOP_ID = "wi-demo-visual-human-loop";
function seed(at: string): WorkItem {
  const base = demoResultToWorkItem({ version: 2, source: "office-v3-claude", mock: true, scenarioId: "matching-proposal", scenarioTitle: "AI引き継ぎ・Human質問デモ", completedAt: at, finalAgentId: "manager", finalAgentName: "AI営業Mgr", resultTitle: "SES案件と候補者のマッチング", resultSummary: "架空データによる工程デモ。開始日だけHumanへ確認します。", opportunityId: "demo-step16-opportunity", opportunityTitle: "Demo 開発案件" }, { now: at, createWorkItemId: () => VISUAL_HUMAN_LOOP_ID });
  base.missingInfo = base.missingInfo.map(info => ({ ...info, id: `demo-missing:visual-human-loop:${info.field}` }));
  base.evidenceIds = ["demo-evidence:visual-human-loop"];
  base.proposalDecisions = base.proposalDecisions.map(decision => ({ ...decision, evidenceIds: base.evidenceIds }));
  return { ...base, status: "structuring", assignedAgentId: "manager", nextAction: { kind: "run_agent", ownerType: "agent", label: "案件条件を整理する" }, relations: { ...base.relations, personIds: ["demo-step16-person"] }, missingInfo: base.missingInfo.filter(info => info.field === "availabilityStart").map(info => ({ ...info, question: "開始予定日を教えてください。この情報がないため、候補者を提案可能か確定できません。" })), proposalDecisions: base.proposalDecisions.map(d => ({ ...d, personId: "demo-step16-person", routeStatus: "clear", intentStatus: "confirmed", duplicateStatus: "none", disclosureStatus: "defined", blockerMissingInfoIds: base.missingInfo.filter(info => info.field === "availabilityStart").map(info => info.id) })) };
}
function advance(item: WorkItem, trigger: TransitionTrigger): WorkItem {
  const result = transition(item, trigger);
  if (!result.ok) throw new Error("demo-transition-rejected");
  // この1本のDemo専用割当。Domain/共通assignment policyは変更しない。
  const agentId = ["draft_generation", "quality_check"].includes(result.item.status) ? "proposal" : "matching";
  return { ...result.item, assignedAgentId: agentId };
}
export async function startVisualHumanLoopDemo(repository: WorkItemRepository, at: string): Promise<ActivityFrame[]> {
  return getWorkItemUnitOfWork(repository).run(async repo => {
    const existing = await repo.getWorkItem(VISUAL_HUMAN_LOOP_ID);
    if (existing) { if (existing.mode !== "demo" || existing.source.type !== "demo-seed") throw new Error("demo-only"); return []; }
    let item = seed(at); const frames = [projectAgentActivity(item)];
    await repo.saveWorkItem(item);
    // 開始操作のApplication処理。timerから業務状態は変更しない。
    for (let i = 0; i < 4; i++) {
      const before = item;
      item = advance(item, { type: "agent-completed", at, agentId: item.assignedAgentId ?? "matching" });
      const handoff = projectHandoff(before, item); if (handoff) frames.push(handoff);
      if (i === 0) frames.push(projectAgentActivity(item));
      await repo.saveWorkItem(item);
    }
    if (item.status !== "blocked_missing_info") throw new Error("demo-missing-info-expected");
    frames.push({ ...projectAgentActivity(item), text: "開始予定日が不足しています・Humanへ確認" });
    return frames;
  });
}
export async function resumeVisualHumanLoopDemo(repository: WorkItemRepository, at: string): Promise<ActivityFrame[]> {
  const frames = await getWorkItemUnitOfWork(repository).run(async repo => {
    let item = await repo.getWorkItem(VISUAL_HUMAN_LOOP_ID);
    if (!item || item.mode !== "demo" || item.status !== "blocked_missing_info" || item.missingInfo.some(info => info.status === "open") || item.proposalDecisions.some(d => d.readiness !== "ready_for_human_review")) return [];
    const frames: ActivityFrame[] = [{ agentId: item.assignedAgentId, activity: "reviewing", text: "Human回答を受領・回答を反映しました" }];
    item = advance(item, { type: "human-input-provided", at, humanId: "demo-human" }); frames.push(projectAgentActivity(item)); await repo.saveWorkItem(item);
    const before = item; item = advance(item, { type: "agent-completed", at, agentId: "matching" });
    const handoff = projectHandoff(before, item); if (handoff) frames.push(handoff); await repo.saveWorkItem(item);
    if (item.status !== "draft_generation") throw new Error("demo-review-blocked");
    item = advance(item, { type: "agent-completed", at, agentId: "proposal", output: { currentDeliverableId: `deliverable:${item.id}` } }); await repo.saveWorkItem(item);
    return frames;
  });
  if (frames.length) {
    const item = await repository.getWorkItem(VISUAL_HUMAN_LOOP_ID);
    if (!item) throw new Error("work-item-not-found");
    const approval = await prepareWorkItemApproval(item, repository, at);
    if (approval) {
      // preparation既存APIはnextActionを変更しないため、既存Domainの承認待ち値を使う。
      const awaiting = transition(item, { type: "agent-completed", at, agentId: "proposal" });
      if (!awaiting.ok || awaiting.item.status !== "awaiting_approval") throw new Error("demo-approval-transition-rejected");
      await getWorkItemUnitOfWork(repository).run(async repo => {
        const current = await repo.getWorkItem(item.id);
        if (!current || current.currentApprovalId !== approval.id || current.status !== "awaiting_approval") throw new Error("demo-approval-changed");
        await repo.saveWorkItem({ ...current, nextAction: awaiting.item.nextAction });
      });
    }
    frames.push(projectAgentActivity((await repository.getWorkItem(item.id))!, approval ?? undefined));
  }
  return frames;
}
