import type { AgentRoute, RoutePoint } from "@/types/route";

export const routePoints: Record<string, RoutePoint> = {
  managerDesk: { id: "managerDesk", label: "営業戦略席", x: 17, y: 24 },
  managerBranch: { id: "managerBranch", label: "営業戦略席前", x: 30, y: 35 },
  westNorth: { id: "westNorth", label: "北西サブ通路", x: 43, y: 35 },
  mainNorth: { id: "mainNorth", label: "メイン通路北", x: 50, y: 35 },
  receptionEntrance: { id: "receptionEntrance", label: "受付入口", x: 50, y: 22 },
  receptionDesk: { id: "receptionDesk", label: "受付端末", x: 50, y: 10 },
  analysisEntrance: { id: "analysisEntrance", label: "分析席入口", x: 57, y: 35 },
  analystSide: { id: "analystSide", label: "分析担当横", x: 61, y: 25 },
  analystDesk: { id: "analystDesk", label: "営業分析席", x: 66, y: 24 },
  mainCenter: { id: "mainCenter", label: "メイン通路中央", x: 50, y: 49 },
  mainSouth: { id: "mainSouth", label: "メイン通路南", x: 50, y: 64 },
  matchingEntrance: { id: "matchingEntrance", label: "マッチング入口", x: 57, y: 64 },
  matcherSide: { id: "matcherSide", label: "マッチング担当横", x: 61, y: 74 },
  matcherDesk: { id: "matcherDesk", label: "マッチング席", x: 66, y: 78 },
  handoffWest: { id: "handoffWest", label: "受け渡しテーブル西", x: 39, y: 49 },
  handoffSouth: { id: "handoffSouth", label: "受け渡しテーブル南", x: 43, y: 56 },
  meetingEntrance: { id: "meetingEntrance", label: "会議入口", x: 57, y: 49 },
  meetingSeatA: { id: "meetingSeatA", label: "会議席A", x: 61, y: 49 },
  meetingSeatB: { id: "meetingSeatB", label: "会議席B", x: 69, y: 49 },
  newbizDesk: { id: "newbizDesk", label: "新規開拓席", x: 13, y: 78 },
  newbizBranch: { id: "newbizBranch", label: "新規開拓席前", x: 22, y: 64 },
  phoneDesk: { id: "phoneDesk", label: "電話席", x: 18, y: 67 },
  bpDesk: { id: "bpDesk", label: "BP開拓席", x: 35, y: 78 },
  bpBranch: { id: "bpBranch", label: "BP席前", x: 40, y: 64 },
  networkDesk: { id: "networkDesk", label: "ネットワーク端末", x: 40, y: 70 },
  recruitDesk: { id: "recruitDesk", label: "採用席", x: 87, y: 24 },
  recruitBranch: { id: "recruitBranch", label: "採用席前", x: 77, y: 35 },
  interviewDesk: { id: "interviewDesk", label: "面談席", x: 80, y: 26 },
  followDesk: { id: "followDesk", label: "フォロー席", x: 87, y: 78 },
  followBranch: { id: "followBranch", label: "フォロー席前", x: 77, y: 64 },
  consultation: { id: "consultation", label: "相談席", x: 81, y: 70 },
};

const route = (id: string, points: string[], purpose: AgentRoute["purpose"], detail: Partial<AgentRoute> = {}): AgentRoute => ({ id, points, purpose, ...detail });

