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
 * Step4: 仮の 2F レイアウト。
 * 目的は「2F が独立したレイアウトデータを持てること」。見た目の完成ではない。
 * zones / corridors / furniture / VIEWBOX / 人物 gx/gy は現行レイアウトを
 * 複製ベースとしてそのまま流用する（2F 専用の家具・ゾーン設計は次工程）。
 * placements は floorId === "2f" の5名のみ。
 *
 * 2F 所属：analytics / proposal / quality / contract / knowledge
 */
const FLOOR_ID = "2f" as const;

const allPlacements = [...v3AgentPlacements, ...v3CentralTeamPlacements];

export const v3Layout2f: V3FloorLayout = {
  floorId: FLOOR_ID,
  zones: v3Zones,
  corridors: v3Corridors,
  furniture: v3Furniture,
  placements: allPlacements.filter(placement => placement.floorId === FLOOR_ID),
  viewBox: VIEWBOX,
};
