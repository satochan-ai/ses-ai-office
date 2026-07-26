import { HUMAN_SEAT_ID } from "@/data/officeV3ClaudeLayout";
import type { OfficeV3DemoScenario } from "@/types/officeV3ClaudeDemo";

/**
 * Claude版V3専用の固定デモシナリオ（1本のみ）。
 * 「案件受信から人間責任者承認まで」。
 *
 * 担当AIは既存の正式IDだけを使用する（新設なし）：
 * - manager     : AI営業Mgr（data/office.ts）
 * - matching    : AIマッチング担当（data/office.ts）
 * - proposal    : AI提案・面談支援担当（data/office.ts）
 * - quality     : AI品質管理担当（data/officeV3ClaudeAgents.ts）
 * - strategist  : AI経営参謀（data/officeV3ClaudeAgents.ts）
 * - HUMAN_SEAT_ID（"human-lead"） : 人間責任者席（data/officeV3ClaudeLayout.ts）
 *
 * 案件情報はすべてモックデータであり、実案件・個人情報は含まない。
 */
export const officeV3DemoScenario: OfficeV3DemoScenario = {
  id: "proposal-approval",
  title: "案件受信から人間責任者承認まで",
  job: {
    title: "Java業務システム開発支援",
    clientType: "既存取引先",
    requiredSkills: "Java、Spring Boot、基本設計",
    workStyle: "リモート併用",
    rate: "70万円",
    urgency: "高",
    candidateCount: 3,
    finalCandidateCount: 1,
    matchingScore: 88,
  },
  steps: [
    {
      id: "step-01", title: "案件受信", agentId: "manager", statusText: "案件受信",
      logs: ["Java業務システム開発支援案件を受信しました", "緊急度「高」として処理を開始します"],
      durationMs: 2200,
    },
    {
      id: "step-02", title: "案件情報整理", agentId: "manager", statusText: "案件整理中",
      logs: ["必須条件と営業条件を整理しています", "Java、Spring Boot、基本設計を必須条件として登録しました"],
      durationMs: 2200,
    },
    {
      id: "step-03", title: "候補者抽出", agentId: "matching", statusText: "候補者検索中",
      logs: ["登録人材から候補者を検索しています", "条件に近い候補者を3名抽出しました"],
      durationMs: 2200,
    },
    {
      id: "step-04", title: "適合度評価", agentId: "matching", statusText: "スキル判定中",
      logs: ["必須条件と候補者スキルを照合しています", "最終候補者のマッチングスコアは88点です"],
      durationMs: 2200,
    },
    {
      id: "step-05", title: "提案内容作成", agentId: "proposal", statusText: "提案文作成中",
      logs: ["候補者の強みを抽出しています", "顧客向けの推薦文を作成しました"],
      durationMs: 2400,
    },
    {
      id: "step-06", title: "品質確認", agentId: "quality", statusText: "品質確認中",
      logs: ["必須条件、表現、誤記を確認しています", "軽微な修正が必要と判定しました"],
      durationMs: 2400,
    },
    {
      id: "step-07", title: "自動修正", agentId: "proposal", statusText: "修正対応中",
      logs: ["AI品質管理から修正指示を受けました", "経験年数の表現と推薦理由を修正しました"],
      durationMs: 2200,
    },
    {
      id: "step-08", title: "再品質確認", agentId: "quality", statusText: "再確認中",
      logs: ["修正後の提案内容を再確認しています", "品質基準を満たしました"],
      durationMs: 2000,
    },
    {
      id: "step-09", title: "営業判断", agentId: "manager", statusText: "営業判断中",
      logs: ["提案優先度と顧客関係を確認しています", "重要案件として経営判断へ上げます"],
      durationMs: 2200,
    },
    {
      id: "step-10", title: "経営視点での確認", agentId: "strategist", statusText: "経営判断案を作成中",
      logs: ["収益性、顧客関係、受注可能性を分析しています", "人間責任者へ承認を申請します"],
      durationMs: 2400,
    },
    {
      id: "step-11", title: "人間承認待ち", agentId: HUMAN_SEAT_ID, statusText: "承認待ち",
      logs: ["人間責任者の最終判断を待っています"],
      durationMs: 0, requiresHumanApproval: true,
    },
    {
      id: "step-12", title: "完了", agentId: "manager", statusText: "提案準備完了",
      // 「人間責任者が提案を承認しました」は承認操作そのものの記録として useOfficeV3ClaudeDemo 側で追加する。
      logs: ["顧客への提案準備が完了しました"],
      durationMs: 2000,
    },
  ],
  rejectionSteps: [
    {
      id: "reject-01", title: "差し戻し内容確認", agentId: "quality", statusText: "差し戻し内容確認中",
      logs: ["AI品質管理が人間責任者からの差し戻し内容を確認しています"],
      durationMs: 2000,
    },
    {
      id: "reject-02", title: "再修正対応", agentId: "proposal", statusText: "提案内容を再修正中",
      logs: ["AI提案・面談支援担当が指摘内容をもとに提案内容を再修正しています"],
      durationMs: 2400,
    },
    {
      id: "reject-03", title: "再確認", agentId: "quality", statusText: "再確認中",
      logs: ["修正後の提案内容を再確認しています", "品質基準を満たしました"],
      durationMs: 2000,
    },
  ],
};