export const officeRoutes: Record<string, AgentRoute> = {
  managerReception: route("managerReception", ["managerDesk", "managerBranch", "westNorth", "mainNorth", "receptionEntrance", "receptionDesk", "receptionDesk", "receptionDesk", "receptionEntrance", "mainNorth", "westNorth", "managerBranch", "managerDesk"], "reception", { interactionAt: 5, interactionType: "reviewCard", interactionText: "新着案件を確認します" }),
  managerAnalyst: route("managerAnalyst", ["managerDesk", "managerBranch", "westNorth", "mainNorth", "analysisEntrance", "analystSide", "analystSide", "analystSide", "analysisEntrance", "mainNorth", "westNorth", "managerBranch", "managerDesk"], "confirm", { interactionAt: 5, interactionTarget: "analytics", interactionType: "sharedScreen", interactionText: "類似実績はこちらです" }),
  managerMatcher: route("managerMatcher", ["managerDesk", "managerBranch", "westNorth", "mainNorth", "mainCenter", "mainSouth", "matchingEntrance", "matcherSide", "matcherSide", "matcherSide", "matchingEntrance", "mainSouth", "mainCenter", "mainNorth", "westNorth", "managerBranch", "managerDesk"], "handoff", { interactionAt: 7, interactionTarget: "matching", interactionType: "deliverFile", interactionText: "案件条件を確認します" }),
  matcherHandoff: route("matcherHandoff", ["matcherDesk", "matcherSide", "matchingEntrance", "mainSouth", "mainCenter", "handoffSouth"], "handoff", { interactionAt: 5, interactionType: "compareCandidates", interactionText: "候補者3名を抽出しました" }),
  managerHandoff: route("managerHandoff", ["managerDesk", "managerBranch", "westNorth", "handoffWest"], "confirm", { interactionAt: 3, interactionTarget: "matching", interactionType: "compareCandidates", interactionText: "最優先候補を確認します" }),
  matcherAtHandoff: route("matcherAtHandoff", ["handoffSouth"], "confirm", { interactionAt: 0, interactionTarget: "manager", interactionType: "compareCandidates", interactionText: "候補者3名です" }),
  managerMeeting: route("managerMeeting", ["handoffWest", "mainCenter", "meetingEntrance", "meetingSeatA"], "meeting", { interactionAt: 3, interactionTarget: "matching", interactionType: "writeRecommendation", interactionText: "推薦文をまとめます" }),
  matcherMeeting: route("matcherMeeting", ["handoffSouth", "mainCenter", "meetingEntrance", "meetingSeatB"], "meeting", { interactionAt: 3, interactionTarget: "manager", interactionType: "writeRecommendation", interactionText: "強みを整理します" }),
  managerReturn: route("managerReturn", ["meetingSeatA", "meetingEntrance", "mainCenter", "mainNorth", "westNorth", "managerBranch", "managerDesk"], "return", { interactionAt: 6, interactionType: "complete", interactionText: "提案準備が完了しました" }),
  matcherReturn: route("matcherReturn", ["meetingSeatB", "meetingEntrance", "mainCenter", "mainSouth", "matchingEntrance", "matcherSide", "matcherDesk"], "return"),
  newbizTask: route("newbizTask", ["newbizDesk", "newbizBranch", "phoneDesk"], "task", { interactionAt: 2, interactionType: "task", interactionText: "電話・メールを作成中" }),
  newbizReturn: route("newbizReturn", ["phoneDesk", "newbizBranch", "newbizDesk"], "return"),
  bpTask: route("bpTask", ["bpDesk", "bpBranch", "networkDesk"], "task", { interactionAt: 2, interactionType: "task", interactionText: "企業情報を確認中" }),
  bpReturn: route("bpReturn", ["networkDesk", "bpBranch", "bpDesk"], "return"),
  matchingTask: route("matchingTask", ["matcherDesk", "matcherSide", "matchingEntrance"], "task", { interactionAt: 2, interactionType: "task", interactionText: "案件と要員を照合中" }),
  matchingReturn: route("matchingReturn", ["matchingEntrance", "matcherSide", "matcherDesk"], "return"),
  recruitTask: route("recruitTask", ["recruitDesk", "recruitBranch", "interviewDesk"], "task", { interactionAt: 2, interactionType: "task", interactionText: "候補者を確認中" }),
  recruitReturn: route("recruitReturn", ["interviewDesk", "recruitBranch", "recruitDesk"], "return"),
  followTask: route("followTask", ["followDesk", "followBranch", "consultation"], "task", { interactionAt: 2, interactionType: "task", interactionText: "フォロー内容を確認中" }),
  followReturn: route("followReturn", ["consultation", "followBranch", "followDesk"], "return"),
  analyticsTask: route("analyticsTask", ["analystDesk", "analystSide"], "task", { interactionAt: 1, interactionType: "task", interactionText: "分析結果を確認中" }),
  analyticsReturn: route("analyticsReturn", ["analystSide", "analystDesk"], "return"),
  managerTask: route("managerTask", ["managerDesk", "managerBranch", "handoffWest"], "task", { interactionAt: 2, interactionType: "task", interactionText: "優先順位を確認中" }),
  managerTaskReturn: route("managerTaskReturn", ["handoffWest", "managerBranch", "managerDesk"], "return"),
};

export const deskPointByAgent: Record<string, string> = { manager: "managerDesk", analytics: "analystDesk", newbiz: "newbizDesk", bp: "bpDesk", matching: "matcherDesk", recruit: "recruitDesk", follow: "followDesk" };
export const instructionRouteByAgent: Record<string, [string, string]> = { manager: ["managerTask", "managerTaskReturn"], analytics: ["analyticsTask", "analyticsReturn"], newbiz: ["newbizTask", "newbizReturn"], bp: ["bpTask", "bpReturn"], matching: ["matchingTask", "matchingReturn"], recruit: ["recruitTask", "recruitReturn"], follow: ["followTask", "followReturn"] };
export const demoRouteByStep: Record<number, Record<string, string>> = { 1: { manager: "managerReception" }, 2: { manager: "managerAnalyst" }, 3: { manager: "managerMatcher" }, 4: { matching: "matcherHandoff" }, 5: { manager: "managerHandoff", matching: "matcherAtHandoff" }, 6: { manager: "managerMeeting", matching: "matcherMeeting" }, 7: { manager: "managerReturn", matching: "matcherReturn" } };
