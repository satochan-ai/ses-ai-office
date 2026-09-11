import type { Activity, PriorityTask } from "@/types";
import type { MatchingDemoResult } from "@/types/officeV3ClaudeDemo";

export type PipelineCard = {
  opportunityId?: string;
  title: string;
  candidates?: number;
  next: string;
  agent: string;
  updated: string;
};

export type V3DashboardProjection = {
  log: Activity;
  task: PriorityTask;
  pipelineCard: PipelineCard;
};

function formatDemoTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/** matching完了結果を、副作用なしで現在のDashboard表示3点へ変換する。 */
export function projectV3DemoResultToDashboard(result: MatchingDemoResult): V3DashboardProjection {
  const time = formatDemoTime(result.completedAt);

  return {
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
