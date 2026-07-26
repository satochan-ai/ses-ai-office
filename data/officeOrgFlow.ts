import type { OfficeOrgFlowStep } from "@/types/officeOrgFlow";

/**
 * SES AI Office の組織フロー定義（将来のデモ用データ）。
 * 現時点ではどの画面にも接続していない。デモ・アニメーション実装時の参照データとして用意する。
 *
 * 基本フロー：
 * 1. 入力受信 → 2. 担当AIへ配分 → 3. 実務処理 → 4. 成果物作成 →
 * 5. AI品質管理による検査 → 6. 合格/差し戻し → 7. AI経営参謀による集約 →
 * 8. AI営業Mgrによる全体確認 → 9. Dashboard反映 → 10. 人間確認
 */

/** 実務AI11名それぞれが品質管理へ渡す成果物（連携表と対応）。 */
const FIELD_AGENT_DELIVERABLES: Record<string, string> = {
  manager: "本日の優先順位方針・全体アクション一覧",
  analytics: "ファネル分析レポート・停滞ポイント一覧",
  newbiz: "初回・再アプローチ文面・優先候補企業リスト",
  bp: "BP候補選定リスト・商流整理メモ",
  matching: "提案候補リスト・推薦文下書き",
  recruit: "スカウト文面・面談準備資料",
  follow: "週報確認結果・要フォロー対象一覧",
  relation: "顧客関係性整理メモ・次回アクション案",
  proposal: "推薦文・企業分析・面談質問リスト",
  contract: "契約更新確認結果・請求照合結果",
  knowledge: "教材化された事例・ナレッジ更新内容",
};

/** 手順1・2：入力受信とAI営業Mgrによる配分。 */
const intakeSteps: OfficeOrgFlowStep[] = [
  {
    id: "flow-01-intake", order: 1, fromAgentId: "input", toAgentId: "manager",
    trigger: "顧客要望・案件情報・応募情報などを受信", deliverable: "入力情報一式",
    result: "AI営業Mgrが内容を確認し、担当実務AIへ配分する準備をする",
    humanReviewRequired: false,
  },
  ...Object.keys(FIELD_AGENT_DELIVERABLES)
    .filter(id => id !== "manager")
    .map((id): OfficeOrgFlowStep => ({
      id: `flow-02-assign-${id}`, order: 2, fromAgentId: "manager", toAgentId: id,
      trigger: "入力内容が当該AIの担当領域に該当", deliverable: "処理対象の案件・依頼内容",
      result: `${id}が実務処理を開始する`,
      humanReviewRequired: false,
    })),
];

/** 手順3〜6：実務処理・成果物作成・AI品質管理による検査・合格/差し戻し。 */
const qualityCheckSteps: OfficeOrgFlowStep[] = Object.entries(FIELD_AGENT_DELIVERABLES).map(
  ([id, deliverable]): OfficeOrgFlowStep => ({
    id: `flow-05-quality-${id}`, order: 5, fromAgentId: id, toAgentId: "quality",
    trigger: "実務AIが成果物を作成完了", deliverable,
    result: "AI品質管理が必須項目・数値整合性・表現リスクを検査し品質スコアを算出する",
    failureDestination: id,
    humanReviewRequired: id === "contract",
  }),
);

/** 手順7・8：AI経営参謀による集約とAI営業Mgrによる全体確認。 */
const aggregationSteps: OfficeOrgFlowStep[] = [
  {
    id: "flow-06-pass", order: 6, fromAgentId: "quality", toAgentId: "strategist",
    trigger: "品質スコア80点以上（合格）", deliverable: "品質保証済み成果物パッケージ",
    result: "AI経営参謀が部門横断で集計・分析する",
    humanReviewRequired: false,
  },
  {
    id: "flow-07-aggregate", order: 7, fromAgentId: "strategist", toAgentId: "manager",
    trigger: "部門横断集約が完了", deliverable: "経営サマリー・優先アクション・リスク一覧・経営判断案",
    result: "AI営業Mgrが現場進行状況と突き合わせて全体確認する",
    humanReviewRequired: false,
  },
];

/** 手順9・10：Dashboard反映と人間確認。 */
const outputSteps: OfficeOrgFlowStep[] = [
  {
    id: "flow-08-dashboard", order: 9, fromAgentId: "manager", toAgentId: "dashboard",
    trigger: "全体確認が完了", deliverable: "経営サマリー・優先アクション・リスク一覧",
    result: "Dashboardへ反映される",
    humanReviewRequired: false,
  },
  {
    id: "flow-09-human", order: 10, fromAgentId: "dashboard", toAgentId: "human",
    trigger: "Dashboard反映後の定例確認、または人間確認条件への該当",
    deliverable: "経営サマリー・人間確認対象一覧",
    result: "人間が最終確認・承認する",
    humanReviewRequired: true,
  },
];

