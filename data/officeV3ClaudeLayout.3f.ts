import type { V3AgentPlacement, V3Area, V3Corridor, V3FloorLayout, V3Furniture, V3Zone } from "@/types/officeV3Claude";
import { VIEWBOX, v3AgentPlacements, v3CentralTeamPlacements, v3HumanSeat } from "./officeV3ClaudeLayout";

/**
 * Step6: 3F「経営・統括フロア / DECISION FLOOR」本実装。
 *
 * base の zones(9) / corridors / furniture(89) 参照を廃止し、3F専用に定義する。
 * 1F/2F/all は無変更（data/officeV3ClaudeLayout.1f.ts / .2f.ts / facade は触らない）。
 *
 * コンセプト：意思決定フロア。静か・人物密度は低い・情報密度は高い・少し未来感。
 * 豪華な社長室／玉座／SF宇宙船／光柱は禁止。
 *
 * 構図（逆三角形）：
 *              [人間責任者席] ← 最奥・北中央・低ダイス・金アクセント
 *        [AI営業Mgr]   [AI経営参謀]
 *              [Decision Table]   ／  西端に Vertical Handoff（情報シャフト）
 *
 * 人物・HumanSeat は 3F専用座標。base の placement / v3HumanSeat は不変（spread で複製）。
 */
const FLOOR_ID = "3f" as const;

/* ---- ゾーン（9→3）。床全面は floorTint（濃色）でダーク化し、部署色は塗らない。 ---- */
const zones: V3Zone[] = [
  {
    id: "f3-decision", name: "意思決定", caption: "FINAL DECISION", area: "north",
    bounds: { gx0: 9, gy0: 7, gx1: 16, gy1: 11.5 },
    floorStyle: "wood", tone: "amber", labelPosition: { gx: 12.4, gy: 8.4 },
  },
  {
    id: "f3-command", name: "経営・統括", caption: "EXECUTIVE COMMAND", area: "center",
    bounds: { gx0: 7.5, gy0: 11.5, gx1: 21, gy1: 18 },
    floorStyle: "carpet", tone: "steel", labelPosition: { gx: 14.8, gy: 17.2 },
  },
  {
    id: "f3-handoff", name: "縦の受け渡し", caption: "HANDOFF", area: "south",
    bounds: { gx0: 9, gy0: 11, gx1: 10.8, gy1: 18 },
    floorStyle: "stone", tone: "slate", labelPosition: { gx: 9.9, gy: 14.4 },
  },
];

const corridors: V3Corridor[] = [
  { id: "f3-spine", kind: "main", bounds: { gx0: 9, gy0: 7, gx1: 10.8, gy1: 19 }, label: "HANDOFF SPINE" },
];

/* ---- 家具（13）。base の 89個は一切残さない。plant×1 / lamp×0。
   「少ない＝未完成」に見えないよう、家具ではなく構図・床(floorTint)・夜景・余白で完成度を出す。 ---- */
