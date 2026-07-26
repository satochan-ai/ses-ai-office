import { isoX, isoY, rectPolygon } from "@/data/officeV3ClaudeLayout";
import type { V3Rect, V3Zone, V3ZoneTone } from "@/types/officeV3Claude";
import s from "./OfficeV3.module.css";

const TONES: Record<V3ZoneTone, { fill: string; line: string; edge: string }> = {
  slate: { fill: "#ccd6dd", line: "#b2c0c9", edge: "#8fa2ad" },
  indigo: { fill: "#ccd6e6", line: "#b0bed4", edge: "#8b9cb8" },
  clay: { fill: "#e2cec1", line: "#cdb4a4", edge: "#b0917f" },
  moss: { fill: "#d3ded0", line: "#bacab6", edge: "#96a892" },
  amber: { fill: "#e7d6b7", line: "#d3bd97", edge: "#b79c73" },
  plum: { fill: "#dcd3e3", line: "#c5b9d1", edge: "#a396b3" },
  steel: { fill: "#d7dde3", line: "#c0c9d1", edge: "#9daab5" },
};

/** grid 直線を等尺の線分へ。zone 矩形内なのでクリップ不要。 */
function gridLines({ gx0, gy0, gx1, gy1 }: V3Rect, step: number, axis: "gx" | "gy") {
  const out: string[] = [];
  if (axis === "gy") {
    for (let gy = gy0 + step; gy < gy1; gy += step) {
      out.push(`M${isoX(gx0, gy)},${isoY(gx0, gy)} L${isoX(gx1, gy)},${isoY(gx1, gy)}`);
    }
  } else {
    for (let gx = gx0 + step; gx < gx1; gx += step) {
      out.push(`M${isoX(gx, gy0)},${isoY(gx, gy0)} L${isoX(gx, gy1)},${isoY(gx, gy1)}`);
    }
  }
  return out.join(" ");
}

function insetRect(r: V3Rect, by: number): V3Rect {
  return { gx0: r.gx0 + by, gy0: r.gy0 + by, gx1: r.gx1 - by, gy1: r.gy1 - by };
}

export default function OfficeZone({ zone, faded }: { zone: V3Zone; faded: boolean }) {
  const tone = TONES[zone.tone];
  const b = zone.bounds;
  const lx = isoX(zone.labelPosition.gx, zone.labelPosition.gy);
  const ly = isoY(zone.labelPosition.gx, zone.labelPosition.gy);

  return (
    <g className={faded ? s.zoneFaded : undefined} aria-hidden="true">
      <polygon points={rectPolygon(b)} fill={tone.fill} />

      {zone.floorStyle === "wood" ? (
        <path d={gridLines(b, 0.7, "gy")} stroke={tone.line} strokeWidth={1.1} fill="none" opacity={0.8} />
      ) : null}
      {zone.floorStyle === "carpet" ? (
        <>
          <path d={gridLines(b, 1.75, "gy")} stroke={tone.line} strokeWidth={1} fill="none" opacity={0.55} />
          <path d={gridLines(b, 1.75, "gx")} stroke={tone.line} strokeWidth={1} fill="none" opacity={0.55} />
        </>
      ) : null}
      {zone.floorStyle === "stone" ? (
        <>
          <path d={gridLines(b, 2.33, "gy")} stroke={tone.line} strokeWidth={1.6} fill="none" opacity={0.85} />
          <path d={gridLines(b, 2.33, "gx")} stroke={tone.line} strokeWidth={1.6} fill="none" opacity={0.85} />
        </>
      ) : null}
      {zone.floorStyle === "rug" ? (
        <>
          <polygon points={rectPolygon(insetRect(b, 1.1))} fill="#bfa98c" opacity={0.55} />
          <polygon points={rectPolygon(insetRect(b, 1.7))} fill="#d3c0a3" opacity={0.7} />
        </>
      ) : null}
      {zone.floorStyle === "grass" ? (
        <polygon points={rectPolygon(insetRect(b, 0.9))} fill="#b9cdb0" opacity={0.7} />
      ) : null}

      <polygon points={rectPolygon(b)} fill="none" stroke={tone.edge} strokeWidth={2} opacity={0.65} />

      {/* ゾーン名は床に寝かせて置く（人物ラベルと競合させない） */}
      <g transform={`matrix(0.894,0.447,-0.894,0.447,${lx},${ly})`}>
        <text className={s.zoneName} x={0} y={0}>{zone.name}</text>
        <text className={s.zoneCaption} x={0} y={15}>{zone.caption}</text>
      </g>
    </g>
  );
}
