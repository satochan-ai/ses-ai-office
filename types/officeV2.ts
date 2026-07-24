export type V2Point = { x: number; y: number };
export type V2Zone = {
  id: string;
  label: string;
  caption: string;
  tone: "blue" | "sage" | "sand" | "rose" | "violet";
  corners: [V2Point, V2Point, V2Point, V2Point];
};
export type V2FurnitureKind =
  | "desk" | "command" | "screens" | "shelf" | "phone" | "network"
  | "cards" | "sofa" | "board" | "meeting" | "reception" | "plant";
export type V2Furniture = {
  id: string;
  kind: V2FurnitureKind;
  x: number;
  y: number;
  label?: string;
  layer?: "back" | "front";
  accent?: string;
};
export type V2AgentLayout = {
  agentId: string;
  x: number;
  y: number;
  labelDx?: number;
  labelDy?: number;
  speechSide?: "left" | "center" | "right";
  hair: string;
  outfit: string;
  skin: string;
  accessory: "glasses" | "headset" | "tablet" | "clipboard" | "none";
};
export type V2Route = {
  id: string;
  label: string;
  agentId: string;
  points: V2Point[];
  speech: string;
  targetId?: string;
  handoff?: string;
};
