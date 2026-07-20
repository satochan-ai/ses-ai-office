import type { OfficeAgent } from "@/types/office";

export type AgentAnimationState = "idle" | "working" | "analyzing" | "matching" | "typing" | "calling" | "reviewing" | "completed";
export type AgentAnimationMap = Partial<Record<string, AgentAnimationState>>;

export const agentAnimationByStep: Record<number, AgentAnimationMap> = {
  1: { manager: "reviewing" },
  2: { manager: "reviewing", analytics: "analyzing" },
  3: { matching: "matching" },
  4: { matching: "reviewing" },
  5: { manager: "reviewing" },
  6: { manager: "typing", matching: "typing" },
  7: { manager: "completed" },
};

export function animationForAgent(agent: OfficeAgent, stepId?: number, instructed = false, complete = false): AgentAnimationState {
  if (complete) return "completed";
  if (stepId) return agentAnimationByStep[stepId]?.[agent.id] ?? "idle";
  if (!instructed) return "idle";
  return agent.decoration === "analytics" ? "analyzing" : agent.decoration === "matching" ? "matching" : agent.decoration === "search" ? "calling" : agent.decoration === "strategy" || agent.decoration === "recruit" || agent.decoration === "proposal" || agent.decoration === "knowledge" ? "typing" : agent.decoration === "follow" || agent.decoration === "relation" || agent.decoration === "contract" ? "reviewing" : "working";
}
