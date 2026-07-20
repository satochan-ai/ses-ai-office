export type OfficeAgentStatus = "稼働中" | "分析中" | "確認待ち" | "要対応" | "待機中" | "案件確認中" | "照合中" | "判断中" | "作成中" | "確認中" | "共有中" | "移動中" | "整理中" | "分類中" | "完了";

export type OfficeAgent = {
  id: string;
  name: string;
  shortName: string;
  room: string;
  floor: "upper" | "lower";
  floorId: "1f" | "2f";
  floorLabel: string;
  accent: "navy" | "pink" | "green" | "purple" | "orange" | "cyan" | "teal" | "blue" | "gold" | "slate" | "plum";
  status: OfficeAgentStatus;
  role: string;
  currentTask: string;
  speech: string;
  progress: number;
  result: string;
  pending: number;
  metrics: string[];
  duties: string[];
  history: string[];
  decoration: "strategy" | "search" | "network" | "matching" | "recruit" | "follow" | "analytics" | "relation" | "proposal" | "contract" | "knowledge";
};

export type OfficeAlert = {
  label: string;
  value: string;
  severity: "warning" | "critical";
};

export type OfficeAction = {
  id: number;
  title: string;
  owner: string;
};
