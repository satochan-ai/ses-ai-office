import type { V2AgentLayout, V2Furniture, V2Point, V2Zone } from "@/types/officeV2";

export const isoProject = ({ x, y }: V2Point) => ({
  left: 50 + (x - y) * 0.43,
  top: 7 + (x + y) * 0.31,
});

export const v2Zones: V2Zone[] = [
  { id: "insight", label: "INSIGHT & KNOWLEDGE", caption: "分析・教育", tone: "blue", corners: [{ x: 5, y: 5 }, { x: 44, y: 5 }, { x: 44, y: 32 }, { x: 5, y: 32 }] },
  { id: "relations", label: "CLIENT OPERATIONS", caption: "顧客・契約", tone: "sand", corners: [{ x: 55, y: 5 }, { x: 91, y: 5 }, { x: 91, y: 32 }, { x: 55, y: 32 }] },
  { id: "outbound", label: "GROWTH STUDIO", caption: "新規・BP開拓", tone: "rose", corners: [{ x: 5, y: 68 }, { x: 42, y: 68 }, { x: 42, y: 95 }, { x: 5, y: 95 }] },
  { id: "talent", label: "TALENT OPERATIONS", caption: "マッチング・採用・フォロー", tone: "violet", corners: [{ x: 57, y: 65 }, { x: 91, y: 65 }, { x: 91, y: 94 }, { x: 57, y: 94 }] },
  { id: "proposal", label: "PROPOSAL LAB", caption: "提案・面談支援", tone: "sage", corners: [{ x: 37, y: 68 }, { x: 63, y: 68 }, { x: 63, y: 96 }, { x: 37, y: 96 }] },
];

export const v2Furniture: V2Furniture[] = [
  { id: "analytics-screens", kind: "screens", x: 18, y: 13, label: "PIPELINE", layer: "back", accent: "#4c7899" },
  { id: "analytics-desk", kind: "desk", x: 24, y: 25, label: "分析席", accent: "#4c7899" },
  { id: "knowledge-shelf", kind: "shelf", x: 8, y: 25, label: "ナレッジ", layer: "back", accent: "#6f8e75" },
  { id: "knowledge-board", kind: "board", x: 34, y: 10, label: "LEARNING", layer: "back", accent: "#6f8e75" },
  { id: "relation-desk", kind: "desk", x: 65, y: 17, label: "顧客履歴", accent: "#557c9b" },
  { id: "contract-shelf", kind: "shelf", x: 83, y: 13, label: "契約書", layer: "back", accent: "#a27e58" },
  { id: "contract-desk", kind: "desk", x: 78, y: 28, label: "更新期限", accent: "#a27e58" },
  { id: "manager-command", kind: "command", x: 50, y: 42, label: "AI COMMAND", accent: "#234e70" },
  { id: "meeting", kind: "meeting", x: 53, y: 56, label: "SYNC TABLE", layer: "front", accent: "#487e72" },
  { id: "newbiz-phone", kind: "phone", x: 13, y: 82, label: "CALL", accent: "#b56c67" },
  { id: "newbiz-desk", kind: "desk", x: 24, y: 76, label: "企業リスト", accent: "#b56c67" },
  { id: "bp-network", kind: "network", x: 34, y: 88, label: "BP NETWORK", accent: "#a36b89" },
  { id: "matching-desk", kind: "cards", x: 66, y: 76, label: "JOB × TALENT", accent: "#755f9e" },
  { id: "recruit-desk", kind: "desk", x: 83, y: 74, label: "候補者", accent: "#b9824d" },
  { id: "follow-sofa", kind: "sofa", x: 79, y: 91, label: "CARE", layer: "front", accent: "#588c82" },
  { id: "proposal-board", kind: "board", x: 47, y: 79, label: "推薦文", layer: "back", accent: "#668b72" },
  { id: "proposal-desk", kind: "desk", x: 50, y: 90, label: "提案支援", accent: "#668b72" },
  { id: "reception", kind: "reception", x: 10, y: 49, label: "NEW INBOX", accent: "#4c7899" },
  { id: "plant-a", kind: "plant", x: 4, y: 39, layer: "front" },
  { id: "plant-b", kind: "plant", x: 90, y: 43, layer: "front" },
  { id: "plant-c", kind: "plant", x: 88, y: 95, layer: "front" },
];

export const v2Agents: V2AgentLayout[] = [
  { agentId: "manager", x: 50, y: 45, labelDy: 1, speechSide: "center", hair: "#202c3c", outfit: "#244f75", skin: "#e9bd98", accessory: "tablet" },
  { agentId: "analytics", x: 26, y: 27, labelDx: 7, speechSide: "right", hair: "#3b2c2a", outfit: "#567f9b", skin: "#f0c7a6", accessory: "glasses" },
  { agentId: "knowledge", x: 12, y: 27, labelDx: -5, speechSide: "right", hair: "#754b38", outfit: "#718d72", skin: "#dba77f", accessory: "clipboard" },
  { agentId: "relation", x: 65, y: 22, labelDx: -7, speechSide: "left", hair: "#2d2426", outfit: "#587d92", skin: "#e2b18c", accessory: "headset" },
  { agentId: "contract", x: 79, y: 31, labelDx: -10, labelDy: 2, speechSide: "left", hair: "#554139", outfit: "#8d725b", skin: "#f0c8aa", accessory: "glasses" },
  { agentId: "newbiz", x: 24, y: 78, labelDx: -8, speechSide: "right", hair: "#402f28", outfit: "#ae6966", skin: "#e5b28c", accessory: "headset" },
  { agentId: "bp", x: 35, y: 91, labelDx: 7, labelDy: 2, speechSide: "right", hair: "#242a33", outfit: "#8f6381", skin: "#c98f6f", accessory: "tablet" },
  { agentId: "matching", x: 67, y: 79, labelDx: -9, labelDy: -1, speechSide: "left", hair: "#594038", outfit: "#6f5c95", skin: "#efc2a0", accessory: "tablet" },
  { agentId: "recruit", x: 84, y: 76, labelDx: 10, labelDy: -2, speechSide: "left", hair: "#8a5b3e", outfit: "#b17a49", skin: "#f3c9a7", accessory: "clipboard" },
  { agentId: "follow", x: 77, y: 92, labelDx: 11, labelDy: 3, speechSide: "left", hair: "#29272b", outfit: "#4d8179", skin: "#dba47f", accessory: "none" },
  { agentId: "proposal", x: 51, y: 92, labelDx: -11, labelDy: 2, speechSide: "right", hair: "#5e463d", outfit: "#64856e", skin: "#e8b993", accessory: "glasses" },
];
