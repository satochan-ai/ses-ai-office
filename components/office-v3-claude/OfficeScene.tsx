"use client";

import { useMemo } from "react";
import {
  GRID_SIZE,
  ISO_HALF_H,
  ISO_HALF_W,
  VIEWBOX,
  isoDepth,
  isoX,
  isoY,
  rectPolygon,
  v3Areas,
  v3Corridors,
  v3Furniture,
  v3Zones,
} from "@/data/officeV3ClaudeLayout";
import type { V3AgentView, V3AreaId } from "@/types/officeV3Claude";
import OfficeAgent from "./OfficeAgent";
import OfficeFurniture from "./OfficeFurniture";
import OfficeZone from "./OfficeZone";
import s from "./OfficeV3.module.css";

const G = GRID_SIZE;
const WALL_H = 300;
const PARAPET = 62;

/** 壁の内側に見える夜景。壁の傾きに沿ってビルを並べる。 */
const SKYLINE: [number, number, number][] = [
  [0.5, 2.6, 250], [3.4, 1.8, 170], [5.6, 3.0, 305], [9.0, 2.2, 205], [11.6, 2.8, 268],
  [14.8, 1.9, 155], [17.1, 3.2, 292], [20.7, 2.1, 196], [23.2, 2.7, 246], [26.3, 3.0, 168],
];

function CityWall({ sign }: { sign: 1 | -1 }) {
  const px = (g: number) => sign * g * ISO_HALF_W;
  const py = (g: number) => g * ISO_HALF_H;
  return (
    <g>
      {SKYLINE.map(([g, w, h], i) => {
        const x0 = px(g);
        const y0 = py(g);
        const x1 = px(g + w);
        const y1 = py(g + w);
        const lit = 3 + (i % 3);
        return (
          <g key={g}>
            <polygon points={`${x0},${y0} ${x1},${y1} ${x1},${y1 - h} ${x0},${y0 - h}`} fill={i % 2 ? "#1b2740" : "#212f4c"} />
            {Array.from({ length: lit * 4 }, (_, k) => {
              const col = k % lit;
              const row = Math.floor(k / lit);
              const t = (col + 0.6) / (lit + 0.4);
              const bx = x0 + (x1 - x0) * t;
              const by = y0 + (y1 - y0) * t - h + 26 + row * 34;
              return <rect key={k} x={bx - 4} y={by} width={8} height={11} fill="#f0c489" opacity={(i + k) % 4 === 0 ? 0.28 : 0.72} />;
            })}
          </g>
        );
      })}
    </g>
  );
}

/** 壁 1 面のポリゴン。sign=1 が右奥、-1 が左奥。 */
function wallQuad(sign: 1 | -1, lift: number) {
  const ex = sign * G * ISO_HALF_W;
  const ey = G * ISO_HALF_H;
  return `0,0 ${ex},${ey} ${ex},${ey - lift} 0,${-lift}`;
}

/** 壁の水平帯（笠木・天井見切り）。 */
function wallBand(sign: 1 | -1, lift: number, thickness: number) {
  const ex = sign * G * ISO_HALF_W;
  const ey = G * ISO_HALF_H;
  return `0,${-lift} ${ex},${ey - lift} ${ex},${ey - lift - thickness} 0,${-lift - thickness}`;
}

function Walls() {
  return (
    <g aria-hidden="true">
      <defs>
        <clipPath id="v3Glass">
          <polygon points={wallQuad(1, WALL_H)} />
          <polygon points={wallQuad(-1, WALL_H)} />
        </clipPath>
      </defs>

      {/* ガラス面の内側に夕景の街 */}
      <g clipPath="url(#v3Glass)">
        <polygon points={wallQuad(1, WALL_H)} fill="url(#v3Dusk)" />
        <polygon points={wallQuad(-1, WALL_H)} fill="url(#v3Dusk)" />
        <g transform="translate(0,-26)"><CityWall sign={1} /></g>
        <g transform="translate(0,-26)"><CityWall sign={-1} /></g>
      </g>

      {/* 方立と手すり */}
      {[1, -1].map(sign => (
        <g key={sign}>
          {Array.from({ length: 11 }, (_, i) => {
            const g = i * 3;
            const x = sign * g * ISO_HALF_W;
            const y = g * ISO_HALF_H;
            return <line key={i} x1={x} y1={y} x2={x} y2={y - WALL_H} stroke="#7d8794" strokeWidth={3} opacity={0.55} />;
          })}
          <polygon points={wallQuad(sign as 1 | -1, PARAPET)} fill={sign === 1 ? "#b9a488" : "#a8937a"} />
          <polygon points={wallBand(sign as 1 | -1, PARAPET, 7)} fill="#d9c7ab" />
          <polygon points={wallBand(sign as 1 | -1, WALL_H, 16)} fill="#4c5566" />
        </g>
      ))}
      <text className={s.wallSign} x={0} y={-WALL_H + 46} textAnchor="middle">SES AI OFFICE</text>
    </g>
  );
}

