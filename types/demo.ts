import type { AgentAnimationMap } from "@/types/animation";
import type { OfficeAgentStatus } from "@/types/office";
import type { OfficeFloorId } from "@/types/route";

export type DemoStatus = "idle" | "running" | "paused" | "completed";
export type DemoSpeed = "normal" | "fast";
export type DemoScenarioId = "proposal-prep" | "interview-prep" | "contract-risk" | "lost-knowledge";

export type DemoCandidate = {
  name: string; java: string; spring: string; sql: string; onsite: string;
  rate: string; score: number; verdict: string; caution: string;
};

export type DemoStep = {
  id: number;
  title: string;
  process: string;
  agentIds: string[];
  agentNames: string[];
  duration: number;
  activeFloor: OfficeFloorId;
  routes: Record<string, string>;
  animations: AgentAnimationMap;
  statuses: Record<string, OfficeAgentStatus>;
  speeches: Record<string, string>;
  logs: string[];
  handoffCard?: string;
  progressLabel?: string;
  highlights?: string[];
};

export type DemoResultContent = {
  title: string;
  summary: string;
  metrics: { label: string; value: string }[];
  artifacts: string[];
  dashboardSummary: string;
  priorityTask: string;
};

export type DemoScenario = {
  id: DemoScenarioId;
  title: string;
  description: string;
  estimatedDuration: string;
  participants: string[];
  startFloor: OfficeFloorId;
  endFloor: OfficeFloorId;
  floorMoves: number;
  steps: DemoStep[];
  result: DemoResultContent;
  dashboardAdjustments: Record<string, number>;
};

export type DemoStoredResult = {
  completed: true;
  completedAt: string;
  logs: string[];
  scenarioId?: DemoScenarioId;
  scenarioTitle?: string;
  metrics?: { label: string; value: string }[];
  priorityTasks?: string[];
  dashboardAdjustments?: Record<string, number>;
  dashboardSummary?: string;
  newJobs: number;
  candidates: number;
  proposals: number;
};
