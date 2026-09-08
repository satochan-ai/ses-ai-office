import type { V3AgentPlacement, V3Area, V3Corridor, V3FloorLayout, V3Furniture, V3Zone } from "@/types/officeV3Claude";
import { VIEWBOX, v3AgentPlacements, v3CentralTeamPlacements } from "./officeV3ClaudeLayout";

/** Step8: 2F SUPPORT & CONTROL 専用レイアウト。 */
const FLOOR_ID = "2f" as const;
const base = [...v3AgentPlacements, ...v3CentralTeamPlacements];
const byAgent = (id: string) => base.find(p => p.agentId === id)!;

const zones: V3Zone[] = [
  { id: "f2-analytics", name: "分析", caption: "ANALYTICS", area: "north", bounds: { gx0: 2, gy0: 4, gx1: 9, gy1: 11 }, floorStyle: "carpet", tone: "steel", labelPosition: { gx: 5.2, gy: 10.1 } },
  { id: "f2-proposal", name: "提案支援", caption: "PROPOSAL SUPPORT", area: "north", bounds: { gx0: 21, gy0: 4, gx1: 28, gy1: 11 }, floorStyle: "carpet", tone: "slate", labelPosition: { gx: 24.1, gy: 10.1 } },
  { id: "f2-quality", name: "品質ゲート", caption: "QUALITY GATE", area: "center", bounds: { gx0: 11.5, gy0: 11.5, gx1: 18.5, gy1: 18.5 }, floorStyle: "stone", tone: "steel", labelPosition: { gx: 14, gy: 17.3 } },
  { id: "f2-contract", name: "契約統制", caption: "CONTRACT CONTROL", area: "south", bounds: { gx0: 21, gy0: 19, gx1: 28, gy1: 26 }, floorStyle: "carpet", tone: "slate", labelPosition: { gx: 24, gy: 25.2 } },
  { id: "f2-knowledge", name: "ナレッジ", caption: "KNOWLEDGE", area: "south", bounds: { gx0: 2, gy0: 19, gx1: 9, gy1: 26 }, floorStyle: "carpet", tone: "steel", labelPosition: { gx: 5, gy: 25.2 } },
];

const corridors: V3Corridor[] = [
  { id: "f2-west-spine", kind: "main", bounds: { gx0: 9, gy0: 4, gx1: 11.5, gy1: 26 }, label: "REVIEW SPINE" },
  { id: "f2-east-spine", kind: "main", bounds: { gx0: 18.5, gy0: 4, gx1: 21, gy1: 26 } },
  { id: "f2-north-cross", kind: "main", bounds: { gx0: 9, gy0: 11, gx1: 21, gy1: 11.5 } },
  { id: "f2-south-cross", kind: "main", bounds: { gx0: 9, gy0: 18.5, gx1: 21, gy1: 19 } },
  { id: "f2-handoff-branch", kind: "branch", bounds: { gx0: 9, gy0: 13.8, gx1: 11.5, gy1: 15.3 }, label: "1F → QUALITY → 3F" },
];

