import type { ReactNode } from "react";
import { ISO_HALF_H, ISO_HALF_W, isoX, isoY } from "@/data/officeV3ClaudeLayout";
import type { V3Furniture } from "@/types/officeV3Claude";
import s from "./OfficeV3.module.css";

const HW = ISO_HALF_W;
const HH = ISO_HALF_H;

type BoxProps = {
  wx: number;
  wy: number;
  h: number;
  base?: number;
  top: string;
  left: string;
  right: string;
  opacity?: number;
};

/** グリッド上の直方体を等尺で描く共通プリミティブ。原点は床の接地点。
 * stroke-linejoin:round の極細フチで、人物のような曲線的な描画との角の差を少し和らげる。
 */
function IsoBox({ wx, wy, h, base = 0, top, left, right, opacity = 1 }: BoxProps) {
  const P = (wx + wy) * HW;
  const Q = (wx - wy) * HH;
  const R = (wx - wy) * HW;
  const S = (wx + wy) * HH;
  const t = -(base + h);
  const b = -base;
  const edge = { stroke: "rgba(0,0,0,0.08)", strokeWidth: 1, strokeLinejoin: "round" as const };
  return (
    <g opacity={opacity} className={s.furniturePanel}>
      <polygon points={`${R},${S + t} ${-P},${-Q + t} ${-P},${-Q + b} ${R},${S + b}`} fill={left} {...edge} />
      <polygon points={`${P},${Q + t} ${R},${S + t} ${R},${S + b} ${P},${Q + b}`} fill={right} {...edge} />
      <polygon points={`${P},${Q + t} ${R},${S + t} ${-P},${-Q + t} ${-R},${-S + t}`} fill={top} {...edge} />
    </g>
  );
}

/** 接地影。家具・人物の共通足元処理。 */
export function ContactShadow({ rx = 34, ry = 17, opacity = 0.2 }) {
  return <ellipse cx={0} cy={0} rx={rx} ry={ry} fill="#1b2233" opacity={opacity} />;
}

