import type { OfficeAgent } from "@/types/office";
import type { OfficeDestination } from "@/types/movement";

export type OfficePoint = { x: number; y: number };
export type OfficeZoneLayout = {
  id: OfficeAgent["decoration"];
  label: string;
  caption: string;
  x: number; y: number; width: number; height: number;
};
export type AgentLayout = {
  agentId: string;
  desk: OfficePoint;
  destinations: Partial<Record<OfficeDestination, OfficePoint>>;
  appearance: "leader" | "analyst" | "caller" | "connector" | "matcher" | "recruiter" | "supporter";
};