function Corridors() {
  return (
    <g aria-hidden="true">
      {v3Corridors.map(corridor => (
        <g key={corridor.id}>
          <polygon points={rectPolygon(corridor.bounds)} fill={corridor.kind === "main" ? "#d9dde0" : "#dfe2e4"} />
          <polygon points={rectPolygon(corridor.bounds)} fill="none" stroke="#c2c8cc" strokeWidth={1.6} />
        </g>
      ))}
    </g>
  );
}

type Props = {
  views: V3AgentView[];
  selectedId: string | null;
  area: V3AreaId;
  /** 縦長ビューポート（モバイル）。全景表示だけ引いてフロア全体を収める。 */
  compact: boolean;
  onSelect: (agentId: string) => void;
};

export default function OfficeScene({ views, selectedId, area, compact, onSelect }: Props) {
  const focus = v3Areas.find(a => a.id === area) ?? v3Areas[0];
  const scale = compact && area === "all" ? focus.scale * 0.72 : focus.scale;
  const viewCx = VIEWBOX.x + VIEWBOX.w / 2;
  const viewCy = VIEWBOX.y + VIEWBOX.h / 2;
  const camera = `translate(${viewCx - scale * focus.cx}px, ${viewCy - scale * focus.cy}px) scale(${scale})`;

  const props = useMemo(() => {
    const items = [
      ...v3Furniture.map(item => ({ key: item.id, depth: isoDepth(item.gx, item.gy), z: item.zIndex ?? 0, node: <OfficeFurniture item={item} /> })),
      ...views.map(view => ({
        key: view.placement.id,
        depth: isoDepth(view.placement.gx, view.placement.gy),
        z: (view.placement.zIndex ?? 0) + 1,
        node: (
          <OfficeAgent
            view={view}
            selected={selectedId === view.placement.agentId}
            dimmed={selectedId !== null && selectedId !== view.placement.agentId}
            onSelect={onSelect}
          />
        ),
      })),
    ];
    return items.sort((a, b) => a.depth - b.depth || a.z - b.z);
  }, [onSelect, selectedId, views]);

  const activeZones = new Set(v3Zones.filter(zone => area === "all" || zone.area === area).map(zone => zone.id));

  return (
    <svg
      className={s.svg}
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid slice"
      role="group"
      aria-label="アイソメトリック表示のSES AI Office。AI社員11名が中央指令席を囲んで働いています。"
    >
      <defs>
        <linearGradient id="v3Dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b2748" />
          <stop offset="52%" stopColor="#3a4670" />
          <stop offset="82%" stopColor="#8a6c72" />
          <stop offset="100%" stopColor="#d19a70" />
        </linearGradient>
        <radialGradient id="v3Warm" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#fff4dc" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff4dc" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className={s.camera} style={{ transform: camera }}>
        <Walls />

        {/* 床の厚みと影 */}
        <polygon
          points={`${isoX(0, 0)},${isoY(0, 0) + 22} ${isoX(G, 0)},${isoY(G, 0) + 22} ${isoX(G, G)},${isoY(G, G) + 22} ${isoX(0, G)},${isoY(0, G) + 22}`}
          fill="#8f9aa5"
          opacity={0.5}
        />
        <polygon points={rectPolygon({ gx0: 0, gy0: 0, gx1: G, gy1: G })} fill="#cdd3d8" />

        <Corridors />
        {v3Zones.map(zone => (
          <OfficeZone key={zone.id} zone={zone} faded={!activeZones.has(zone.id)} />
        ))}

        {/* 中央指令席へ落ちる暖かい照明 */}
        <ellipse cx={isoX(15, 15)} cy={isoY(15, 15)} rx={260} ry={130} fill="url(#v3Warm)" />

        {props.map(item => (
          <g key={item.key}>{item.node}</g>
        ))}

        {/* 家具・人物の上からも同じ暖色照明が当たって見えるよう、ごく淡いオーバーレイを重ねる */}
        <ellipse
          cx={isoX(15, 15)}
          cy={isoY(15, 15)}
          rx={260}
          ry={130}
          fill="url(#v3Warm)"
          opacity={0.35}
          style={{ mixBlendMode: "soft-light" }}
          pointerEvents="none"
        />
      </g>
    </svg>
  );
}
