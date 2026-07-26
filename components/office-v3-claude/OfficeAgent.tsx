"use client";

import { isoX, isoY, v3StatusTone } from "@/data/officeV3ClaudeLayout";
import type { V3AgentView, V3HairStyle, V3Pose, V3Prop } from "@/types/officeV3Claude";
import s from "./OfficeV3.module.css";
import { ContactShadow } from "./OfficeFurniture";

const STATUS_DOT: Record<"run" | "check" | "talk", string> = { run: "#e2b877", check: "#8fbf9c", talk: "#7fa8d6" };

const BUILD_SHOULDER = { slim: 11, regular: 13, broad: 15.5 } as const;

type Arm = { e: [number, number]; h: [number, number] };

/** 右向き（facing = ne / se）を基準にした腕のポーズ表。左向きは scaleX(-1)。 */
function armsFor(pose: V3Pose, sw: number): { back: Arm; front: Arm } {
  switch (pose) {
    case "typing":
      return { back: { e: [sw + 5, -70], h: [sw + 15, -57] }, front: { e: [sw + 1, -71], h: [sw + 13, -55] } };
    case "pointing":
      return { back: { e: [-sw - 4, -70], h: [-sw - 7, -53] }, front: { e: [sw + 11, -85], h: [sw + 27, -93] } };
    case "reading":
      return { back: { e: [sw + 4, -72], h: [sw + 11, -63] }, front: { e: [sw + 7, -73], h: [sw + 14, -66] } };
    case "phone":
      return { back: { e: [-sw - 4, -70], h: [-sw - 7, -53] }, front: { e: [sw + 12, -92], h: [sw + 2, -103] } };
    case "presenting":
      return { back: { e: [-sw - 6, -72], h: [-sw - 10, -57] }, front: { e: [sw + 13, -86], h: [sw + 23, -77] } };
    case "reviewing":
      return { back: { e: [sw + 2, -72], h: [sw + 9, -63] }, front: { e: [sw + 9, -77], h: [sw + 17, -70] } };
    default:
      return { back: { e: [-sw - 4, -71], h: [-sw - 6, -53] }, front: { e: [sw + 5, -71], h: [sw + 8, -53] } };
  }
}

function ArmPath({ arm, sw, sign, color }: { arm: Arm; sw: number; sign: number; color: string }) {
  return (
    <path
      d={`M${sign * sw},-83 Q${arm.e[0]},${arm.e[1]} ${arm.h[0]},${arm.h[1]}`}
      stroke={color}
      strokeWidth={7.5}
      strokeLinecap="round"
      fill="none"
    />
  );
}

