import type { Activity, PriorityTask, Prospect } from "@/types";
import type { CandidateScreeningDemoResult, MatchingDemoResult, NewClientDemoResult, OfficeV3DemoResult, OfficeV3DemoResultBase } from "@/types/officeV3ClaudeDemo";

export type PipelineCard = {
  opportunityId?: string;
  title: string;
  candidates?: number;
  next: string;
  agent: string;
  updated: string;
};

export type ProspectCard = Prospect & { prospectId: string };

export type RecruitingCard = {
  candidateId: string;
  name: string;
  status: string;
  next: string;
  agent: string;
  updated: string;
};

const V3_TASK_IDS = {
  matching: 8,
  newClient: 9,
  recruiting: 10,
} as const;

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

export type RecruitingDashboardProjection = {
  scenarioId: "candidate-screening";
  log: Activity;
  task: PriorityTask;
  recruitingCard: RecruitingCard;
};

export type V3DashboardProjection = MatchingDashboardProjection | NewClientDashboardProjection | RecruitingDashboardProjection;

function formatDemoTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function projectCompletionLog(result: OfficeV3DemoResultBase): Activity {
  return {
    time: formatDemoTime(result.completedAt),
    agent: result.finalAgentName,
    action: `${result.resultTitle}（V3 Demo・Mock）`,
    status: "完了",
  };
}

/** matching完了結果を、副作用なしでDashboard表示3点へ変換する。Step17-F/18-Bの出力値から変更しない。 */
export function projectMatchingDemoResult(result: MatchingDemoResult): MatchingDashboardProjection {
  const time = formatDemoTime(result.completedAt);

  return {
    scenarioId: "matching-proposal",
    log: projectCompletionLog(result),
    task: {
      id: V3_TASK_IDS.matching,
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
  return {
    scenarioId: "new-client-outreach",
    log: projectCompletionLog(result),
    task: {
      id: V3_TASK_IDS.newClient,
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

/** Step22-C: recruiting完了結果を、採用確認を含むDashboard表示3点へ変換する。 */
export function projectCandidateScreeningDemoResult(result: CandidateScreeningDemoResult): RecruitingDashboardProjection {
  const time = formatDemoTime(result.completedAt);

  return {
    scenarioId: "candidate-screening",
    log: projectCompletionLog(result),
    task: {
      id: V3_TASK_IDS.recruiting,
      title: "候補者情報と面接案内内容を確認する",
      agent: "AI採用担当",
      priority: "高",
      deadline: "要確認",
      status: "確認待ち",
      category: "採用",
    },
    recruitingCard: {
      candidateId: result.candidateId,
      name: result.candidateName,
      status: "面接案内準備完了",
      next: "面接案内内容を確認",
      agent: "AI採用担当",
      updated: time,
    },
  };
}

export function projectV3DemoResultToDashboard(result: MatchingDemoResult): MatchingDashboardProjection;
export function projectV3DemoResultToDashboard(result: NewClientDemoResult): NewClientDashboardProjection;
export function projectV3DemoResultToDashboard(result: CandidateScreeningDemoResult): RecruitingDashboardProjection;
export function projectV3DemoResultToDashboard(result: OfficeV3DemoResult): V3DashboardProjection;
export function projectV3DemoResultToDashboard(result: OfficeV3DemoResult): V3DashboardProjection {
  switch (result.scenarioId) {
    case "matching-proposal":
      return projectMatchingDemoResult(result);
    case "new-client-outreach":
      return projectNewClientDemoResult(result);
    case "candidate-screening":
      return projectCandidateScreeningDemoResult(result);
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}