/** 正常系フロー（手順1〜10）。 */
export const officeOrgFlowSteps: OfficeOrgFlowStep[] = [
  ...intakeSteps,
  ...qualityCheckSteps,
  ...aggregationSteps,
  ...outputSteps,
];

/** 例外系フロー。品質不合格・情報不足・判断不能・法務リスク等。 */
export const officeOrgFlowExceptions: OfficeOrgFlowStep[] = [
  {
    id: "exception-quality-fail", order: 51, fromAgentId: "quality", toAgentId: "anyFieldAgent",
    trigger: "品質スコア60〜79点（必須項目欠落・軽微な表現リスク等）",
    deliverable: "修正指示", result: "担当実務AIが修正し、再度AI品質管理へ提出する（最大2回まで）",
    failureDestination: "anyFieldAgent", humanReviewRequired: false, isExceptionPath: true,
  },
  {
    id: "exception-quality-fail-repeat", order: 52, fromAgentId: "quality", toAgentId: "human",
    trigger: "同一成果物が3回連続で品質スコア60点未満、または改善が見られない",
    deliverable: "差し戻し履歴・品質チェック結果", result: "人間が最終判断する",
    humanReviewRequired: true, isExceptionPath: true,
  },
  {
    id: "exception-info-shortage", order: 53, fromAgentId: "anyFieldAgent", toAgentId: "manager",
    trigger: "処理に必要な入力情報が不足している",
    deliverable: "不足情報の要求内容", result: "AI営業Mgrが追加情報を要求する（人間への即時通知は行わない）",
    humanReviewRequired: false, isExceptionPath: true,
  },
  {
    id: "exception-judgment-impossible", order: 54, fromAgentId: "anyFieldAgent", toAgentId: "human",
    trigger: "実務AIまたはAI経営参謀が確信度不足と判定し、AI単独で判断できない",
    deliverable: "保留タグ付きの検討内容", result: "人間確認リストへ追加される",
    humanReviewRequired: true, isExceptionPath: true,
  },
  {
    id: "exception-legal-risk", order: 55, fromAgentId: "quality", toAgentId: "human",
    trigger: "契約・法務に関わる表現の変更、または法務リスクに該当する内容を検出",
    deliverable: "該当箇所と法務リスクの内容", result: "品質スコア計算を待たず即時エスカレーションする（差し戻しループに入れない）",
    humanReviewRequired: true, isExceptionPath: true,
  },
  {
    id: "exception-numeric-conflict", order: 56, fromAgentId: "quality", toAgentId: "anyFieldAgent",
    trigger: "成果物内、または部門間で数値矛盾を検出",
    deliverable: "矛盾箇所の指摘内容",
    result: "担当実務AIへ差し戻し。2部門にまたがる矛盾はAI経営参謀へも通知する",
    failureDestination: "anyFieldAgent", humanReviewRequired: false, isExceptionPath: true,
  },
  {
    id: "exception-personal-info", order: 57, fromAgentId: "quality", toAgentId: "human",
    trigger: "個人情報の外部送信、または特定可能な事例の教材化を検出",
    deliverable: "該当箇所のマスキング候補", result: "人間が内容を確認し可否を判断する",
    humanReviewRequired: true, isExceptionPath: true,
  },
  {
    id: "exception-urgent-risk", order: 58, fromAgentId: "anyFieldAgent", toAgentId: "human",
    trigger: "契約解除の兆候、重大クレーム、大口商機の急変等の緊急リスクを検知",
    deliverable: "緊急リスクの内容", result: "通常フローをスキップし、検知したAIから人間へ直接即時通知する",
    humanReviewRequired: true, isExceptionPath: true,
  },
  {
    id: "exception-duplicate", order: 59, fromAgentId: "manager", toAgentId: "anyFieldAgent",
    trigger: "同一案件が複数の実務AIまたは複数回配分され重複処理が発生",
    deliverable: "重複案件の統合結果", result: "AI営業Mgrまたは経営参謀の段階で一本化する",
    humanReviewRequired: false, isExceptionPath: true,
  },
  {
    id: "exception-cross-department-conflict", order: 60, fromAgentId: "strategist", toAgentId: "manager",
    trigger: "部門横断集約の段階で複数部門の結論が矛盾",
    deliverable: "矛盾する結論の内容", result: "AI営業Mgrが判断。解消できない場合は人間確認へ",
    failureDestination: "human", humanReviewRequired: false, isExceptionPath: true,
  },
];