function Hair({ style, color }: { style: V3HairStyle; color: string }) {
  const cap = <path d="M-12.6,-106 A12.6,14 0 0 1 12.6,-106 L12.6,-101 Q0,-109 -12.6,-100 Z" fill={color} />;
  switch (style) {
    case "crop":
      return <g>{cap}</g>;
    case "sidepart":
      return (
        <g>
          {cap}
          <path d="M-12,-104 Q-2,-114 12,-104 Q4,-108 -12,-99 Z" fill={color} />
        </g>
      );
    case "bob":
      return (
        <g>
          {cap}
          <path d="M-13,-106 Q-16,-90 -11,-86 L-7,-88 Q-11,-96 -9,-105 Z" fill={color} />
          <path d="M13,-106 Q16,-90 11,-86 L7,-88 Q11,-96 9,-105 Z" fill={color} />
        </g>
      );
    case "ponytail":
      return (
        <g>
          {cap}
          <path d="M-12,-104 Q-22,-96 -19,-78 Q-13,-84 -13,-98 Z" fill={color} />
        </g>
      );
    case "bun":
      return (
        <g>
          {cap}
          <circle cx={-13} cy={-110} r={6.5} fill={color} />
        </g>
      );
    case "wavy":
      return (
        <g>
          {cap}
          <path d="M-13,-105 Q-18,-97 -13,-93 Q-18,-89 -12,-85 L-8,-88 Q-12,-96 -9,-104 Z" fill={color} />
          <path d="M13,-105 Q18,-97 13,-93 Q18,-89 12,-85 L8,-88 Q12,-96 9,-104 Z" fill={color} />
        </g>
      );
    case "long":
      return (
        <g>
          {cap}
          <path d="M-13,-107 Q-17,-88 -13,-76 L-6,-78 Q-10,-94 -9,-106 Z" fill={color} />
          <path d="M13,-107 Q17,-88 13,-76 L6,-78 Q10,-94 9,-106 Z" fill={color} />
        </g>
      );
    case "braid":
      return (
        <g>
          {cap}
          <path d="M-12,-104 Q-19,-96 -18,-88 L-14,-88 Q-14,-96 -9,-102 Z" fill={color} />
          <circle cx={-17} cy={-84} r={3.6} fill={color} />
          <circle cx={-17} cy={-77} r={3.2} fill={color} />
        </g>
      );
    case "curly":
      return (
        <g>
          {cap}
          <circle cx={-11} cy={-110} r={5.4} fill={color} />
          <circle cx={0} cy={-115} r={5.8} fill={color} />
          <circle cx={11} cy={-110} r={5.4} fill={color} />
          <circle cx={-13} cy={-100} r={4.6} fill={color} />
        </g>
      );
    case "tiedback":
      return (
        <g>
          {cap}
          <path d="M-12,-103 Q-19,-99 -17,-88 Q-12,-93 -12,-100 Z" fill={color} />
        </g>
      );
    case "undercut":
      return (
        <g>
          <path d="M-12.6,-106 A12.6,14 0 0 1 12.6,-106 L12.6,-102 Q0,-110 -12.6,-102 Z" fill={color} />
          <rect x={-12.4} y={-102} width={24.8} height={4} fill={color} opacity={0.45} />
        </g>
      );
  }
}

function HeldProp({ prop, at }: { prop: V3Prop; at: [number, number] }) {
  if (prop === "none") return null;
  const [x, y] = at;
  switch (prop) {
    case "tablet":
      return (
        <g transform={`translate(${x + 4},${y - 2}) rotate(-18)`}>
          <rect x={-6} y={-9} width={13} height={19} rx={2} fill="#3a4457" />
          <rect x={-4.5} y={-7.5} width={10} height={16} rx={1} fill="#87c0d8" className={s.screen} />
        </g>
      );
    case "documents":
      return (
        <g transform={`translate(${x + 3},${y - 1}) rotate(-12)`}>
          <rect x={-7} y={-9} width={15} height={19} rx={1.5} fill="#f5f0e4" />
          <rect x={-4} y={-5} width={9} height={1.8} fill="#b3aa96" />
          <rect x={-4} y={-1} width={9} height={1.8} fill="#b3aa96" />
          <rect x={-4} y={3} width={6} height={1.8} fill="#b3aa96" />
        </g>
      );
    case "notebook":
      return (
        <g transform={`translate(${x + 3},${y}) rotate(-14)`}>
          <rect x={-6} y={-8} width={13} height={17} rx={1.5} fill="#4d6b63" />
          <rect x={-6} y={-8} width={3} height={17} fill="#38504a" />
        </g>
      );
    case "cards":
      return (
        <g transform={`translate(${x + 3},${y})`}>
          <rect x={-7} y={-6} width={14} height={10} rx={1.5} fill="#f2ece0" />
          <rect x={-5} y={-9} width={14} height={10} rx={1.5} fill="#ffffff" />
        </g>
      );
    case "folder":
      return (
        <g transform={`translate(${x + 3},${y}) rotate(-10)`}>
          <rect x={-7} y={-9} width={15} height={19} rx={1.5} fill="#c9a061" />
          <rect x={-7} y={-9} width={15} height={4} rx={1.5} fill="#b08a4c" />
        </g>
      );
    case "marker":
      return (
        <g transform={`translate(${x + 2},${y}) rotate(35)`}>
          <rect x={-1.8} y={-8} width={3.6} height={15} rx={1.5} fill="#3f4a5c" />
          <rect x={-1.8} y={-11} width={3.6} height={4} rx={1} fill="#c96a5c" />
        </g>
      );
    case "businessCard":
      return (
        <g transform={`translate(${x + 3},${y})`}>
          <rect x={-8} y={-5} width={16} height={10} rx={1} fill="#fbf7ee" />
          <rect x={-5} y={-2} width={8} height={1.4} fill="#9fa8b5" />
        </g>
      );
    case "resume":
      return (
        <g transform={`translate(${x + 3},${y - 1}) rotate(-8)`}>
          <rect x={-7} y={-10} width={15} height={20} rx={1.5} fill="#ffffff" />
          <circle cx={-2.5} cy={-5} r={2.6} fill="#c3cbd6" />
          <rect x={1.5} y={-6.5} width={5} height={1.6} fill="#c3cbd6" />
          <rect x={-4.5} y={0} width={10} height={1.6} fill="#c3cbd6" />
          <rect x={-4.5} y={4} width={7} height={1.6} fill="#c3cbd6" />
        </g>
      );
  }
}

