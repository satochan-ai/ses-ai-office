import type { AgentAnimationState } from "@/types/animation";
import type { AgentMovementState } from "@/types/movement";
import type { OfficePoint } from "@/types/layout";

export type FacingDirection = "up" | "down" | "left" | "right" | "person" | "seated";
export type RoutePurpose = "reception" | "confirm" | "handoff" | "meeting" | "task" | "return";
export type InteractionType = "reviewCard" | "sharedScreen" | "deliverFile" | "compareCandidates" | "writeRecommendation" | "task" | "complete";

export type RoutePoint = OfficePoint & { id: string; label: string };
export type AgentRoute = {
  id: string;
  points: string[];
  purpose: RoutePurpose;
  interactionAt?: number;
  interactionTarget?: string;
  interactionType?: InteractionType;
  interactionText?: string;
};

export type RoutedAgentMotion = {
  state: AgentMovementState;
  point: RoutePoint;
  routeId?: string;
  routeIndex: number;
  facing: FacingDirection;
  work: AgentAnimationState;
  interactionTarget?: string;
  interactionType?: InteractionType;
  interactionText?: string;
  seated: boolean;
};
