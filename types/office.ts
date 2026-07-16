export type OfficeAgentStatus = "稼働中" | "分析中" | "確認待ち" | "要対応" | "待機中";

export type OfficeAgent = {
  id: string;
  name: string;
  shortName: string;
  room: string;
  floor: "upper" | "lower";
  accent: "navy" | "pink" | "green" | "purple" | "orange" | "cyan" | "teal";
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
  decoration: "strategy" | "search" | "network" | "matching" | "recruit" | "follow" | "analytics";
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