type Props = {
  view: V3AgentView;
  selected: boolean;
  dimmed: boolean;
  onSelect: (agentId: string) => void;
};

export default function OfficeAgent({ view, selected, dimmed, onSelect }: Props) {
  const { placement, name, role } = view;
  const a = placement.appearance;
  const x = isoX(placement.gx, placement.gy);
  const y = isoY(placement.gx, placement.gy);
  const flip = placement.facing === "nw" || placement.facing === "sw" ? -1 : 1;
  const sw = BUILD_SHOULDER[a.build];
  const arms = armsFor(a.pose, sw);
  const lean = a.pose === "typing" || a.pose === "reviewing" ? 2 : 0;

  // ラベルは役割名＋状態ドットのみの1行表示にし、人物との間隔を統一する。
  // テキストは常にstart基準にして、位置(上下左右)ごとに箱の左端だけをずらす。
  const label = placement.labelPosition;
  const boxW = placement.shortRole.length * 13 + 28;
  const labelPos =
    label === "top" ? { lx: -boxW / 2, ly: -132 }
    : label === "bottom" ? { lx: -boxW / 2, ly: 26 }
    : label === "left" ? { lx: -boxW - 22, ly: -96 }
    : { lx: 22, ly: -96 };
  const statusDot = STATUS_DOT[v3StatusTone[placement.currentStatus] ?? "run"];

  return (
    <g
      className={`${s.agent} ${selected ? s.agentSelected : ""} ${dimmed ? s.agentDim : ""}`}
      transform={`translate(${x}, ${y})`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${name}／${role}／状態: ${placement.currentStatus}`}
      onClick={() => onSelect(placement.agentId)}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(placement.agentId);
        }
      }}
    >
      <ellipse className={s.agentHit} cx={0} cy={-64} rx={44} ry={78} />
      <ContactShadow rx={24} ry={12} opacity={0.22} />
      {selected ? <ellipse className={s.agentRing} cx={0} cy={0} rx={30} ry={15} /> : null}

      <g transform={`scale(${placement.scale}) translate(0,0)`}>
        <g className={s.idle} transform={`scale(${flip}, 1) scale(1, ${a.stature})`}>
          <ArmPath arm={arms.back} sw={sw} sign={-1} color={a.outfit} />

          {/* 脚 */}
          <path d={`M-6,-46 L-8,-2 L-1,-2 L-1.5,-46 Z`} fill={a.outfitAlt} />
          <path d={`M6,-46 L9,-2 L2,-2 L1.5,-46 Z`} fill={a.outfitAlt} />
          <ellipse cx={-4.5} cy={-1} rx={7} ry={3} fill="#2f3745" />
          <ellipse cx={6} cy={-1} rx={7} ry={3} fill="#2f3745" />

          {/* 胴 */}
          <path
            d={`M${-sw},-84 Q${-sw - 1},-62 ${-sw + 3},-44 L${sw - 3},-44 Q${sw + 1},-62 ${sw},-84 Q0,-90 ${-sw},-84 Z`}
            fill={a.outfit}
            transform={`translate(${lean},0)`}
          />
          <path d={`M${-sw + 2},-84 Q0,-78 ${sw - 2},-84 L${sw - 3},-72 Q0,-66 ${-sw + 3},-72 Z`} fill="#ffffff" opacity={0.16} />
          {/* 胸元のAIバッジ（AIらしさはここだけ） */}
          <rect x={sw - 9} y={-77} width={7} height={4.5} rx={2} fill="#8fd4e8" className={s.badge} />

          {/* 首・頭 */}
          <rect x={-3.5} y={-92} width={7} height={9} fill={a.skin} />
          <ellipse cx={0} cy={-103} rx={12.6} ry={14} fill={a.skin} />
          <path d="M-12.6,-103 A12.6,14 0 0 0 -1,-89.3 L-3,-103 Z" fill="#000" opacity={0.07} />
          <Hair style={a.hairStyle} color={a.hair} />
          <circle cx={5.5} cy={-103} r={1.5} fill="#2c2a2c" className={s.eye} />
          <circle cx={-2.5} cy={-103} r={1.5} fill="#2c2a2c" className={s.eye} />
          <path d="M2,-96 Q5.5,-94.4 8.6,-96.4" stroke="#b9836a" strokeWidth={1.2} fill="none" strokeLinecap="round" />
          {a.glasses ? (
            <g stroke="#3e4756" strokeWidth={1.3} fill="none">
              <rect x={2.6} y={-106.4} width={7.4} height={6.6} rx={2} fill="#cfe6f2" fillOpacity={0.4} />
              <rect x={-6.2} y={-106.4} width={7.4} height={6.6} rx={2} fill="#cfe6f2" fillOpacity={0.4} />
              <path d="M1.2,-103.4 L2.6,-103.4" />
              <path d="M10,-104 L12.4,-105" />
            </g>
          ) : null}
          {a.headset ? (
            // 暗い髪色と同化して「ヘルメット」に見えないよう、髪より明るい色調＋淡いハイライトで分離する
            <g>
              <path d="M-12,-108 Q0,-121 12,-108" stroke="#7d879a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
              <path d="M-12,-108 Q0,-121 12,-108" stroke="#c9d3e0" strokeWidth={0.7} fill="none" strokeLinecap="round" opacity={0.6} />
              <rect x={9.6} y={-107.5} width={5} height={7.5} rx={2.2} fill="#7d879a" />
              <circle cx={12.1} cy={-104} r={1} fill="#bcdcec" opacity={0.85} />
              <path d="M12,-100 Q9,-95 5,-95" stroke="#7d879a" strokeWidth={1.4} fill="none" />
            </g>
          ) : null}

          <g className={a.pose === "typing" ? s.typingArm : undefined}>
            <ArmPath arm={arms.front} sw={sw} sign={1} color={a.outfit} />
            <circle cx={arms.front.h[0]} cy={arms.front.h[1]} r={4} fill={a.skin} />
            <HeldProp prop={a.prop} at={arms.front.h} />
          </g>
        </g>
      </g>

      <g className={s.agentLabel} transform={`translate(${labelPos.lx}, ${labelPos.ly})`}>
        <rect x={0} y={-11} width={boxW} height={22} rx={8} />
        <circle cx={13} cy={0} r={3.2} fill={statusDot} className={s.statusDot} />
        <text x={22} y={4} textAnchor="start" className={s.labelRole}>
          {placement.shortRole}
        </text>
      </g>
    </g>
  );
}