function ScreenPanel({ w, h, accent, lift, label }: { w: number; h: number; accent: string; lift: number; label?: string }) {
  // 画面は gx 軸に沿った薄いパネルとして描く（正面が視点側）。
  const dx = w * HW;
  const dy = w * HH;
  return (
    <g>
      <polygon points={`${-dx},${-dy - lift} ${dx},${dy - lift} ${dx},${dy - lift - h} ${-dx},${-dy - lift - h}`} fill="#2c3444" />
      <polygon
        points={`${-dx + 8},${-dy - lift - 6} ${dx - 8},${dy - lift - 6} ${dx - 8},${dy - lift - h + 6} ${-dx + 8},${-dy - lift - h + 6}`}
        fill={accent}
        className={s.screen}
      />
      {label ? (
        <text className={s.deviceLabel} x={0} y={-lift - h - 8} textAnchor="middle">
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Plant() {
  return (
    <g>
      <ContactShadow rx={16} ry={8} opacity={0.16} />
      <IsoBox wx={0.28} wy={0.28} h={16} top="#c08c6d" left="#96674d" right="#ab7a5c" />
      <g className={s.sway}>
        <path d="M0,-16 C-20,-30 -22,-52 -4,-62 C6,-46 8,-28 0,-16Z" fill="#4f8256" />
        <path d="M0,-16 C20,-32 24,-50 8,-64 C-2,-46 -6,-28 0,-16Z" fill="#5d9463" />
        <path d="M0,-18 C-8,-38 -2,-58 6,-70 C12,-52 8,-32 0,-18Z" fill="#6ba872" />
      </g>
    </g>
  );
}

function Chair({ facing }: { facing: string }) {
  const back = facing === "nw" || facing === "sw" ? -1 : 1;
  return (
    <g>
      <ContactShadow rx={18} ry={9} opacity={0.15} />
      <IsoBox wx={0.32} wy={0.32} h={22} top="#5d6b82" left="#3d4859" right="#4b5768" />
      <g transform={`translate(${back * 14}, ${back * 7})`}>
        <IsoBox wx={0.32} wy={0.06} h={26} base={22} top="#6a7891" left="#404b5e" right="#4f5c70" />
      </g>
    </g>
  );
}

function Desk({ w, d, accent }: { w: number; d: number; accent?: string }) {
  return (
    <g>
      <ContactShadow rx={(w + d) * HW * 0.55} ry={(w + d) * HH * 0.55} opacity={0.17} />
      <IsoBox wx={w / 2} wy={d / 2} h={30} top="#d9c4a4" left="#a98c69" right="#c0a37e" />
      <IsoBox wx={w / 2 - 0.12} wy={d / 2 - 0.06} h={4} base={30} top="#e6d5ba" left="#c9b291" right="#d5c1a1" />
      {accent ? <polygon points={`${-w * HW * 0.4},${-w * HH * 0.4 - 34} ${w * HW * 0.4},${w * HH * 0.4 - 34} ${w * HW * 0.4},${w * HH * 0.4 - 36} ${-w * HW * 0.4},${-w * HH * 0.4 - 36}`} fill={accent} opacity={0.6} /> : null}
    </g>
  );
}

function MonitorBank({ w, accent }: { w: number; accent: string }) {
  const seg = w / 3;
  return (
    <g>
      <IsoBox wx={w / 2} wy={0.22} h={30} top="#cbb494" left="#a08464" right="#b89b76" />
      {[-1, 0, 1].map(i => (
        <g key={i} transform={`translate(${i * seg * HW * 1.05}, ${i * seg * HH * 1.05})`}>
          <rect x={-2} y={-40} width={4} height={10} fill="#48536a" />
          <polygon points={`${-seg * HW * 0.5},${-seg * HH * 0.5 - 40} ${seg * HW * 0.5},${seg * HH * 0.5 - 40} ${seg * HW * 0.5},${seg * HH * 0.5 - 70} ${-seg * HW * 0.5},${-seg * HH * 0.5 - 70}`} fill="#2b3342" />
          <polygon
            points={`${-seg * HW * 0.42},${-seg * HH * 0.42 - 43} ${seg * HW * 0.42},${seg * HH * 0.42 - 43} ${seg * HW * 0.42},${seg * HH * 0.42 - 67} ${-seg * HW * 0.42},${-seg * HH * 0.42 - 67}`}
            fill={accent}
            className={s.screen}
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        </g>
      ))}
    </g>
  );
}

function CommandDesk({ w, d }: { w: number; d: number }) {
  return (
    <g>
      <ContactShadow rx={(w + d) * HW * 0.6} ry={(w + d) * HH * 0.6} opacity={0.22} />
      <IsoBox wx={w / 2} wy={d / 2} h={12} top="#b99a6d" left="#8a6f4c" right="#a1855c" />
      <IsoBox wx={w / 2 - 0.15} wy={d / 2 - 0.15} h={22} base={12} top="#e3d0ad" left="#b39a74" right="#cbb287" />
      <IsoBox wx={w / 2 - 0.05} wy={d / 2 - 0.05} h={5} base={34} top="#f0e3c8" left="#cdb896" right="#dcc9a8" />
      <polygon
        points={`${-(w / 2 - 0.3) * HW * 2},${-(w / 2 - 0.3) * HH * 2 - 40} ${(w / 2 - 0.3) * HW * 2},${(w / 2 - 0.3) * HH * 2 - 40} ${(w / 2 - 0.3) * HW * 2},${(w / 2 - 0.3) * HH * 2 - 43} ${-(w / 2 - 0.3) * HW * 2},${-(w / 2 - 0.3) * HH * 2 - 43}`}
        fill="#e0b872"
        opacity={0.75}
        className={s.rim}
      />
    </g>
  );
}

function Shelf({ w, facing }: { w: number; facing: string }) {
  const flip = facing === "sw" || facing === "nw" ? -1 : 1;
  return (
    <g>
      <ContactShadow rx={w * HW * 0.6} ry={w * HH * 0.6} opacity={0.18} />
      <IsoBox wx={w / 2} wy={0.34} h={74} top="#a4784f" left="#7a5637" right="#916945" />
      {[0, 1, 2].map(row => (
        <g key={row} transform={`translate(${flip * 6}, ${-row * 22 - 12 + flip * 3})`}>
          {[-1, 0, 1].map(c => (
            <rect
              key={c}
              x={c * w * 12 - 4}
              y={-30 + Math.abs(c) * 2}
              width={7}
              height={14 + Math.abs(c) * 3}
              fill={["#c9b48c", "#b39572"][(row + c + 3) % 2]}
              transform={`translate(0, ${c * w * 6})`}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

function Cabinet({ w }: { w: number }) {
  return (
    <g>
      <ContactShadow rx={w * HW * 0.6} ry={w * HH * 0.6} opacity={0.16} />
      <IsoBox wx={w / 2} wy={0.4} h={44} top="#93a0b2" left="#66738a" right="#7a879b" />
      {[0, 1].map(i => (
        <rect key={i} x={-6} y={-36 + i * 18} width={12} height={3} fill="#c3ccd9" />
      ))}
    </g>
  );
}

function Sofa({ w, facing }: { w: number; facing: string }) {
  const back = facing === "nw" || facing === "sw" ? -1 : 1;
  return (
    <g>
      <ContactShadow rx={w * HW * 0.7} ry={w * HH * 0.7} opacity={0.17} />
      <IsoBox wx={w / 2} wy={0.42} h={18} top="#93a3b8" left="#5f6e83" right="#7686a0" />
      <g transform={`translate(${back * 12}, ${back * 6})`}>
        <IsoBox wx={w / 2} wy={0.08} h={22} base={18} top="#a3b3c6" left="#63728a" right="#7e8fa6" />
      </g>
    </g>
  );
}

function RoundTable({ w }: { w: number }) {
  const rx = w * HW * 0.5;
  const ry = w * HH * 0.5;
  return (
    <g>
      <ContactShadow rx={rx * 1.1} ry={ry * 1.1} opacity={0.17} />
      <rect x={-4} y={-26} width={8} height={26} fill="#8d7550" />
      <ellipse cx={0} cy={-28} rx={rx} ry={ry} fill="#a8895f" />
      <ellipse cx={0} cy={-31} rx={rx} ry={ry} fill="#e2cfae" />
      <ellipse cx={0} cy={-31} rx={rx * 0.55} ry={ry * 0.55} fill="#eddcbf" opacity={0.7} />
    </g>
  );
}

function Counter({ w }: { w: number }) {
  return (
    <g>
      <ContactShadow rx={w * HW * 0.6} ry={w * HH * 0.6} opacity={0.2} />
      <IsoBox wx={w / 2} wy={0.62} h={38} top="#c8ac83" left="#8f7551" right="#ac9067" />
      <IsoBox wx={w / 2 + 0.12} wy={0.72} h={6} base={38} top="#eee0c6" left="#c2ac8c" right="#d8c5a4" />
      <polygon
        points={`${-(w / 2) * HW * 2},${-(w / 2) * HH * 2 - 20} ${(w / 2) * HW * 2},${(w / 2) * HH * 2 - 20} ${(w / 2) * HW * 2},${(w / 2) * HH * 2 - 23} ${-(w / 2) * HW * 2},${-(w / 2) * HH * 2 - 23}`}
        fill="#7fb3c8"
        opacity={0.7}
        className={s.rim}
      />
    </g>
  );
}

function Terminal() {
  return (
    <g>
      <ContactShadow rx={18} ry={9} opacity={0.16} />
      <IsoBox wx={0.34} wy={0.34} h={52} top="#5a6779" left="#39434f" right="#4a5566" />
      <polygon points="-16,-60 16,-52 16,-76 -16,-84" fill="#28303d" />
      <polygon points="-12,-61 12,-55 12,-75 -12,-81" fill="#79b0c9" className={s.screen} />
    </g>
  );
}

function Whiteboard({ w, label }: { w: number; label?: string }) {
  const dx = w * HW;
  const dy = w * HH;
  return (
    <g>
      <ContactShadow rx={dx * 0.6} ry={dy * 0.6} opacity={0.15} />
      <rect x={-3} y={-24} width={6} height={24} fill="#7d8798" />
      <polygon points={`${-dx},${-dy - 24} ${dx},${dy - 24} ${dx},${dy - 96} ${-dx},${-dy - 96}`} fill="#e9e4d8" />
      <polygon points={`${-dx},${-dy - 24} ${dx},${dy - 24} ${dx},${dy - 30} ${-dx},${-dy - 30}`} fill="#c4bcab" />
      <g opacity={0.55} stroke="#5d7b8e" strokeWidth={2.5} fill="none">
        <path d={`M${-dx + 14},${-dy - 74} L${-dx + 44},${-dy - 62} L${-dx + 66},${-dy - 74}`} />
        <path d={`M${-dx + 14},${-dy - 48} L${dx - 22},${dy - 44}`} stroke="#b08a6a" />
      </g>
      {label ? <text className={s.deviceLabel} x={0} y={-104} textAnchor="middle">{label}</text> : null}
    </g>
  );
}

function Partition({ w }: { w: number }) {
  const dx = w * HW;
  const dy = w * HH;
  return (
    <g>
      <polygon points={`${-dx},${-dy} ${dx},${dy} ${dx},${dy - 62} ${-dx},${-dy - 62}`} fill="#8fa6b4" opacity={0.42} />
      <polygon points={`${-dx},${-dy - 60} ${dx},${dy - 60} ${dx},${dy - 64} ${-dx},${-dy - 64}`} fill="#b7c8d2" />
    </g>
  );
}

function PaperStack() {
  return (
    <g>
      <ContactShadow rx={16} ry={8} opacity={0.14} />
      <IsoBox wx={0.3} wy={0.3} h={20} top="#c8b593" left="#9c8763" right="#b29c76" />
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(${(i - 1) * 3}, ${-20 - i * 5})`}>
          <IsoBox wx={0.22} wy={0.16} h={4} top="#f4efe2" left="#cfc7b4" right="#e2dbc9" />
        </g>
      ))}
    </g>
  );
}

function Lamp() {
  return (
    <g>
      <ContactShadow rx={14} ry={7} opacity={0.14} />
      <rect x={-2.5} y={-96} width={5} height={96} fill="#6f7a8c" />
      <polygon points="-18,-96 18,-96 11,-118 -11,-118" fill="#e8d2a4" className={s.glow} />
    </g>
  );
}

export default function OfficeFurniture({ item }: { item: V3Furniture }) {
  const x = isoX(item.gx, item.gy);
  const y = isoY(item.gx, item.gy);
  let shape: ReactNode = null;

  switch (item.type) {
    case "desk": shape = <Desk w={item.width} d={item.height} accent={item.accent} />; break;
    case "commandDesk": shape = <CommandDesk w={item.width} d={item.height} />; break;
    case "chair": shape = <Chair facing={item.facing} />; break;
    // 画面上の文字は「表示面」を持つ設備だけに絞り、床の情報量を抑える。
    case "monitorBank": shape = <MonitorBank w={item.width} accent={item.accent ?? "#6f9fc0"} />; break;
    // 設備名の常時表示は削減し、家具の形そのもので存在感を伝える（ラベルは<title>ツールチップに残す）
    case "wallScreen": shape = <ScreenPanel w={item.width / 2} h={54} lift={38} accent={item.accent ?? "#6f9fc0"} />; break;
    case "whiteboard": shape = <Whiteboard w={item.width / 2} />; break;
    case "shelf": shape = <Shelf w={item.width} facing={item.facing} />; break;
    case "cabinet": shape = <Cabinet w={item.width} />; break;
    case "sofa": shape = <Sofa w={item.width} facing={item.facing} />; break;
    case "roundTable": shape = <RoundTable w={item.width} />; break;
    case "counter": shape = <Counter w={item.width} />; break;
    case "terminal": shape = <Terminal />; break;
    case "partition": shape = <Partition w={item.width / 2} />; break;
    case "plant": shape = <Plant />; break;
    case "paperStack": shape = <PaperStack />; break;
    case "lamp": shape = <Lamp />; break;
  }

  return (
    <g transform={`translate(${x}, ${y})`} aria-hidden="true">
      {item.label ? <title>{item.label}</title> : null}
      {shape}
    </g>
  );
}
