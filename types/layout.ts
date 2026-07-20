import type { OfficeAgent } from "@/types/office";
import type { OfficeDestination } from "@/types/movement";

export type OfficePoint = { x: number; y: number };
export type OfficeZoneLayout = {
  id: OfficeAgent["decoration"];
  floorId: "1f" | "2f";
  label: string;
  caption: string;
  x: number; y: number; width: number; height: number;
};
export type AgentLayout = {
  agentId: string;
  floorId: "1f" | "2f";
  desk: OfficePoint;
  destinations: Partial<Record<OfficeDestination, OfficePoint>>;
  appearance: "leader" | "analyst" | "caller" | "connector" | "matcher" | "recruiter" | "supporter" | "relationship" | "facilitator" | "controller" | "educator";
};
