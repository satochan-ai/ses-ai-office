import type { AgentLayout, OfficePoint, OfficeZoneLayout } from "@/types/layout";
import type { OfficeDestination } from "@/types/movement";

export const officeZones: OfficeZoneLayout[] = [
  { id: "strategy", label: "営業戦略", caption: "PRIORITY & PROPOSAL", x: 2, y: 4, width: 30, height: 32 },
  { id: "analytics", label: "営業分析", caption: "INSIGHT LAB", x: 57, y: 4, width: 18, height: 32 },
  { id: "recruit", label: "採用", caption: "TALENT DESK", x: 77, y: 4, width: 21, height: 32 },
  { id: "search", label: "新規顧客開拓", caption: "OUTBOUND", x: 2, y: 64, width: 21, height: 32 },
  { id: "network", label: "BPアライアンス", caption: "PARTNER NETWORK", x: 25, y: 64, width: 20, height: 32 },
  { id: "matching", label: "マッチング", caption: "JOB × TALENT", x: 57, y: 64, width: 18, height: 32 },
  { id: "follow", label: "稼働フォロー", caption: "CARE LOUNGE", x: 77, y: 64, width: 21, height: 32 },
];

export const sharedPoints: Record<"handoff" | "meeting" | "reception", OfficePoint> = {
  reception: { x: 57, y: 15 }, handoff: { x: 52, y: 45 }, meeting: { x: 64, y: 45 },
};

export const agentLayouts: AgentLayout[] = [
  { agentId: "manager", appearance: "leader", desk: { x: 17, y: 24 }, destinations: { reception: sharedPoints.reception, analysis: { x: 66, y: 24 }, handoff: sharedPoints.handoff, meeting: { x: 61, y: 49 } } },
  { agentId: "analytics", appearance: "analyst", desk: { x: 66, y: 24 }, destinations: { analysis: { x: 61, y: 25 }, meeting: { x: 69, y: 49 } } },
  { agentId: "newbiz", appearance: "caller", desk: { x: 13, y: 78 }, destinations: { phone: { x: 18, y: 67 }, handoff: sharedPoints.handoff } },
  { agentId: "bp", appearance: "connector", desk: { x: 35, y: 78 }, destinations: { network: { x: 40, y: 70 }, handoff: sharedPoints.handoff } },
  { agentId: "matching", appearance: "matcher", desk: { x: 66, y: 78 }, destinations: { matching: { x: 61, y: 74 }, handoff: { x: 43, y: 56 }, meeting: { x: 69, y: 49 } } },
  { agentId: "recruit", appearance: "recruiter", desk: { x: 87, y: 24 }, destinations: { interview: { x: 80, y: 26 }, handoff: sharedPoints.handoff } },
  { agentId: "follow", appearance: "supporter", desk: { x: 87, y: 78 }, destinations: { consultation: { x: 81, y: 70 }, handoff: sharedPoints.handoff } },
];

export const instructionDestination: Record<string, OfficeDestination> = {
  manager: "handoff", analytics: "analysis", newbiz: "phone", bp: "network", matching: "matching", recruit: "interview", follow: "consultation",
};
