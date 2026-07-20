"use client";

import { useMemo } from "react";
import { agentAnimationByStep } from "@/types/animation";
import { instructionDestination } from "@/data/officeLayout";
import type { AgentAnimationMap } from "@/types/animation";
import type { AgentMotion, OfficeDestination } from "@/types/movement";

const demoDestinations: Record<number, Partial<Record<string, OfficeDestination>>> = {
  1: { manager: "reception" },
  2: { manager: "analysis", analytics: "analysis" },
  3: { matching: "matching" },
  4: { matching: "handoff" },
  5: { manager: "handoff" },
  6: { manager: "meeting", matching: "meeting" },
  7: { manager: "desk", matching: "desk", analytics: "desk" },
};

export function useAgentMovement(stepId: number | undefined, instructionStates: AgentAnimationMap) {
  return useMemo(() => {
    const ids = ["manager", "analytics", "newbiz", "bp", "matching", "recruit", "follow"];
    return Object.fromEntries(ids.map(id => {
      const instruction = instructionStates[id];
      const demoWork = stepId ? agentAnimationByStep[stepId]?.[id] : undefined;
      const work = instruction ?? demoWork ?? "idle";
      const destination = instruction ? instructionDestination[id] : stepId ? demoDestinations[stepId]?.[id] : undefined;
      const state: AgentMotion["state"] = work === "completed" ? "completed" : destination === "meeting" ? "meeting" : destination === "handoff" ? "handingOff" : destination ? "working" : "atDesk";
      return [id, { state, destination: destination ?? "desk", work } satisfies AgentMotion];
    })) as Record<string, AgentMotion>;
  }, [instructionStates, stepId]);
}