const furniture: V3Furniture[] = [
  /* Human Decision Zone */
  { id: "f3-hd-monitor", type: "wallScreen", zoneId: "f3-decision", gx: 10.5, gy: 7.5, width: 3.0, height: 0.6, facing: "se", label: "意思決定モニター（Dashboard の物理的入口）", accent: "#7fb8cf" },
  { id: "f3-hd-riskboard", type: "whiteboard", zoneId: "f3-decision", gx: 13.6, gy: 8.0, width: 1.8, height: 0.5, facing: "sw", label: "リスク一覧" },
  { id: "f3-hd-queue", type: "terminal", zoneId: "f3-decision", gx: 12.4, gy: 9.4, width: 1.0, height: 1.0, facing: "se", label: "承認キュー" },

  /* Command Zone（AI営業Mgr） */
  { id: "f3-cmd-wall", type: "monitorBank", zoneId: "f3-command", gx: 8.5, gy: 12.5, width: 2.8, height: 0.6, facing: "se", label: "全社稼働状況・本日の優先順位・営業／採用／稼働", accent: "#7fb8cf" },
  { id: "f3-cmd-console", type: "desk", zoneId: "f3-command", gx: 9.8, gy: 14.0, width: 2.4, height: 1.2, facing: "se", label: "アクションキュー（タブレットドック）", variant: "darkConsole" },
  { id: "f3-cmd-queue", type: "terminal", zoneId: "f3-command", gx: 8.3, gy: 14.9, width: 1.0, height: 1.0, facing: "se", label: "配分キュー" },

  /* Strategy Zone（AI経営参謀・Command 側より控えめ） */
  { id: "f3-str-board", type: "whiteboard", zoneId: "f3-command", gx: 18.6, gy: 11.4, width: 2.2, height: 0.6, facing: "sw", label: "経営サマリー／優先度マトリクス／リスク・機会／翌週重点／What-if", variant: "strategyBoard" },
  { id: "f3-str-note", type: "terminal", zoneId: "f3-command", gx: 18.0, gy: 12.0, width: 1.0, height: 1.0, facing: "sw", label: "翌週重点テーマ" },

  /* Decision Table（木材はここにだけ少量） */
  { id: "f3-decision-table", type: "roundTable", zoneId: "f3-command", gx: 12.5, gy: 15.0, width: 2.0, height: 2.0, facing: "se", label: "判断テーブル（判断案A/B・重要案件・緊急判断・人間承認）" },
  { id: "f3-dt-chair-a", type: "chair", zoneId: "f3-command", gx: 13.6, gy: 14.2, width: 1, height: 1, facing: "nw" },
  { id: "f3-dt-chair-b", type: "chair", zoneId: "f3-command", gx: 11.6, gy: 15.8, width: 1, height: 1, facing: "se" },

  /* Vertical Handoff */
  { id: "f3-handoff", type: "dataRiser", zoneId: "f3-handoff", gx: 9.6, gy: 14.6, width: 1.0, height: 1.0, facing: "se", label: "情報シャフト（1F/2F → 3F）", accent: "#7fd0e0" },
  { id: "f3-handoff-plant", type: "plant", zoneId: "f3-handoff", gx: 9.3, gy: 17.8, width: 1, height: 1, facing: "se" },
];

/* ---- 人物：3F専用座標へ。逆三角形。base の placement は spread で複製し不変。 ---- */
const basePlacements = [...v3AgentPlacements, ...v3CentralTeamPlacements];
const baseManager = basePlacements.find(placement => placement.agentId === "manager")!;
const baseStrategist = basePlacements.find(placement => placement.agentId === "strategist")!;

const placements: V3AgentPlacement[] = [
  {
    ...baseManager,
    // 左前・人間責任者席＋Decision Table を意識する位置。standDirect / scale1.12 / タブレットは維持。
    gx: 10.5, gy: 13.5, facing: "ne", labelPosition: "bottom",
    deskPosition: { gx: 9.8, gy: 14.0 },
    appearance: { ...baseManager.appearance, gazeTilt: -2 },
  },
  {
    ...baseStrategist,
    // 右前・人間責任者席方向。standReview / scale1.0 / タブレットは維持。
    gx: 16.5, gy: 12.5, facing: "nw", labelPosition: "bottom",
    deskPosition: { gx: 18.0, gy: 12.0 },
    appearance: { ...baseStrategist.appearance },
  },
];

/* ---- 人間責任者席：最奥・北中央。V3HumanSeat 型・v3HumanSeat データは不変（座標のみ複製上書き）。 ---- */
const humanSeat = { ...v3HumanSeat, gx: 11.5, gy: 9.5 };

/* ---- カメラ：3F は実質「全景」最優先。北/中央/南も 3F 中心へ寄せる（UI の area バーは base のまま）。 ---- */
const areas: readonly V3Area[] = [
  { id: "all", label: "全景", caption: "3F 全景", scale: 2.5, cx: -15, cy: 366 },
  { id: "north", label: "北側", caption: "意思決定", scale: 2.7, cx: 55, cy: 322 },
  { id: "center", label: "中央", caption: "経営・統括", scale: 2.6, cx: -35, cy: 384 },
  { id: "south", label: "南側", caption: "縦の受け渡し", scale: 2.7, cx: -140, cy: 372 },
];

export const v3Layout3f: V3FloorLayout = {
  floorId: FLOOR_ID,
  zones,
  corridors,
  furniture,
  placements,
  humanSeat,
  viewBox: VIEWBOX,
  areas,
  floorTint: "#161d2b",
};
