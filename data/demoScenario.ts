import type { DemoCandidate, DemoStep } from "@/types/demo";

export const DEMO_STORAGE_KEY = "ses-ai-office-demo-result";

export const demoJob = {
  name: "Java Webシステム開発", skills: "Java、Spring Boot、SQL", workStyle: "週2日出社",
  rate: "65万円", start: "来月", openings: "2名",
};

export const demoCandidates: DemoCandidate[] = [
  { name: "田中 太郎", java: "5年", spring: "3年", sql: "5年", onsite: "週2日可", rate: "62万円", score: 92, verdict: "提案推奨", caution: "条件を満たしています" },
  { name: "佐藤 花子", java: "4年", spring: "2年", sql: "4年", onsite: "週1日希望", rate: "60万円", score: 84, verdict: "条件確認後に提案", caution: "週2日出社可否を確認" },
  { name: "鈴木 一郎", java: "6年", spring: "1年", sql: "6年", onsite: "週2日可", rate: "68万円", score: 78, verdict: "単価調整が必要", caution: "3万円の単価調整が必要" },
];

export const demoRecommendation = "Java開発経験5年、Spring Bootを用いたWebシステム開発経験3年を有する要員です。要件定義からテストまで一貫して対応可能で、SQLを用いたデータ処理にも強みがあります。週2日の出社にも対応可能で、来月からの参画を希望しています。";
export const demoChecks = ["商流制限", "面談回数", "精算幅", "リモート頻度"];

export const demoSteps: DemoStep[] = [
  { id: 1, title: "新着案件を受信", process: "Java案件の要件を確認", agentIds: ["manager"], agentNames: ["AI営業Mgr"], duration: 3500, statuses: { manager: "案件確認中" }, speeches: { manager: "新着Java案件を受信しました。要件を確認します。" }, logs: ["AI営業Mgrが新着案件を受信"] },
  { id: 2, title: "案件条件を整理", process: "必須条件・提案実績・NG理由を分析", agentIds: ["manager", "analytics"], agentNames: ["AI営業Mgr", "AI分析担当"], duration: 4500, statuses: { manager: "分析中", analytics: "分析中" }, speeches: { manager: "必須条件と営業上の注意点を整理しています。", analytics: "類似案件の提案実績とNG理由を確認しています。" }, logs: ["AI営業Mgrが案件条件を整理", "AI分析担当が類似案件の実績を分析"] },
  { id: 3, title: "要員マッチング", process: "案件1件と要員32名を照合", agentIds: ["matching"], agentNames: ["AIマッチング担当"], duration: 5000, statuses: { matching: "照合中" }, speeches: { matching: "案件1件と要員32名を照合しています。" }, logs: ["AIマッチング担当が32名の要員照合を開始"] },
  { id: 4, title: "候補者3名を抽出", process: "マッチ度と不足条件を確認", agentIds: ["matching"], agentNames: ["AIマッチング担当"], duration: 4000, statuses: { matching: "確認待ち" }, speeches: { matching: "提案候補3名を抽出しました。" }, logs: ["AIマッチング担当が提案候補3名を抽出"] },
  { id: 5, title: "営業優先順位を判定", process: "提案可能性と確認事項から順位を決定", agentIds: ["manager"], agentNames: ["AI営業Mgr"], duration: 4000, statuses: { manager: "判断中" }, speeches: { manager: "提案可能性と確認事項を踏まえて優先順位を決定します。" }, logs: ["AI営業Mgrが提案優先順位を決定"] },
  { id: 6, title: "推薦文を作成", process: "最優先候補の強みを案件要件に合わせて整理", agentIds: ["manager", "matching"], agentNames: ["AI営業Mgr", "AIマッチング担当"], duration: 4500, statuses: { manager: "作成中", matching: "作成中" }, speeches: { manager: "最優先候補の推薦文を作成しています。", matching: "案件要件に合わせて強みを整理しています。" }, logs: ["AI営業Mgrが推薦文を作成"] },
  { id: 7, title: "提案準備完了", process: "最優先候補1名の提案準備が完了", agentIds: ["manager"], agentNames: ["AI営業Mgr"], duration: 3000, statuses: { manager: "完了" }, speeches: { manager: "最優先候補1名の提案準備が完了しました。" }, logs: ["Java案件の提案準備が完了"] },
];
