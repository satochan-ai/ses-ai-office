export type Tone = "blue" | "purple" | "orange" | "green" | "pink" | "cyan";

export type Agent = {
  id: string;
  name: string;
  shortName: string;
  role: string;
  task: string;
  processed: number;
  tone: Tone;
  duties: string[];
};

export type PriorityTask = {
  id: number;
  title: string;
  agent: string;
  priority: "高" | "中" | "低";
  deadline: string;
  status: "進行中" | "未着手" | "確認待ち";
  category: string;
};

export type Activity = {
  time: string;
  agent: string;
  action: string;
  status: "完了" | "処理中";
};

export type Prospect = {
  company: string;
  type: string;
  touch: string;
  field: string;
  next: string;
  due: string;
  agent: string;
};
