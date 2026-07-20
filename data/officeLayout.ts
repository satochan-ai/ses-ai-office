import type { AgentLayout, OfficePoint, OfficeZoneLayout } from "@/types/layout";
import type { OfficeDestination } from "@/types/movement";

export const officeZones: OfficeZoneLayout[] = [
  { id: "strategy", label: "営業戦略", caption: "PRIORITY & PROPOSAL", x: 2, y: 4, width: 27, height: 35 },
  { id: "analytics", label: "営業分析", caption: "INSIGHT LAB", x: 31, y: 4, width: 23, height: 35 },
  { id: "recruit", label: "採用", caption: "TALENT DESK", x: 70, y: 4, width: 28, height: 35 },
  { id: "search", label: "新規顧客開拓", caption: "OUTBOUND", x: 2, y: 57, width: 22, height: 39 },
  { id: "network", label: "BPアライアンス", caption: "PARTNER NETWORK", x: 26, y: 57, width: 22, height: 39 },
  { id: "matching", label: "マッチング", caption: "JOB × TALENT", x: 50, y: 57, width: 25, height: 39 },
  { id: "follow", label: "稼働フォロー", caption: "CARE LOUNGE", x: 77, y: 57, width: 21, height: 39 },
];

export const sharedPoints: Record<"handoff" | "meeting" | "reception", OfficePoint> = {
  reception: { x: 57, y: 15 }, handoff: { x: 52, y: 45 }, meeting: { x: 64, y: 45 },
};

export const agentLayouts: AgentLayout[] = [
  { agentId: "manager", appearance: "leader", desk: { x: 16, y: 24 }, destinations: { reception: sharedPoints.reception, analysis: { x: 42, y: 24 }, handoff: sharedPoints.handoff, meeting: { x: 60, y: 45 } } },
  { agentId: "analytics", appearance: "analyst", desk: { x: 43, y: 24 }, destinations: { analysis: { x: 42, y: 24 }, meeting: { x: 67, y: 45 } } },
  { agentId: "newbiz", appearance: "caller", desk: { x: 13, y: 79 }, destinations: { phone: { x: 19, y: 69 }, handoff: sharedPoints.handoff } },
  { agentId: "bp", appearance: "connector", desk: { x: 37, y: 79 }, destinations: { network: { x: 43, y: 69 }, handoff: sharedPoints.handoff } },
  { agentId: "matching", appearance: "matcher", desk: { x: 63, y: 79 }, destinations: { matching: { x: 57, y: 69 }, handoff: { x: 49, y: 45 }, meeting: { x: 68, y: 45 } } },
  { agentId: "recruit", appearance: "recruiter", desk: { x: 85, y: 24 }, destinations: { interview: { x: 76, y: 25 }, handoff: sharedPoints.handoff } },
  { agentId: "follow", appearance: "supporter", desk: { x: 88, y: 79 }, destinations: { consultation: { x: 82, y: 68 }, handoff: sharedPoints.handoff } },
];

export const instructionDestination: Record<string, OfficeDestination> = {
  manager: "handoff", analytics: "analysis", newbiz: "phone", bp: "network", matching: "matching", recruit: "interview", follow: "consultation",
};
