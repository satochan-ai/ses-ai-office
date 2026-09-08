import type { V3FloorLayout } from "@/types/officeV3Claude";
import {
  VIEWBOX,
  v3AgentPlacements,
  v3CentralTeamPlacements,
  v3Corridors,
  v3Furniture,
  v3Zones,
} from "./officeV3ClaudeLayout";

/**
 * Step4: 1F レイアウト。
 * 現在の物理フロア（zones / corridors / furniture / VIEWBOX / 座標）を
 * そのまま 1F のベースとして採用する。人物の gx/gy・scale・appearance・
 * labelPosition は一切変更しない。placements は floorId === "1f" の6名のみ。
 *
 * 1F 所属：newbiz / bp / matching / recruit / follow / relation
 */
const FLOOR_ID = "1f" as const;

const allPlacements = [...v3AgentPlacements, ...v3CentralTeamPlacements];

export const v3Layout1f: V3FloorLayout = {
  floorId: FLOOR_ID,
  zones: v3Zones,
  corridors: v3Corridors,
  furniture: v3Furniture,
  placements: allPlacements.filter(placement => placement.floorId === FLOOR_ID),
  viewBox: VIEWBOX,
};
