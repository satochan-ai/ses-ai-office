/**
 * Claude版V3専用の固定デモ（案件受信から人間責任者承認まで）の型定義。
 * V1の`types/demo.ts`とは無関係の、V3専用の最小限の型。
 * 汎用ワークフローエンジンにはせず、今回の1シナリオを表現できる最小構成に留める。
 */

export type OfficeV3DemoStatus = "idle" | "running" | "awaiting-approval" | "completed";

export type OfficeV3ApprovalState = "none" | "pending" | "approved" | "rejected";

export type OfficeV3DemoStep = {
  id: string;
  title: string;
  /** data/office.ts または data/officeV3ClaudeAgents.ts の正式ID、もしくは人間責任者席のID。 */
  agentId: string;
  statusText: string;
  logs: string[];
  durationMs: number;
  /** trueの場合、このステップに到達すると自動進行を止め、人間の操作を待つ。 */
  requiresHumanApproval?: boolean;
};

export type OfficeV3DemoLog = {
  id: string;
  message: string;
  stepId: string;
  createdAt: number;
};

/** デモ内で使用する固定案件（モックデータ、実案件・個人情報は含まない）。 */
export type OfficeV3DemoJob = {
  title: string;
  clientType: string;
  requiredSkills: string;
  workStyle: string;
  rate: string;
  urgency: string;
  candidateCount: number;
  finalCandidateCount: number;
  matchingScore: number;
};

export type OfficeV3DemoScenario = {
  id: string;
  title: string;
  job: OfficeV3DemoJob;
  /** STEP1〜STEP12の通常進行フロー（STEP11で人間承認待ちに入り自動進行を止める）。 */
  steps: OfficeV3DemoStep[];
  /** 人間責任者が差し戻した場合だけ再生される簡易フロー。完了後は自動的に承認待ちへ戻る。 */
  rejectionSteps: OfficeV3DemoStep[];
};
