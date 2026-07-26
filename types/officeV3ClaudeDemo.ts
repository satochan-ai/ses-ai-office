/**
 * Claude版V3専用の固定デモ（5シナリオ）の型定義。
 * V1の`types/demo.ts`とは無関係の、V3専用の最小限の型。
 * 汎用ワークフローエンジンにはせず、固定シナリオを表現できる最小構成に留める。
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

/** ラベル・値の1行（対象データの概要、承認時の指標などで共通利用する）。 */
export type OfficeV3DemoMetric = {
  label: string;
  value: string;
};

export type OfficeV3DemoApprovalSummary = {
  title: string;
  metrics: OfficeV3DemoMetric[];
  qualityResult: string;
  managerDecision: string;
  strategistProposal?: string;
};

export type OfficeV3DemoScenario = {
  id: string;
  title: string;
  shortDescription: string;
  category: string;
  /** 対象データの見出し（例：「対象案件」「対象企業」「対象候補者」）。 */
  subjectLabel: string;
  subjectSummary: string;
  /** 対象データの概要（モックデータのみ、実在情報は含まない）。 */
  subjectDetails: OfficeV3DemoMetric[];
  /** 通常進行フロー（最後から2番目のステップで人間承認待ちに入る）。 */
  steps: OfficeV3DemoStep[];
  /** 人間責任者が差し戻した場合だけ再生される簡易フロー。完了後は自動的に承認待ちへ戻る。 */
  rejectionSteps?: OfficeV3DemoStep[];
  approvalSummary: OfficeV3DemoApprovalSummary;
};