const furniture: V3Furniture[] = [
  { id: "f2-q-desk", type: "desk", zoneId: "f2-quality", gx: 14.8, gy: 15.2, width: 2.5, height: 1.3, facing: "se", variant: "darkConsole", label: "REVIEW DESK" },
  { id: "f2-q-screen", type: "wallScreen", zoneId: "f2-quality", gx: 13, gy: 12, width: 3, height: .5, facing: "se", accent: "#49bdc7", label: "QUALITY SCORE" },
  { id: "f2-q-board", type: "whiteboard", zoneId: "f2-quality", gx: 17.2, gy: 12.2, width: 2.3, height: .6, facing: "sw", variant: "qualityBoard", label: "PASS / REVIEW / RETURN" },
  { id: "f2-q-queue", type: "terminal", zoneId: "f2-quality", gx: 13, gy: 16.7, width: 1, height: 1, facing: "se", label: "REVIEW QUEUE" },
  { id: "f2-q-table", type: "roundTable", zoneId: "f2-quality", gx: 16.4, gy: 16.4, width: 1.7, height: 1.7, facing: "se", label: "SHARED REVIEW" },
  { id: "f2-q-chair-a", type: "chair", zoneId: "f2-quality", gx: 15.1, gy: 16.4, width: 1, height: 1, facing: "se" },
  { id: "f2-q-chair-b", type: "chair", zoneId: "f2-quality", gx: 17.7, gy: 16.4, width: 1, height: 1, facing: "nw" },
  { id: "f2-a-monitor", type: "monitorBank", zoneId: "f2-analytics", gx: 3, gy: 4.8, width: 2.8, height: .6, facing: "se", accent: "#6babc5", label: "KPI / FUNNEL / UTILIZATION" },
  { id: "f2-a-desk", type: "desk", zoneId: "f2-analytics", gx: 3, gy: 5.5, width: 3, height: 1.6, facing: "se", label: "ANALYSIS DESK" },
  { id: "f2-a-screen", type: "wallScreen", zoneId: "f2-analytics", gx: 7.3, gy: 7.1, width: 2, height: .5, facing: "sw", accent: "#6babc5", label: "ALERT" },
  { id: "f2-p-monitor", type: "monitorBank", zoneId: "f2-proposal", gx: 22, gy: 4.8, width: 2.6, height: .6, facing: "se", accent: "#73a9c1", label: "PROPOSAL REVIEW" },
  { id: "f2-p-desk", type: "desk", zoneId: "f2-proposal", gx: 22, gy: 5.5, width: 3.1, height: 1.6, facing: "se", label: "PROPOSAL SUPPORT" },
  { id: "f2-p-board", type: "whiteboard", zoneId: "f2-proposal", gx: 26.7, gy: 7.3, width: 2, height: .6, facing: "sw", label: "QUESTIONS / NG" },
  { id: "f2-c-desk", type: "desk", zoneId: "f2-contract", gx: 22, gy: 20, width: 3, height: 1.6, facing: "se", label: "CONTRACT CONTROL" },
  { id: "f2-c-screen", type: "wallScreen", zoneId: "f2-contract", gx: 22, gy: 19.4, width: 2.6, height: .5, facing: "se", accent: "#7899b2", label: "RENEWAL / BILLING / RISK" },
  { id: "f2-c-terminal", type: "terminal", zoneId: "f2-contract", gx: 26.5, gy: 20.5, width: 1, height: 1, facing: "sw", label: "PAYMENT" },
  { id: "f2-c-cabinet", type: "cabinet", zoneId: "f2-contract", gx: 26.5, gy: 23.7, width: 1.5, height: 1.2, facing: "sw", label: "CONTROL FILES" },
  { id: "f2-k-table", type: "roundTable", zoneId: "f2-knowledge", gx: 5, gy: 21.6, width: 2, height: 2, facing: "se", label: "KNOWLEDGE SYNC" },
  { id: "f2-k-board", type: "whiteboard", zoneId: "f2-knowledge", gx: 2.6, gy: 20, width: 2.2, height: .6, facing: "se", label: "CASES / RULES / TEMPLATE / LESSONS" },
  { id: "f2-k-shelf", type: "shelf", zoneId: "f2-knowledge", gx: 8, gy: 23.8, width: 1.8, height: 1, facing: "nw", label: "REFERENCE" },
  { id: "f2-k-terminal", type: "terminal", zoneId: "f2-knowledge", gx: 7.2, gy: 20.4, width: 1, height: 1, facing: "sw", label: "KNOWLEDGE UPDATE" },
  { id: "f2-handoff", type: "dataRiser", zoneId: "f2-quality", gx: 9.6, gy: 14.6, width: 1, height: 1, facing: "se", accent: "#55b8c5", label: "1F → 2F → 3F" },
];

const placements: V3AgentPlacement[] = [
  { ...byAgent("analytics"), gx: 6.2, gy: 8, zoneId: "f2-analytics", facing: "nw", labelPosition: "top", deskPosition: { gx: 3, gy: 5.5 } },
  { ...byAgent("proposal"), gx: 23, gy: 8.3, zoneId: "f2-proposal", facing: "sw", labelPosition: "right", deskPosition: { gx: 22, gy: 5.5 } },
  { ...byAgent("quality"), gx: 14.8, gy: 14, zoneId: "f2-quality", facing: "se", labelPosition: "bottom", deskPosition: { gx: 14.8, gy: 15.2 }, appearance: { ...byAgent("quality").appearance, gazeTilt: -17 } },
  { ...byAgent("contract"), gx: 24.3, gy: 22.3, zoneId: "f2-contract", facing: "nw", labelPosition: "right", deskPosition: { gx: 22, gy: 20 } },
  { ...byAgent("knowledge"), gx: 5.8, gy: 22.4, zoneId: "f2-knowledge", facing: "ne", labelPosition: "top", deskPosition: { gx: 5, gy: 21.6 } },
];

const areas: readonly V3Area[] = [
  { id: "all", label: "全景", caption: "2F SUPPORT & CONTROL", scale: 1, cx: 0, cy: 303 },
  { id: "north", label: "北側", caption: "分析・提案支援", scale: 1.8, cx: 0, cy: 250 },
  { id: "center", label: "中央", caption: "QUALITY GATE", scale: 1.8, cx: 0, cy: 430 },
  { id: "south", label: "南側", caption: "契約・ナレッジ・HANDOFF", scale: 1.65, cx: 0, cy: 570 },
];

export const v3Layout2f: V3FloorLayout = { floorId: FLOOR_ID, zones, corridors, furniture, placements, viewBox: VIEWBOX, areas, floorTint: "#273444" };
