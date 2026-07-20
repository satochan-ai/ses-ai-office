"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { agentAnimationByStep } from "@/types/animation";
import { demoRouteByStep, deskPointByAgent, instructionRouteByAgent, officeRoutes, routePoints } from "@/data/officeRoutes";
import type { AgentAnimationMap } from "@/types/animation";
import type { DemoSpeed, DemoStatus } from "@/types/demo";
import type { FacingDirection, RoutedAgentMotion } from "@/types/route";

const agentIds = ["manager", "analytics", "newbiz", "bp", "matching", "recruit", "follow", "relation", "proposal", "contract", "knowledge"];
export type ManualRoute = { agentId: string; routeId: string } | null;

function direction(fromId: string, toId: string): FacingDirection {
  const from = routePoints[fromId]; const to = routePoints[toId];
  if (Math.abs(to.x - from.x) > Math.abs(to.y - from.y)) return to.x > from.x ? "right" : "left";
  return to.y > from.y ? "down" : "up";
}

export function useRouteMovement(stepId: number | undefined, demoStatus: DemoStatus, speed: DemoSpeed, instructionStates: AgentAnimationMap, manualRoute: ManualRoute = null) {
  const plans = useMemo(() => Object.fromEntries(agentIds.map(id => {
    const instruction = instructionStates[id];
    if (instruction) { const pair = instructionRouteByAgent[id]; return [id, instruction === "completed" ? pair?.[1] : pair?.[0]]; }
    if (manualRoute?.agentId === id) return [id, manualRoute.routeId];
    return [id, stepId ? demoRouteByStep[stepId]?.[id] : undefined];
  })), [instructionStates, manualRoute, stepId]);
  const planKey = JSON.stringify(plans); const [indices, setIndices] = useState<Record<string, number>>({}); const timer = useRef<number | null>(null);

  useEffect(() => { setIndices(Object.fromEntries(agentIds.map(id => [id, 0]))); }, [planKey]);
  useEffect(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    const hasInstruction = Object.keys(instructionStates).length > 0;
    if (demoStatus === "paused" || (!stepId && !hasInstruction && !manualRoute)) return;
    timer.current = window.setInterval(() => setIndices(current => {
      let changed = false; const next = { ...current };
      for (const id of agentIds) { const routeId = plans[id]; const route = routeId ? officeRoutes[routeId] : undefined; const max = route ? route.points.length - 1 : 0; if ((next[id] ?? 0) < max) { next[id] = (next[id] ?? 0) + 1; changed = true; } }
      return changed ? next : current;
    }), speed === "fast" ? 60 : 280);
    return () => { if (timer.current !== null) window.clearInterval(timer.current); timer.current = null; };
  }, [demoStatus, instructionStates, manualRoute, plans, speed, stepId]);

  return useMemo(() => Object.fromEntries(agentIds.map(id => {
    const routeId = plans[id]; const route = routeId ? officeRoutes[routeId] : undefined; const index = Math.min(indices[id] ?? 0, route ? route.points.length - 1 : 0); const pointId = route?.points[index] ?? deskPointByAgent[id]; const point = routePoints[pointId]; const interactionPoint = route?.interactionAt === undefined ? undefined : route.points[route.interactionAt]; const atInteraction = interactionPoint !== undefined && index >= (route?.interactionAt ?? 0) && pointId === interactionPoint; const atEnd = Boolean(route && index === route.points.length - 1); const nextPointId = route?.points[Math.min(index + 1, route.points.length - 1)] ?? pointId;
    const facing: FacingDirection = atInteraction && route?.purpose === "meeting" ? "seated" : atInteraction && route?.interactionTarget ? "person" : atEnd && route?.purpose === "return" ? "seated" : direction(pointId, nextPointId);
    const work = instructionStates[id] ?? (stepId ? agentAnimationByStep[stepId]?.[id] : undefined) ?? "idle";
    const state = route && !atEnd ? (atInteraction ? (route.purpose === "meeting" ? "meeting" : route.purpose === "handoff" ? "handingOff" : "working") : route.purpose === "return" ? "returning" : "walking") : work === "completed" ? "completed" : atInteraction ? (route?.purpose === "meeting" ? "meeting" : route?.purpose === "handoff" ? "handingOff" : "working") : "atDesk";
    return [id, { state, point, routeId, routeIndex: index, facing, work, interactionTarget: atInteraction ? route?.interactionTarget : undefined, interactionType: atInteraction ? route?.interactionType : undefined, interactionText: atInteraction ? route?.interactionText : undefined, seated: facing === "seated" || (!route && work === "idle"), floorId: point.floorId, inElevator: pointId === "elevator1F" || pointId === "elevator2F" } satisfies RoutedAgentMotion];
  })), [indices, instructionStates, plans, stepId]);
}
