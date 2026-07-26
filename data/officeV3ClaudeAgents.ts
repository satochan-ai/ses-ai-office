import type { V3ClaudeOnlyAgentProfile } from "@/types/officeV3Claude";

/**
 * Claude版V3だけに存在する中央統括チームの2名（品質管理・経営参謀）。
 * data/office.ts（V1〜V2・Dashboard共通、11名）には追加せず、
 * このファイルと data/officeV3ClaudeLayout.ts の配置データを
 * components/office-v3-claude/ClaudeOfficeV3.tsx 側で結合して13名にする。
 */
export const v3ClaudeOnlyAgents: V3ClaudeOnlyAgentProfile[] = [
  {
    id: "quality",
    name: "AI品質管理担当",
    role: "品質検査官",
    currentTask: "提案文と分析結果の品質を確認中",
    duties: [
      "必須項目の抜け確認",
      "数値矛盾の検出",
      "誇大・断定表現の検出",
      "契約・個人情報リスクの確認",
      "合格、差し戻し、人間確認の判定",
    ],
    history: [
      "提案文8件・求人票5件・契約更新通知3件を検査",
      "表現リスク2件を検出し担当AIへ差し戻し",
      "品質スコアの判定基準を更新",
    ],
    finalDeliverables: ["品質チェック結果", "修正指示", "人間確認対象一覧", "品質スコア"],
  },
  {
    id: "strategist",
    name: "AI経営参謀",
    role: "経営集約・戦略立案官",
    currentTask: "部門横断サマリーを作成中",
    duties: [
      "各部門結果の横断集約",
      "売上、採用、稼働、契約リスクの統合分析",
      "優先アクションの提示",
      "経営判断の選択肢作成",
      "翌週重点テーマの抽出",
    ],
    history: [
      "営業・採用・稼働の結果を統合し優先課題3件を整理",
      "経営判断案2件を作成",
      "契約リスクの深刻度を再評価",
    ],
    finalDeliverables: ["経営サマリー", "優先アクション", "リスク一覧", "経営判断案"],
  },
];
