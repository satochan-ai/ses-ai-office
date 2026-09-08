import type { V3AgentPlacement, V3Area, V3Corridor, V3FloorLayout, V3Furniture, V3Zone } from "@/types/officeV3Claude";
import { VIEWBOX, v3AgentPlacements, v3CentralTeamPlacements } from "./officeV3ClaudeLayout";

/** Step10: 1F FIELD OPERATIONS 専用レイアウト。 */
const FLOOR_ID = "1f" as const;
const base = [...v3AgentPlacements, ...v3CentralTeamPlacements];
const byAgent = (id: string) => base.find(placement => placement.agentId === id)!;

const zones: V3Zone[] = [
  { id: "f1-newbiz", name: "新規開拓", caption: "NEW BUSINESS", area: "north", bounds: { gx0: 2, gy0: 2, gx1: 9, gy1: 9 }, floorStyle: "carpet", tone: "slate", labelPosition: { gx: 5.8, gy: 6.2 } },
  { id: "f1-bp", name: "BP連携", caption: "BP ALLIANCE", area: "north", bounds: { gx0: 21, gy0: 2, gx1: 28, gy1: 9 }, floorStyle: "carpet", tone: "steel", labelPosition: { gx: 24.2, gy: 6.2 } },
  { id: "f1-matching", name: "マッチングハブ", caption: "MATCHING HUB", area: "center", bounds: { gx0: 11.5, gy0: 11.5, gx1: 18.5, gy1: 18.5 }, floorStyle: "stone", tone: "steel", labelPosition: { gx: 14.8, gy: 17.2 } },
  { id: "f1-recruit", name: "採用", caption: "RECRUITING", area: "south", bounds: { gx0: 2, gy0: 21, gx1: 9, gy1: 28 }, floorStyle: "carpet", tone: "moss", labelPosition: { gx: 5.8, gy: 25.2 } },
  { id: "f1-follow", name: "稼働フォロー", caption: "FOLLOW & CARE", area: "south", bounds: { gx0: 11.5, gy0: 21, gx1: 18.5, gy1: 28 }, floorStyle: "carpet", tone: "steel", labelPosition: { gx: 14.8, gy: 25.2 } },
  { id: "f1-relation", name: "顧客リレーション", caption: "CLIENT RELATION", area: "south", bounds: { gx0: 21, gy0: 21, gx1: 28, gy1: 28 }, floorStyle: "carpet", tone: "slate", labelPosition: { gx: 24.2, gy: 25.2 } },
];

const corridors: V3Corridor[] = [
  { id: "f1-west-spine", kind: "main", bounds: { gx0: 9, gy0: 2, gx1: 11.5, gy1: 28 }, label: "FIELD SPINE" },
  { id: "f1-east-spine", kind: "main", bounds: { gx0: 18.5, gy0: 2, gx1: 21, gy1: 28 } },
  { id: "f1-north-cross", kind: "main", bounds: { gx0: 9, gy0: 9, gx1: 21, gy1: 11.5 } },
  { id: "f1-south-cross", kind: "main", bounds: { gx0: 9, gy0: 18.5, gx1: 21, gy1: 21 } },
  { id: "f1-handoff-branch", kind: "branch", bounds: { gx0: 9, gy0: 13.8, gx1: 11.5, gy1: 15.3 }, label: "FIELD → QUALITY" },
];

