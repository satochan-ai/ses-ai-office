import type { V3FloorLayout } from "@/types/officeV3Claude";
import {
  VIEWBOX,
  v3AgentPlacements,
  v3CentralTeamPlacements,
  v3Corridors,
  v3Furniture,
  v3HumanSeat,
  v3Zones,
} from "./officeV3ClaudeLayout";

/**
 * Step4: 仮の 3F レイアウト。
 * 現行レイアウトを複製ベースとしてそのまま流用する（経営フロア専用デザイン・
 * 本格的な 3F 移設は次工程）。placements は floorId === "3f" の2名のみ。
 *
 * 人間責任者席は「3F 相当」として humanSeat フィールドへ参照で所属させるだけ。
 * V3HumanSeat 型・v3HumanSeat データ・座標は一切変更しない。
 *
 * 3F 所属：manager / strategist（＋ 参照としての humanSeat）
 */
const FLOOR_ID = "3f" as const;

const allPlacements = [...v3AgentPlacements, ...v3CentralTeamPlacements];

export const v3Layout3f: V3FloorLayout = {
  floorId: FLOOR_ID,
  zones: v3Zones,
  corridors: v3Corridors,
  furniture: v3Furniture,
  placements: allPlacements.filter(placement => placement.floorId === FLOOR_ID),
  humanSeat: v3HumanSeat,
  viewBox: VIEWBOX,
};
