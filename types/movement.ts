import type { AgentAnimationState } from "@/types/animation";

export type AgentMovementState = "atDesk" | "walking" | "meeting" | "handingOff" | "working" | "returning" | "completed";
export type OfficeDestination = "desk" | "reception" | "analysis" | "phone" | "network" | "matching" | "interview" | "consultation" | "handoff" | "meeting";

export type AgentMotion = {
  state: AgentMovementState;
  destination: OfficeDestination;
  work: AgentAnimationState;
};
