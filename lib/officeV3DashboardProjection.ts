import type { Activity, PriorityTask, Prospect } from "@/types";
import type { MatchingDemoResult, NewClientDemoResult, OfficeV3DemoResult } from "@/types/officeV3ClaudeDemo";

export type PipelineCard = {
  opportunityId?: string;
  title: string;
  candidates?: number;
  next: string;
  agent: string;
  updated: string;
};

export type ProspectCard = Prospect & { prospectId: string };

export type MatchingDashboardProjection = {
  scenarioId: "matching-proposal";
  log: Activity;
  task: PriorityTask;
  pipelineCard: PipelineCard;
};

export type NewClientDashboardProjection = {
  scenarioId: "new-client-outreach";
  log: Activity;
  task: PriorityTask;
  prospectCard: ProspectCard;
};

export type V3DashboardProjection = MatchingDashboardProjection | NewClientDashboardProjection;

function formatDemoTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/** matching完了結果を、副作用なしでDashboard表示3点へ変換する。Step17-F/18-Bの出力値から変更しない。 */
export function projectMatchingDemoResult(result: MatchingDemoResult): MatchingDashboardProjection {
  const time = formatDemoTime(result.completedAt);

  return {
    scenarioId: "matching-proposal",
    log: {
      time,
      agent: result.finalAgentName,
      action: `${result.resultTitle}（V3 Demo・Mock）`,
      status: "完了",
    },
    task: {
      id: 8,
      title: "マッチング結果を確認し、顧客への提案を準備する",
      agent: "AI営業Mgr",
      priority: "高",
      deadline: "要確認",
      status: "確認待ち",
      category: "提案",
    },
    pipelineCard: {
      opportunityId: result.opportunityId,
      title: result.opportunityTitle,
      next: "顧客への提案を準備",
      agent: "AI営業Mgr",
      updated: time,
    },
  };
}

/** Step21-B: new-client完了結果を、副作用なしでDashboard表示3点へ変換する。 */
export function projectNewClientDemoResult(result: NewClientDemoResult): NewClientDashboardProjection {
  const time = formatDemoTime(result.completedAt);

  return {
    scenarioId: "new-client-outreach",
    log: {
      time,
      agent: result.finalAgentName,
      action: `${result.resultTitle}（V3 Demo・Mock）`,
      status: "完了",
    },
    task: {
      id: 9,
      title: "候補企業を確認し、初回アプローチを準備する",
      agent: "AI新規開拓担当",
      priority: "高",
      deadline: "要確認",
      status: "確認待ち",
      category: "新規開拓",
    },
    prospectCard: {
      prospectId: result.prospectId,
      company: result.prospectName,
      type: "新規顧客候補",
      touch: "初回アプローチ準備完了",
      next: "初回アプローチを確認",
      due: "要確認",
      agent: "AI新規開拓担当",
    },
  };
}

export function projectV3DemoResultToDashboard(result: MatchingDemoResult): MatchingDashboardProjection;
export function projectV3DemoResultToDashboard(result: NewClientDemoResult): NewClientDashboardProjection;
export function projectV3DemoResultToDashboard(result: OfficeV3DemoResult): V3DashboardProjection;
export function projectV3DemoResultToDashboard(result: OfficeV3DemoResult): V3DashboardProjection {
  if (result.scenarioId === "matching-proposal") return projectMatchingDemoResult(result);
  return projectNewClientDemoResult(result);
}
