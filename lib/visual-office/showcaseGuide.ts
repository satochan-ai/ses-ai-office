import type { WorkItem } from "@/types/workItem";
import type { Approval } from "@/types/approval";
import { nextPresentationIndex, type ActivityFrame } from "./agentActivity";

export const MAIN_SHOWCASE_SCENARIO = "matching";
export const SHOWCASE_STEPS = [
  { title: "案件を整理", description: "AI営業Mgrが案件条件を整理します。" },
  { title: "担当へ引き継ぎ", description: "AIマッチング担当へ情報を引き継ぎます。" },
  { title: "Humanへ確認", description: "開始日が未確認のため、AIは推測せずHumanへ確認します。" },
  { title: "回答を反映", description: "Humanが回答した開始日を保存します。" },
  { title: "AIが再開", description: "回答を反映して条件を確認し、提案担当へ引き継ぎます。" },
  { title: "内容を確認", description: "AIが準備した内容をHumanが確認します。" },
] as const;

// 業務状態は変更しない。保存済み工程の表示と、現在の保存済み状態を区別する。
export function projectShowcaseStep(item: WorkItem | undefined, approval: Approval | undefined, frame?: ActivityFrame, playing = false, firstFrame?: ActivityFrame) {
  const completed = item?.status === "preparation_recorded" && !!item.currentApprovalId && approval?.id === item.currentApprovalId && approval.workItemId === item.id && approval.state === "approved";
  const rework = item?.status === "returned_for_rework";
  let step = 1;
  if (playing && frame) {
    step = frame.activity === "waiting_human" ? (frame.agentId === "proposal" ? 6 : 3)
      : frame.agentId === "manager" ? 1
      : frame.handoff?.to === "matching" ? 2
      : frame.activity === "reviewing" && frame.agentId === "matching" ? 4
      : frame.handoff?.to === "proposal" || frame.agentId === "proposal" ? 5
      : firstFrame?.agentId === "manager" || item?.missingInfo.some(info => info.status === "open") ? 2 : 5;
  } else if (item) {
    step = item.missingInfo.some(info => info.status === "open") ? 3
      : item.currentApprovalId || completed || rework || item.status === "awaiting_approval" ? 6
      : ["draft_generation", "quality_check", "info_gap_check"].includes(item.status) ? 5
      : item.missingInfo.some(info => info.status === "resolved") ? 4 : 1;
  }
  return { step, ...SHOWCASE_STEPS[step - 1], completed: completed && !playing, rework: rework && !playing };
}

export function showcaseReplayFrames(fresh: ActivityFrame[], existing: ActivityFrame[], existingScenario: string) {
  return fresh.length ? fresh : existingScenario === MAIN_SHOWCASE_SCENARIO ? existing : [];
}

// 既存Demoと共用する唯一の表示timer。Human待ちの最終frameでは停止する。
export function schedulePresentationFrame(index: number, length: number, paused: boolean, advance: (index: number) => void) {
  if (paused || index >= length - 1) return;
  const timer = setTimeout(() => advance(nextPresentationIndex(index, length)), 1200);
  return () => clearTimeout(timer);
}