const furniture: V3Furniture[] = [
  { id: "f1-m-compare", type: "wallScreen", zoneId: "f1-matching", gx: 12.2, gy: 12.1, width: 2.8, height: .5, facing: "se", label: "PROJECT / CANDIDATE / SCORE", accent: "#5cc5ca" },
  { id: "f1-m-monitor", type: "monitorBank", zoneId: "f1-matching", gx: 15.8, gy: 12.2, width: 2.4, height: .6, facing: "sw", label: "MATCH / PRIORITY", accent: "#65cbd0" },
  { id: "f1-m-console", type: "desk", zoneId: "f1-matching", gx: 14.8, gy: 15.1, width: 2.6, height: 1.3, facing: "se", label: "MATCHING HUB", variant: "darkConsole" },
  { id: "f1-m-table", type: "roundTable", zoneId: "f1-matching", gx: 16.2, gy: 16.7, width: 1.8, height: 1.8, facing: "se", label: "COMPARISON TABLE" },
  { id: "f1-m-chair-a", type: "chair", zoneId: "f1-matching", gx: 15.0, gy: 16.6, width: 1, height: 1, facing: "se" },
  { id: "f1-m-chair-b", type: "chair", zoneId: "f1-matching", gx: 17.6, gy: 16.6, width: 1, height: 1, facing: "nw" },
  { id: "f1-m-candidate", type: "terminal", zoneId: "f1-matching", gx: 12.6, gy: 16.7, width: 1, height: 1, facing: "se", label: "CANDIDATE QUEUE" },
  { id: "f1-m-project", type: "terminal", zoneId: "f1-matching", gx: 17.7, gy: 14.1, width: 1, height: 1, facing: "sw", label: "PROJECT QUEUE" },
  { id: "f1-n-desk", type: "desk", zoneId: "f1-newbiz", gx: 3.0, gy: 5.2, width: 3, height: 1.5, facing: "se", label: "OUTREACH DESK" },
  { id: "f1-n-monitor", type: "monitorBank", zoneId: "f1-newbiz", gx: 3.0, gy: 3.3, width: 2.8, height: .6, facing: "se", label: "TARGET / OUTREACH", accent: "#5e9db0" },
  { id: "f1-n-board", type: "whiteboard", zoneId: "f1-newbiz", gx: 6.7, gy: 3.7, width: 2, height: .6, facing: "sw", label: "PIPELINE / RETRY" },
  { id: "f1-n-terminal", type: "terminal", zoneId: "f1-newbiz", gx: 7.2, gy: 7.0, width: 1, height: 1, facing: "sw", label: "PRIORITY" },
  { id: "f1-b-desk", type: "desk", zoneId: "f1-bp", gx: 22.0, gy: 5.2, width: 3, height: 1.5, facing: "sw", label: "ALLIANCE DESK" },
  { id: "f1-b-monitor", type: "monitorBank", zoneId: "f1-bp", gx: 22.0, gy: 3.3, width: 2.8, height: .6, facing: "sw", label: "PARTNER / PEOPLE", accent: "#5f9eb3" },
  { id: "f1-b-board", type: "whiteboard", zoneId: "f1-bp", gx: 26.7, gy: 3.7, width: 2, height: .6, facing: "se", label: "ALLIANCE / PROJECTS" },
  { id: "f1-b-terminal", type: "terminal", zoneId: "f1-bp", gx: 26.8, gy: 7.0, width: 1, height: 1, facing: "se", label: "NETWORK" },
  { id: "f1-r-desk", type: "desk", zoneId: "f1-recruit", gx: 3.0, gy: 23.0, width: 3, height: 1.5, facing: "ne", label: "RECRUITING DESK" },
  { id: "f1-r-monitor", type: "monitorBank", zoneId: "f1-recruit", gx: 3.0, gy: 25.5, width: 2.8, height: .6, facing: "ne", label: "SOURCING / SCOUT", accent: "#63a8b0" },
  { id: "f1-r-board", type: "whiteboard", zoneId: "f1-recruit", gx: 6.8, gy: 22.2, width: 2, height: .6, facing: "nw", label: "CANDIDATE / SCREENING" },
  { id: "f1-r-cabinet", type: "cabinet", zoneId: "f1-recruit", gx: 7.4, gy: 26.2, width: 1.5, height: 1.2, facing: "nw", label: "INTERVIEW" },
  { id: "f1-f-desk", type: "desk", zoneId: "f1-follow", gx: 13.0, gy: 23.0, width: 3, height: 1.5, facing: "ne", label: "FOLLOW DESK" },
  { id: "f1-f-monitor", type: "monitorBank", zoneId: "f1-follow", gx: 13.0, gy: 25.5, width: 2.8, height: .6, facing: "ne", label: "STATUS / RETENTION", accent: "#65aaa4" },
  { id: "f1-f-terminal", type: "terminal", zoneId: "f1-follow", gx: 17.0, gy: 22.6, width: 1, height: 1, facing: "nw", label: "RISK / CARE" },
  { id: "f1-f-board", type: "whiteboard", zoneId: "f1-follow", gx: 17.0, gy: 26.0, width: 2, height: .6, facing: "nw", label: "UPDATE" },
  { id: "f1-c-desk", type: "desk", zoneId: "f1-relation", gx: 22.0, gy: 23.0, width: 3, height: 1.5, facing: "nw", label: "RELATION DESK" },
  { id: "f1-c-monitor", type: "monitorBank", zoneId: "f1-relation", gx: 22.0, gy: 25.5, width: 2.8, height: .6, facing: "nw", label: "CLIENT HISTORY", accent: "#6b9dad" },
  { id: "f1-c-board", type: "whiteboard", zoneId: "f1-relation", gx: 26.7, gy: 22.6, width: 2, height: .6, facing: "se", label: "OPPORTUNITY / NEXT ACTION" },
  { id: "f1-c-terminal", type: "terminal", zoneId: "f1-relation", gx: 26.8, gy: 26.2, width: 1, height: 1, facing: "se", label: "EXISTING CLIENT" },
  { id: "f1-handoff", type: "dataRiser", zoneId: "f1-matching", gx: 9.6, gy: 14.6, width: 1, height: 1, facing: "se", label: "1F → 2F → 3F", accent: "#63c1c7" },
];

const placements: V3AgentPlacement[] = [
  { ...byAgent("newbiz"), gx: 5.8, gy: 7.8, facing: "nw", labelPosition: "top", deskPosition: { gx: 3, gy: 5.2 } },
  { ...byAgent("bp"), gx: 23.8, gy: 7.9, facing: "sw", labelPosition: "top", deskPosition: { gx: 22, gy: 5.2 } },
  { ...byAgent("matching"), gx: 14.8, gy: 14, facing: "se", labelPosition: "bottom", deskPosition: { gx: 14.8, gy: 15.1 } },
  { ...byAgent("recruit"), gx: 5.8, gy: 22.4, facing: "ne", labelPosition: "top", deskPosition: { gx: 3, gy: 23 } },
  { ...byAgent("follow"), gx: 14.7, gy: 23.1, facing: "ne", labelPosition: "top", deskPosition: { gx: 13, gy: 23 } },
  { ...byAgent("relation"), gx: 24.2, gy: 22.4, facing: "nw", labelPosition: "right", deskPosition: { gx: 22, gy: 23 } },
];

const areas: readonly V3Area[] = [
  { id: "all", label: "全景", caption: "1F FIELD OPERATIONS", scale: 1, cx: 0, cy: 303 },
  { id: "north", label: "北側", caption: "新規開拓・BP連携", scale: 1.8, cx: 0, cy: 250 },
  { id: "center", label: "中央", caption: "MATCHING HUB・HANDOFF", scale: 1.8, cx: 0, cy: 430 },
  { id: "south", label: "南側", caption: "採用・フォロー・顧客", scale: 1.65, cx: 0, cy: 570 },
];

export const v3Layout1f: V3FloorLayout = {
  floorId: FLOOR_ID,
  zones,
  corridors,
  furniture,
  placements,
  viewBox: VIEWBOX,
  areas,
  floorTint: "#304957",
};
