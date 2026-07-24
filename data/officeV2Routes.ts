import type { V2Route } from "@/types/officeV2";

export const v2Routes: Record<string, V2Route> = {
  managerReception: {
    id: "managerReception", label: "受付 → 指令席", agentId: "manager", speech: "新着案件を確認します",
    points: [{ x: 50, y: 45 }, { x: 42, y: 48 }, { x: 28, y: 48 }, { x: 15, y: 49 }, { x: 11, y: 51 }, { x: 11, y: 51 }, { x: 28, y: 48 }, { x: 42, y: 48 }, { x: 50, y: 45 }],
    handoff: "新着案件",
  },
  managerAnalytics: {
    id: "managerAnalytics", label: "Mgr → 分析担当", agentId: "manager", targetId: "analytics", speech: "類似実績を確認しましょう",
    points: [{ x: 50, y: 45 }, { x: 43, y: 42 }, { x: 43, y: 34 }, { x: 35, y: 34 }, { x: 29, y: 29 }, { x: 29, y: 29 }, { x: 35, y: 34 }, { x: 43, y: 34 }, { x: 43, y: 42 }, { x: 50, y: 45 }],
  },
  managerMatching: {
    id: "managerMatching", label: "Mgr → マッチング", agentId: "manager", targetId: "matching", speech: "案件条件を共有します",
    points: [{ x: 50, y: 45 }, { x: 52, y: 53 }, { x: 52, y: 63 }, { x: 61, y: 66 }, { x: 69, y: 76 }, { x: 69, y: 76 }, { x: 61, y: 66 }, { x: 52, y: 63 }, { x: 52, y: 53 }, { x: 50, y: 45 }],
    handoff: "案件カード",
  },
  matchingMeeting: {
    id: "matchingMeeting", label: "マッチング → 会議席", agentId: "matching", targetId: "manager", speech: "候補者3名を抽出しました",
    points: [{ x: 67, y: 79 }, { x: 64, y: 68 }, { x: 58, y: 64 }, { x: 55, y: 58 }, { x: 55, y: 58 }, { x: 58, y: 64 }, { x: 64, y: 68 }, { x: 67, y: 79 }],
    handoff: "候補者カード × 3",
  },
};

export const demoSequence = [
  { title: "受付で新着案件を受信", routeId: "managerReception", speech: "新着案件を確認します" },
  { title: "類似実績を分析", routeId: "managerAnalytics", speech: "類似実績を分析中" },
  { title: "案件条件を共有", routeId: "managerMatching", speech: "案件条件を共有します" },
  { title: "候補者を中央会議席へ", routeId: "matchingMeeting", speech: "候補者3名を抽出" },
  { title: "推薦文を作成", routeId: null, speech: "推薦文を作成します" },
  { title: "提案準備が完了", routeId: null, speech: "提案準備が完了しました" },
] as const;
