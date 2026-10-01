import type { WorkItem } from "@/types/workItem";
import type { WorkItemRepository } from "@/types/workItemRepository";
import { demoResultToWorkItem } from "@/lib/runtime/demoAdapter";
import { getWorkItemUnitOfWork } from "@/lib/repositories/workItemUnitOfWork";
import { transition, type TransitionTrigger } from "@/lib/workItem/stateMachine";
import { prepareWorkItemApproval } from "./prepareWorkItemApproval";
import { projectAgentActivity, projectHandoff, type ActivityFrame } from "@/lib/visual-office/agentActivity";
export const VISUAL_HUMAN_LOOP_ID = "wi-demo-visual-human-loop";
export const VISUAL_NEW_CLIENT_ID = "wi-demo-visual-new-client";
export const VISUAL_BP_ID = "wi-demo-visual-bp-alliance";
export const VISUAL_DEMO_SCENARIOS = [
  { id: "matching", title: "案件マッチング", description: "開始日をHumanへ確認し、回答後に提案準備へ進みます。", workItemId: VISUAL_HUMAN_LOOP_ID },
  { id: "outreach", title: "新規顧客アプローチ", description: "架空企業の接点を整理し、未送信の文案をHumanが確認します。", workItemId: VISUAL_NEW_CLIENT_ID },
  { id: "bp", title: "BP協業", description: "架空BPの得意領域と過去接点を整理し、営業Mgrへ引き継いで面談準備メモを作成します。", workItemId: VISUAL_BP_ID },
] as const;
export const NEW_CLIENT_DRAFT = {
  company: "架空企業：デモ青葉システム株式会社", industry: "業務システム開発（Demo）",
  need: "開発体制の情報交換を想定", contact: "3か月前に名刺交換。案件提案履歴なし。担当：情報システム部の架空担当者。",
  subject: "開発体制に関する情報交換のご相談（未送信Demo）",
  body: ["情報システム部 ご担当者様", "以前の名刺交換をきっかけに、ご連絡の文案を準備しました。", "開発体制について情報交換の機会を検討いただければ幸いです。", "具体案件や人材の提案をお約束する内容ではありません。"],
  checks: ["過去接点・担当部署の確認", "表現と開示範囲の確認", "具体案件・人材情報を含めない"],
};
export const BP_PREPARATION_MEMO = {
  company: "架空BP：デモ若葉パートナーズ株式会社",
  specialty: "Java業務システム開発・インフラ運用（固定Demo）",
  people: "Java開発・インフラ運用経験者の情報交換を想定",
  projects: "Java保守開発案件の情報が中心という架空設定",
  history: "3か月前に名刺交換。最終接触も3か月前。関係性：情報交換の接点のみ、協業実績は未確認。",
  reasons: ["Java保守開発の情報交換テーマがある", "インフラ領域の対応範囲を確認したい", "名刺交換の接点がある（架空設定）"],
  themes: ["Java保守開発の案件傾向を情報交換", "インフラ運用の対応領域を確認", "情報交換の頻度・窓口を相談"],
  questions: ["得意なJava案件の工程・規模は？", "インフラ領域で対応できる範囲は？", "情報交換の窓口と希望頻度は？"],
  share: ["自社の対応領域の概要（Demo）", "確認したい協業テーマ", "個別紹介前にHuman確認が必要なこと"],
  avoid: ["未承認の顧客名・確定前の単価", "個人を特定できる候補者情報"],
};
export async function startVisualBpDemo(repository: WorkItemRepository, at: string): Promise<ActivityFrame[]> {
  return getWorkItemUnitOfWork(repository).run(async repo => {
    const existing = await repo.getWorkItem(VISUAL_BP_ID);
    if (existing) {
      if (existing.mode !== "demo" || existing.kind !== "bp-alliance" || existing.source.type !== "demo-seed") throw new Error("demo-only");
      return [];
    }
    const item = demoResultToWorkItem({ version: 2, source: "office-v3-claude", mock: true, scenarioId: "bp-alliance", scenarioTitle: "BP協業", completedAt: at, finalAgentId: "bp", finalAgentName: "AIBP開拓担当", resultTitle: "BP面談準備メモ（準備のみ）", resultSummary: JSON.stringify(BP_PREPARATION_MEMO), partnerId: "demo-visual-bp", partnerName: BP_PREPARATION_MEMO.company }, { now: at, createWorkItemId: () => VISUAL_BP_ID });
    item.evidenceIds = ["demo-evidence:visual-bp-alliance"];
    const frames: ActivityFrame[] = [projectAgentActivity(item), { agentId: "bp", activity: "reviewing", text: "BPの関係履歴を確認中…" }];
    const handed = { ...item, assignedAgentId: "manager", execution: { ...item.execution, lastAgentId: "manager" } };
    const handoff = projectHandoff(item, handed);
    if (handoff) frames.push(handoff);
    frames.push({ agentId: "manager", activity: "reviewing", text: "協業テーマを整理中…" }, { agentId: "manager", activity: "working", text: "面談準備メモを作成中…" });
    await repo.saveWorkItem(handed);
    // 既に開始したUoWの作業Repositoryを既存preparationへ渡す。
    const approval = await prepareWorkItemApproval(handed, repo, at, { run: async action => action(repo) });
    if (!approval) throw new Error("demo-approval-preparation-failed");
    const current = await repo.getWorkItem(item.id);
    if (!current) throw new Error("work-item-not-found");
    await repo.saveWorkItem({ ...current, nextAction: { kind: "approve_or_reject", ownerType: "human", label: "面談準備メモを確認する" } });
    frames.push(projectAgentActivity((await repo.getWorkItem(item.id))!, approval));
    return frames;
  });
}
export async function startVisualNewClientDemo(repository: WorkItemRepository, at: string): Promise<ActivityFrame[]> {
  return getWorkItemUnitOfWork(repository).run(async repo => {
    const existing = await repo.getWorkItem(VISUAL_NEW_CLIENT_ID);
    if (existing) {
      if (existing.mode !== "demo" || existing.kind !== "new-client-outreach" || existing.source.type !== "demo-seed") throw new Error("demo-only");
      return [];
    }
    const base = demoResultToWorkItem({ version: 2, source: "office-v3-claude", mock: true, scenarioId: "new-client-outreach", scenarioTitle: "新規顧客アプローチ", completedAt: at, finalAgentId: "newbiz", finalAgentName: "AI新規開拓担当", resultTitle: NEW_CLIENT_DRAFT.subject, resultSummary: JSON.stringify(NEW_CLIENT_DRAFT), prospectId: "demo-visual-new-client", prospectName: NEW_CLIENT_DRAFT.company }, { now: at, createWorkItemId: () => VISUAL_NEW_CLIENT_ID });
    const item = { ...base, evidenceIds: ["demo-evidence:visual-new-client"] };
    const frames: ActivityFrame[] = [projectAgentActivity(item)];
    const handed = { ...item, assignedAgentId: "relation", execution: { ...item.execution, lastAgentId: "relation" } };
    const handoff = projectHandoff(item, handed);
    if (handoff) frames.push(handoff);
    frames.push({ agentId: "relation", activity: "reviewing", text: "過去の接点とアプローチ時の注意事項を確認中…" }, { agentId: "relation", activity: "working", text: "初回アプローチ文案を準備中…" });
    await repo.saveWorkItem(handed);
    const approval = await prepareWorkItemApproval(handed, repo, at, { run: async action => action(repo) });
    if (!approval) throw new Error("demo-approval-preparation-failed");
    const current = await repo.getWorkItem(item.id);
    if (!current) throw new Error("work-item-not-found");
    await repo.saveWorkItem({ ...current, nextAction: { kind: "approve_or_reject", ownerType: "human", label: "未送信文案を確認する" } });
    frames.push(projectAgentActivity((await repo.getWorkItem(item.id))!, approval));
    return frames;
  });
}
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
