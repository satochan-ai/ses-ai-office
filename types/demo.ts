import type { OfficeAgentStatus } from "@/types/office";

export type DemoStatus = "idle" | "running" | "paused" | "completed";
export type DemoSpeed = "normal" | "fast";

export type DemoCandidate = {
  name: string; java: string; spring: string; sql: string; onsite: string;
  rate: string; score: number; verdict: string; caution: string;
};

export type DemoStep = {
  id: number; title: string; process: string; agentIds: string[]; agentNames: string[];
  duration: number; statuses: Record<string, OfficeAgentStatus>;
  speeches: Record<string, string>; logs: string[];
};

export type DemoStoredResult = {
  completed: true; completedAt: string; logs: string[];
  newJobs: 1; candidates: 3; proposals: 1;
};
