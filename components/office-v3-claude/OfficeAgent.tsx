"use client";

import { isoX, isoY, v3StatusTone } from "@/data/officeV3ClaudeLayout";
import type { V3AgentView, V3Appearance, V3ClothingType, V3DeskItem, V3HairStyle, V3Pose, V3Prop, V3WorkerPose } from "@/types/officeV3Claude";
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

/* ------------------------------------------------------------------ */
/* 社員らしい人物表現（V3 Claude・13名共通の WorkerFigure）                */
/* 立位換算 約6.5頭身・骨格ベース・視線と手を作業対象へ接続・完全静止。     */
/* データ駆動：appearance.workerPose / clothingType / deskItems /        */
/*   deskAdjust / gazeTilt / squareGlasses（V3 Claude専用の任意項目）。    */
/* 既存 armsFor / Hair / ArmPath / HeldProp とは混在させない。            */
/* workerPose 未指定のエージェントだけ従来表現へフォールバックする。        */
/* ------------------------------------------------------------------ */

const isStandPose = (p: V3WorkerPose) => p === "standDirect" || p === "standReview";

/** 骨格の基準点（立位・ローカル座標 / 上が -y / 足首≈-2）。
 * head / neck / shoulder / chest / pelvis / elbow / wrist / hand / knee / ankle / shoe を意識する。 */
const WK_SHOULDER = { slim: 9.5, regular: 11, broad: 12.5 } as const;
const WK_THIGH = { slim: 7, regular: 7.5, broad: 8.2 } as const;
const SHIRT = "#f5f2ec";
const SHOE = "#2f3745";

/** 付け根 a → 関節 b → 末端 c を結ぶ曲線の四肢。 */
function Limb({ a, b, c, w, color }: { a: [number, number]; b: [number, number]; c: [number, number]; w: number; color: string }) {
  return <path d={`M${a[0]},${a[1]} Q${b[0]},${b[1]} ${c[0]},${c[1]}`} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" />;
}

const HAIR_TIE = "#2b2b30";

/** 縮小頭部(rx7.9/ry8.5)向けに成人輪郭へ再調整した11種。3/4奥向きのため後頭部(-x側)へ量を置く。 */
function WkHair({ style, color }: { style: V3HairStyle; color: string }) {
  const cap = <path d="M-7.9,-1 A7.9,8.5 0 0 1 7.9,-1 L7.9,3 Q0,-3 -7.9,3 Z" fill={color} />;
  switch (style) {
    case "crop":
      return <path d="M-7.9,-0.4 A7.9,8.5 0 0 1 7.9,-0.4 L7.9,3.8 Q0,-1.8 -7.9,4 Z" fill={color} />;
    case "undercut":
      return (
        <g>
          <path d="M-7.9,-1.6 A7.9,8.5 0 0 1 7.9,-1.6 L7.3,0.8 Q0,-3.6 -7.3,1.2 Z" fill={color} />
          <path d="M-7.3,0.8 Q0,-1.2 7.3,0.8 L7,3 Q0,1.2 -7,3.2 Z" fill={color} opacity={0.4} />
        </g>
      );
    case "sidepart":
      return (
        <g>
          {cap}
          <path d="M-7.4,-2.6 Q-1,-8.6 7.9,-2.2 Q1.6,-5.6 -7.4,-0.4 Z" fill={color} />
        </g>
      );
    case "bob":
      return (
        <g>
          {cap}
          <path d="M-8.3,-1.4 Q-10.4,5.8 -6.6,9.2 L-4,7.3 Q-6.6,1.4 -5.6,-0.6 Z" fill={color} />
          <path d="M8.3,-1.4 Q10.4,5.8 6.6,9.2 L4,7.3 Q6.6,1.4 5.6,-0.6 Z" fill={color} />
        </g>
      );
    case "wavy":
      return (
        <g>
          {cap}
          <path d="M-8,-1.4 Q-11,3 -8,5 Q-11,7.6 -7.2,10 L-5,8 Q-7.2,3 -5.6,-1 Z" fill={color} />
          <path d="M8,-1.4 Q11,3 8,5 Q11,7.6 7.2,10 L5,8 Q7.2,3 5.6,-1 Z" fill={color} />
        </g>
      );
    case "long":
      return (
        <g>
          {cap}
          <path d="M-8.4,-1.8 Q-10,7 -8.4,15 L-4.6,15 Q-6,6 -5.4,-1 Z" fill={color} />
          <path d="M8.4,-1.8 Q10,7 8.4,15 L4.6,15 Q6,6 5.4,-1 Z" fill={color} />
        </g>
      );
    case "ponytail":
      return (
        <g>
          {cap}
          <path d="M-7.2,-2.4 Q-13.2,-2 -12.4,5 Q-14.2,10 -10.8,13.6 Q-8,10 -8.6,4 Q-8,-1.4 -6.2,-2.6 Z" fill={color} />
          <ellipse cx={-11.4} cy={-1.4} rx={1.6} ry={2} fill={HAIR_TIE} />
        </g>
      );
    case "tiedback":
      return (
        <g>
          {cap}
          <path d="M-7.2,-2 Q-11.2,-0.6 -10.2,6 Q-8.8,3 -6.8,1.4 Q-7.2,-0.6 -6.2,-2 Z" fill={color} />
          <ellipse cx={-8.6} cy={0.4} rx={1.4} ry={1.8} fill={HAIR_TIE} />
        </g>
      );
    case "braid":
      return (
        <g>
          {cap}
          <path d="M-7,-2.2 Q-11.4,-1 -10.6,4 L-7.2,3 Q-7.4,-0.6 -6,-2 Z" fill={color} />
          <circle cx={-9.4} cy={4.6} r={2.4} fill={color} />
          <circle cx={-9.6} cy={8.4} r={2.1} fill={color} />
          <circle cx={-9.8} cy={11.6} r={1.8} fill={color} />
        </g>
      );
    case "bun":
      return (
        <g>
          {cap}
          <circle cx={-5.2} cy={-6.2} r={4.1} fill={color} />
          <circle cx={-5.2} cy={-6.2} r={4.1} fill="rgba(0,0,0,0.08)" />
        </g>
      );
    case "curly":
      return (
        <g>
          <path d="M-7.9,-1 A7.9,8.5 0 0 1 7.9,-1 L7.9,2 Q0,-3 -7.9,2 Z" fill={color} />
          <circle cx={-5.4} cy={-3.2} r={4} fill={color} />
          <circle cx={0} cy={-5.6} r={4.4} fill={color} />
          <circle cx={5.4} cy={-3.2} r={4} fill={color} />
          <circle cx={-7} cy={1.2} r={3.3} fill={color} />
          <circle cx={7} cy={1.2} r={3.3} fill={color} />
        </g>
      );
    default:
      return <g>{cap}</g>;
  }
}

/** 顔。作業対象側（-x）を向く。tilt で伏し目。既定は丸眼鏡、square で角眼鏡。 */
function WkHead({ cx, cy, tilt, a }: { cx: number; cy: number; tilt: number; a: V3Appearance }) {
  const square = a.squareGlasses ?? false;
  return (
    <g transform={`translate(${cx},${cy}) rotate(${tilt})`}>
      <ellipse cx={0} cy={0} rx={7.9} ry={8.5} fill={a.skin} />
      <path d="M7.9,-1 A7.9,8.5 0 0 1 1,8 L0,0 Z" fill="#000" opacity={0.07} />
      <WkHair style={a.hairStyle} color={a.hair} />
      {/* 目：作業対象側の1つだけを短い横線で。固定笑顔は描かない。 */}
      <line x1={-6.4} y1={-0.6} x2={-4.1} y2={-0.8} stroke="#2c2a2c" strokeWidth={1.4} strokeLinecap="round" />
      {/* 鼻：短い影 */}
      <path d="M-7.4,0.6 Q-8.4,2 -7.1,3.1" stroke="#b98a72" strokeWidth={1} fill="none" strokeLinecap="round" />
      {/* 口：中立線 */}
      <line x1={-6} y1={4.4} x2={-3.9} y2={4.1} stroke="#a9705d" strokeWidth={1.1} strokeLinecap="round" />
      {a.glasses ? (
        square ? (
          <g stroke="#3a3f48" strokeWidth={1.1} fill="#cfe6f2" fillOpacity={0.32}>
            <rect x={-7.7} y={-3} width={5.4} height={4.8} rx={0.8} />
            <rect x={-1.4} y={-3.4} width={4.4} height={4.8} rx={0.8} />
            <path d="M-2.3,-1 L-1.4,-1.2" fill="none" />
          </g>
        ) : (
          <g stroke="#3e4756" strokeWidth={1.1} fill="#cfe6f2" fillOpacity={0.35}>
            <circle cx={-5.1} cy={-0.6} r={2.7} />
            <circle cx={0.4} cy={-1} r={2.1} />
            <path d="M-2.4,-0.9 L-1.7,-1.1" fill="none" />
          </g>
        )
      ) : null}
    </g>
  );
}

/** ヘッドセット。頭ローカル(rx7.9)に重ねる。強い電話ポーズにはしない小型。 */
function WkHeadset() {
  return (
    <g>
      <path d="M-7,-3.4 Q0,-11 7,-3.4" stroke="#5a6472" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <rect x={-8.6} y={-3.6} width={2.7} height={4.8} rx={1.2} fill="#5a6472" />
      <rect x={5.9} y={-3.6} width={2.7} height={4.8} rx={1.2} fill="#5a6472" />
      <path d="M-8,1.2 Q-8,5 -4,5.6" stroke="#5a6472" strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <circle cx={-3.7} cy={5.8} r={1} fill="#7f8b9c" />
    </g>
  );
}

/** 胴。衣服は「色」でなく「輪郭」で見分ける。8種の襟・前立て・裾で差を出す。
 *  knitVest のときは呼び出し側が袖を白（シャツ）で描く。longSkirt は胴=blouse相当。 */
function WkTorso({ sx, sy, hx, hy, sw, kind, color }: {
  sx: number; sy: number; hx: number; hy: number; sw: number;
  kind: V3ClothingType; color: string;
}) {
  const midY = (sy + hy) / 2;
  // blouse / cardigan / longSkirt は裾を少し広げる
  const hemK = kind === "blouse" || kind === "cardigan" || kind === "longSkirt" ? 0.95 : 0.8;
  const d = `M${sx - sw},${sy + 1} Q${(sx - sw + hx - sw * hemK) / 2 - 3},${midY} ${hx - sw * hemK},${hy} L${hx + sw * hemK},${hy} Q${(sx + sw + hx + sw * hemK) / 2 + 3},${midY} ${sx + sw},${sy - 1} Q${sx},${sy - 5} ${sx - sw},${sy + 1} Z`;
  return (
    <g>
      {kind === "knitVest" ? (
        <path d={`M${sx - sw - 1},${sy + 3} Q${sx},${sy - 6} ${sx + sw + 1},${sy + 1} L${sx + sw - 2},${sy + 8} Q${sx},${sy + 1} ${sx - sw + 2},${sy + 9} Z`} fill={SHIRT} />
      ) : null}
      <path d={d} fill={color} />

      {kind === "jacket" ? (
        <g>
          <path d={`M${sx - 3.4},${sy - 1} L${sx},${sy + 9} L${sx + 3.4},${sy - 2} Z`} fill={SHIRT} />
          <path d={`M${sx - 3.8},${sy - 1} L${sx - 1},${sy + 9} L${sx - 7},${sy + 4} Z`} fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth={0.5} />
          <path d={`M${sx + 4},${sy - 2} L${sx + 1},${sy + 9} L${sx + 7.2},${sy + 3} Z`} fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth={0.5} />
          <line x1={sx} y1={sy + 9} x2={hx} y2={hy - 1} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
        </g>
      ) : null}

      {kind === "shirt" ? (
        <g>
          <path d={`M${sx - 3},${sy - 1} L${sx},${sy + 4.5} L${sx + 3},${sy - 2} Z`} fill={SHIRT} />
          <line x1={sx} y1={sy + 3} x2={hx - 0.6} y2={hy - 2} stroke="rgba(0,0,0,0.16)" strokeWidth={0.9} />
          <circle cx={sx - 0.7} cy={sy + 8} r={0.7} fill="rgba(0,0,0,0.22)" />
          <circle cx={(sx + hx) / 2 - 1} cy={(sy + hy) / 2} r={0.7} fill="rgba(0,0,0,0.22)" />
        </g>
      ) : null}

      {kind === "polo" ? (
        <g>
          <path d={`M${sx - 3.6},${sy - 0.4} Q${sx},${sy + 2.6} ${sx + 3.6},${sy - 1.4} L${sx + 2.6},${sy + 1.8} Q${sx},${sy + 4.4} ${sx - 2.6},${sy + 1.6} Z`} fill="rgba(255,255,255,0.16)" />
          <line x1={sx - 0.3} y1={sy + 1} x2={sx - 1.4} y2={sy + 9} stroke="rgba(0,0,0,0.2)" strokeWidth={0.9} />
        </g>
      ) : null}

      {kind === "knit" ? (
        <path d={`M${sx - 4},${sy - 1} Q${sx},${sy + 3.6} ${sx + 4},${sy - 2}`} fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth={1.4} />
      ) : null}

      {kind === "cardigan" ? (
        <g>
          <path d={`M${sx - 1.7},${sy + 1} L${hx - 1.7},${hy} L${hx + 1.7},${hy} L${sx + 1.7},${sy + 1} Z`} fill={SHIRT} opacity={0.92} />
          <line x1={sx - 2.6} y1={sy + 1} x2={hx - 2} y2={hy - 1} stroke="rgba(0,0,0,0.17)" strokeWidth={1.1} />
          <line x1={sx + 2.6} y1={sy + 1} x2={hx + 2} y2={hy - 1} stroke="rgba(0,0,0,0.17)" strokeWidth={1.1} />
          <path d={`M${sx - 3.6},${sy - 1} Q${sx},${sy + 2.8} ${sx + 3.6},${sy - 2}`} fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth={1.2} />
        </g>
      ) : null}

      {kind === "blouse" || kind === "longSkirt" ? (
        <g>
          <path d={`M${sx - 4.6},${sy - 1.4} Q${sx},${sy + 5} ${sx + 4.6},${sy - 2.6}`} fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth={1.3} />
          <path d={`M${sx - 1.7},${sy + 1} L${sx},${sy + 4.2} L${sx + 1.7},${sy + 1} L${sx + 3.1},${sy + 3.4} L${sx},${sy + 3.8} L${sx - 3.1},${sy + 3.4} Z`} fill="rgba(255,255,255,0.18)" />
        </g>
      ) : null}

      {kind === "knitVest" ? (
        <path d={`M${sx - 3.6},${sy - 2} L${sx},${sy + 8} L${sx + 3.6},${sy - 3} L${sx + 2},${sy - 3.4} L${sx},${sy + 3.6} L${sx - 2},${sy - 2.6} Z`} fill={SHIRT} />
      ) : null}
    </g>
  );
}

/** 立位のロングスカート（A ライン）。裾から靴がのぞく。 */
function WkSkirtStand({ sw, color }: { sw: number; color: string }) {
  return <path d={`M${-sw - 1},-46 L${-sw - 5},-15 Q0,-10 ${sw + 5},-15 L${sw + 1},-46 Q0,-40 ${-sw - 1},-46 Z`} fill={color} />;
}

/** 座位のロングスカート。腰→膝へ布が流れ、膝で軽く折れる。2〜3面の簡潔な形。
 *  裾は一枚板にせず、足首・靴は隠しすぎない。 */
function WkSkirtSit({ color }: { color: string }) {
  return (
    <g>
      {/* 主ドレープ：腰から膝方向へ。裾は緩い波。座面へ少し掛かる。 */}
      <path d="M7,-31 Q9,-24 5,-17 Q-3,-13 -9,-15 Q-14,-12 -18,-15 Q-21,-20 -17,-26 L-13,-30 Q-3,-32 7,-31 Z" fill={color} />
      {/* 膝で折れて垂れる布（別面：わずかに陰） */}
      <path d="M-8,-24 L-19,-16 Q-22,-11 -17,-10 L-9,-14 Q-6,-19 -8,-24 Z" fill={color} />
      <path d="M-8,-24 L-19,-16 Q-22,-11 -17,-10 L-9,-14 Q-6,-19 -8,-24 Z" fill="rgba(0,0,0,0.10)" />
      {/* 腿に沿うヒダ一本だけ（描き込みすぎない） */}
      <path d="M3,-29 Q-6,-25 -14,-19" fill="none" stroke="rgba(0,0,0,0.11)" strokeWidth={1.1} strokeLinecap="round" />
    </g>
  );
}

/** 座位に必要な椅子。家具データ(v3Furniture)は変更せず、着座ユニットの一部として人物側で描く。
 * 背もたれは胴の後ろ（観客側 +x）に少しだけのぞく。座面は机エッジでほぼ隠れる。 */
function WkChairBack() {
  return (
    <g transform="translate(10,-4)">
      <rect x={-3} y={-48} width={8} height={34} rx={4} fill="#454f5e" />
      <rect x={-1} y={-14} width={3} height={12} fill="#3a4350" />
    </g>
  );
}

function WkChairSeat() {
  return (
    <g>
      <rect x={-1} y={-24} width={4} height={22} fill="#3a4350" />
      <ellipse cx={1} cy={-3} rx={12} ry={4} fill="#39434f" />
      <polygon points="1,-30 14,-25 1,-20 -12,-25" fill="#4b5768" />
      <polygon points="1,-28 14,-23 14,-25 1,-30 -12,-25 -12,-23" fill="#3d4859" />
    </g>
  );
}

/** 机の手前エッジ。座位の腿・膝を奥へ隠し「脚は机の下」を成立させる。天板は薄く、
 * 前面は床近くまで（実机 Desk が床までの塊のため）。机の座標・サイズ・配置は不変。 */
function WkDeskEdge() {
  return (
    <g>
      <polygon points="10,-33 -86,-79 -86,-31 10,-6" fill="#bfa079" />
      <polygon points="10,-33 -86,-79 -86,-75 10,-29" fill="rgba(0,0,0,0.08)" />
      {/* 天板：奥(NW)側を実机の下へ十分に伸ばして継ぎ目を隠す */}
      <polygon points="10,-33 -86,-79 -102,-86 -4,-40" fill="#d9c4a4" />
    </g>
  );
}

function WkKeyboard() {
  return (
    <g>
      <polygon points="-4,-40 -30,-51 -40,-46 -14,-35" fill="#39434f" />
      <polygon points="-6,-41 -29,-50.5 -37,-46.5 -14,-37" fill="#4a5666" />
      <ellipse cx={2} cy={-35} rx={4} ry={2.6} fill="#39434f" transform="rotate(-24 2 -35)" />
    </g>
  );
}

function WkDocuments() {
  return (
    <g>
      <polygon points="-2,-38 -28,-49 -42,-42 -16,-31" fill="#f4efe3" />
      <polygon points="-2,-38 -28,-49 -42,-42 -16,-31" fill="none" stroke="#cabfa6" strokeWidth={0.8} />
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={-9 - i * 3.4} y1={-35.4 - i * 2.3} x2={-27 - i * 3.4} y2={-42.4 - i * 2.3} stroke="#b3a88f" strokeWidth={1} />
      ))}
    </g>
  );
}

/* --- 机上の小物（全て机エッジ座標系。手・机・膝のいずれかへ接触させる）。 --- */
function WkMemoPad() {
  return (
    <g>
      <polygon points="8,-33 20,-28 15,-24 3,-29" fill="#f2ece0" />
      <polygon points="8,-33 20,-28 15,-24 3,-29" fill="none" stroke="#c9bda2" strokeWidth={0.7} />
      <line x1={7} y1={-30.6} x2={15} y2={-27.4} stroke="#b3a88f" strokeWidth={0.8} />
    </g>
  );
}
function WkSmartphone() {
  return (
    <g transform="translate(12,-33) rotate(-22)">
      <rect x={-3} y={-6} width={6} height={12} rx={1.4} fill="#2b333f" />
      <rect x={-2.2} y={-5} width={4.4} height={9} rx={0.6} fill="#6b7f92" />
    </g>
  );
}
function WkWaterBottle() {
  return (
    <g transform="translate(16,-38)">
      <rect x={-2.5} y={-15} width={5} height={17} rx={2.4} fill="#8fb8c6" />
      <rect x={-1.8} y={-18} width={3.6} height={4} rx={1} fill="#5f7c86" />
    </g>
  );
}
function WkFileStack() {
  return (
    <g transform="translate(8,-35)">
      <polygon points="0,0 17,7 12,12 -5,5" fill="#c9a061" />
      <polygon points="0,-3 17,4 17,7 0,0 -5,5 -5,2" fill="#b58f4f" />
    </g>
  );
}
function WkBusinessCards() {
  return (
    <g transform="translate(2,-32)">
      <polygon points="0,0 11,4 7,7 -4,3" fill="#fbf7ee" stroke="#dfd9c8" strokeWidth={0.4} />
      <polygon points="3,-2 13,2 9,5 -1,1" fill="#ffffff" stroke="#dfd9c8" strokeWidth={0.4} />
    </g>
  );
}
function WkNotebook() {
  return (
    <g transform="translate(-14,-37)">
      <polygon points="0,0 20,9 14,15 -6,6" fill="#4d6b63" />
      <polygon points="0,0 20,9 14,15 -6,6" fill="none" stroke="#3a5049" strokeWidth={0.8} />
      <line x1={-2} y1={4} x2={13} y2={11} stroke="#e8e2d2" strokeWidth={1} />
      <line x1={-3} y1={6.6} x2={9} y2={12} stroke="#e8e2d2" strokeWidth={0.8} />
    </g>
  );
}

/** 立位レビューで両手に持つ資料。clipboard / tablet / openBook。 */
function WkHeldItem({ kind, hand }: { kind: V3DeskItem | "clipboard"; hand: string }) {
  if (kind === "tablet") {
    return (
      <g transform="translate(-1,-66) rotate(-8)">
        <rect x={-11} y={-8} width={22} height={16} rx={2} fill="#33404f" />
        <rect x={-9} y={-6} width={18} height={12} rx={1} fill="#7fb8cf" />
      </g>
    );
  }
  if (kind === "openBook") {
    return (
      <g transform="translate(-1,-64)">
        <path d="M-12,-7 Q-1,-10 -1,-6 L-1,7 Q-12,4 -12,-1 Z" fill="#f2ece0" />
        <path d="M11,-7 Q1,-10 1,-6 L1,7 Q11,4 11,-1 Z" fill="#e7dfce" />
        <path d="M-1,-6 L-1,7" stroke="#c3b79c" strokeWidth={1} />
        <path d="M-9,-3 L-3,-4 M-9,0 L-3,-1 M3,-4 L9,-3 M3,-1 L9,0" stroke="#b7ab90" strokeWidth={0.8} />
      </g>
    );
  }
  // clipboard（チェックリスト＋ペン）
  return (
    <g transform="translate(-1,-65) rotate(-6)">
      <rect x={-9} y={-11} width={18} height={22} rx={1.5} fill="#5b6675" />
      <rect x={-7} y={-9} width={14} height={18} fill="#f4efe3" />
      <rect x={-3} y={-12} width={6} height={3} rx={1} fill="#8b95a4" />
      <path d="M-4,-5 L4,-5 M-4,-1 L4,-1 M-4,3 L2,3" stroke="#b3a88f" strokeWidth={1} />
      <g transform="translate(6,2) rotate(40)">
        <rect x={-1.2} y={-6} width={2.4} height={11} rx={1} fill="#394453" />
        <rect x={-1.2} y={-8.4} width={2.4} height={3} rx={0.7} fill="#c07a5c" />
      </g>
      <circle cx={-8} cy={9} r={2.6} fill={hand} />
    </g>
  );
}

/** 13名共通の社員フィギュア。姿勢は appearance.workerPose で切り替える。 */
function WorkerFigure({ pose, a }: { pose: V3WorkerPose; a: V3Appearance }) {
  const sw = WK_SHOULDER[a.build];
  const th = WK_THIGH[a.build];
  const clothing: V3ClothingType = a.clothingType ?? "knit";
  const items = a.deskItems ?? [];
  const armColor = clothing === "knitVest" ? SHIRT : a.outfit;
  const slacks = a.outfitAlt;
  // フィギュア全体の内部オフセット/内部scale（家具との重なり回避。品質管理のみ使用）。
  const nx = a.figureNudge?.x ?? 0;
  const ny = a.figureNudge?.y ?? 0;
  const ns = a.figureNudge?.scale ?? 1;

  /* ---------------- 立位（standDirect / standReview） ---------------- */
  if (isStandPose(pose)) {
    const review = pose === "standReview";
    const tilt = a.gazeTilt ?? (review ? -16 : -7);
    const skirt = clothing === "longSkirt";
    return (
      <g transform={`translate(${nx},${ny}) scale(${ns})`}>
        {/* 脚：重心は奥(-x)側へ。手前脚は軽く前・膝をわずかに曲げる（誇張しない自然な重心移動）。 */}
        {/* 手前脚（自由脚・やや前、膝を軽く曲げる） */}
        <Limb a={[2.6, -50]} b={[5.2, -34]} c={[6, -24]} w={th} color={slacks} />
        <Limb a={[6, -24]} b={[6.6, -14]} c={[6.4, -3]} w={th - 1} color={slacks} />
        <ellipse cx={5} cy={-2} rx={6.8} ry={3.1} fill={SHOE} transform="rotate(10 5 -2)" />
        {/* 骨盤：支持脚(-x)側へわずかに寄せる */}
        <ellipse cx={-1.8} cy={-50} rx={sw * 0.92} ry={7} fill={slacks} />
        {/* 奥脚（支持脚・ほぼ垂直） */}
        <Limb a={[-3, -50]} b={[-3.4, -33]} c={[-3.6, -24]} w={th + 0.6} color={slacks} />
        <Limb a={[-3.6, -24]} b={[-3.8, -13]} c={[-4, -2]} w={th} color={slacks} />
        <ellipse cx={-6} cy={-1} rx={7} ry={3.4} fill={SHOE} transform="rotate(-4 -6 -1)" />
        {skirt ? <WkSkirtStand sw={sw} color={a.outfit} /> : null}

        {review ? (
          /* 奥腕：胸前の資料を支える */
          <Limb a={[-3 - sw, -85]} b={[-sw - 3, -73]} c={[-7, -64]} w={5.4} color={armColor} />
        ) : (
          /* 奥（モニター側）の腕：低い位置で指示。指先はモニター方向(-x)へ。 */
          <g>
            <Limb a={[-3 - sw, -85]} b={[-sw - 7, -71]} c={[-sw - 13, -60]} w={5.4} color={armColor} />
            <circle cx={-sw - 13} cy={-60} r={3.4} fill={a.skin} />
            <path d={`M${-sw - 13},-60 L${-sw - 19},-58`} stroke={a.skin} strokeWidth={2.8} strokeLinecap="round" />
          </g>
        )}

        {/* 胴・首・頭：支持脚側へごく軽く重心を移す（sx=-3） */}
        <WkTorso sx={-3} sy={-86} hx={-1} hy={-50} sw={sw} kind={clothing} color={a.outfit} />
        <path d="M-4,-87 L-5,-95" stroke={a.skin} strokeWidth={5} strokeLinecap="round" />
        <WkHead cx={-6} cy={-101} tilt={tilt} a={a} />
        {a.headset ? <g transform="translate(-6,-101)"><WkHeadset /></g> : null}

        {review ? (
          <g>
            {/* 手前腕：もう一方の手で資料を支える */}
            <Limb a={[-3 + sw, -85]} b={[sw + 3, -73]} c={[5, -63]} w={5.4} color={armColor} />
            <WkHeldItem kind={items[0] ?? "clipboard"} hand={a.skin} />
            <circle cx={-7} cy={-64} r={3.3} fill={a.skin} />
            <circle cx={5} cy={-63} r={3.3} fill={a.skin} />
          </g>
        ) : (
          <g>
            {/* 手前腕：体側でタブレットを手で支える */}
            <Limb a={[-3 + sw, -85]} b={[sw + 4, -73]} c={[sw + 2, -61]} w={5.4} color={armColor} />
            <g transform={`translate(${sw + 3},-64) rotate(-20)`}>
              <rect x={-5} y={-8} width={13} height={17} rx={2} fill="#33404f" />
              <rect x={-3.4} y={-6.4} width={9.8} height={14} rx={1} fill="#7fb8cf" />
            </g>
            <circle cx={sw + 2} cy={-61} r={3.6} fill={a.skin} />
          </g>
        )}
      </g>
    );
  }

  /* ---------------- 座位（sitKeyboard / sitDesk / sitCall） ---------------- */
  const hipY = -28;
  const sy = -60;
  const lean = pose === "sitKeyboard" ? -3 : pose === "sitDesk" ? -1 : 0;
  const tilt = a.gazeTilt ?? (pose === "sitKeyboard" ? -14 : pose === "sitDesk" ? -20 : -8);
  const dx = a.deskAdjust?.dx ?? 0;
  const dy = a.deskAdjust?.dy ?? 0;
  const skirt = clothing === "longSkirt";

  return (
    // 机側（NW=-x,-y）へわずかに寄せて着席させる。gx/gy は不変、描画上のオフセットのみ。
    <g transform={`translate(${-4 + nx},${-2 + ny}) scale(${ns})`}>
      {/* 靴の下の接地影（親の接地影は原点付近を担うため補う）。 */}
      <ellipse cx={-18} cy={-1} rx={12} ry={4} fill="#1b2233" opacity={0.16} />
      <WkChairBack />
      <WkChairSeat />
      {/* 脚：膝・足を机の下へ。足首は床(y≈-2)へ接地。 */}
      <Limb a={[2, hipY]} b={[-8, -27]} c={[-17, -25]} w={th + 0.6} color={slacks} />
      <Limb a={[-17, -25]} b={[-18, -14]} c={[-19, -2]} w={th} color={slacks} />
      <ellipse cx={-22} cy={-2} rx={6.4} ry={3.1} fill={SHOE} />
      {/* 骨盤：椅子座面へ乗せる（座面ポリゴンと重なる高さ）。 */}
      <ellipse cx={1} cy={hipY} rx={sw * 0.98} ry={6.6} fill={slacks} />
      <Limb a={[1, hipY + 1]} b={[-8, -26]} c={[-16, -24]} w={th} color={slacks} />
      <Limb a={[-16, -24]} b={[-15, -13]} c={[-16, -2]} w={th - 1} color={slacks} />
      <ellipse cx={-19} cy={-1} rx={6.6} ry={3.2} fill={SHOE} />
      {skirt ? <WkSkirtSit color={a.outfit} /> : null}
      {/* 胴・首・頭（作業対象へ伏し目） */}
      <WkTorso sx={lean} sy={sy} hx={2} hy={hipY} sw={sw} kind={clothing} color={a.outfit} />
      <path d={`M${lean - 1},${sy - 1} L${lean - 2},${sy - 8}`} stroke={a.skin} strokeWidth={4.6} strokeLinecap="round" />
      <WkHead cx={lean - 3} cy={sy - 13} tilt={tilt} a={a} />
      {a.headset ? <g transform={`translate(${lean - 3},${sy - 13})`}><WkHeadset /></g> : null}
      {/* 机の手前エッジ＝腿の手前。以降は机上（作業対象）。席ごとに dx/dy 調整。 */}
      <g transform={`translate(${dx},${dy})`}>
        <WkDeskEdge />
      </g>

      {pose === "sitKeyboard" ? (
        <>
          <g transform={`translate(${dx},${dy})`}>
            <WkKeyboard />
            {items.includes("memoPad") ? <WkMemoPad /> : null}
            {items.includes("smartphone") ? <WkSmartphone /> : null}
            {items.includes("waterBottle") ? <WkWaterBottle /> : null}
            {items.includes("papers") ? <g transform="translate(20,6)"><WkDocuments /></g> : null}
          </g>
          {/* 奥腕→キーボード / 手前腕→マウス。手首を机の高さ(y≈-44)へ合わせる。 */}
          <Limb a={[lean - sw, sy + 1]} b={[-12, -46]} c={[-24, -44]} w={5} color={armColor} />
          <Limb a={[lean + sw, sy]} b={[5, -44]} c={[1, -35]} w={5} color={armColor} />
          <circle cx={-24 + dx} cy={-44 + dy} r={3.3} fill={a.skin} />
          <circle cx={1 + dx} cy={-35 + dy} r={3.3} fill={a.skin} />
        </>
      ) : pose === "sitDesk" ? (
        <>
          <g transform={`translate(${dx},${dy})`}>
            {items.includes("fileStack") ? <WkFileStack /> : null}
            <WkDocuments />
            {items.includes("businessCards") ? <WkBusinessCards /> : null}
            {items.includes("memoPad") ? <WkMemoPad /> : null}
          </g>
          {/* 手前手＝書類を押さえる / 奥手＝ペンで行を追う。書類は観客側へ向けない。 */}
          <Limb a={[lean + sw, sy]} b={[2, -44]} c={[-12, -38]} w={5} color={armColor} />
          <Limb a={[lean - sw, sy + 1]} b={[-14, -48]} c={[-26, -44]} w={5} color={armColor} />
          <ellipse cx={-12 + dx} cy={-38 + dy} rx={4} ry={2.7} fill={a.skin} />
          <g transform={`translate(${-26 + dx},${-44 + dy}) rotate(38)`}>
            <rect x={-1.4} y={-7} width={2.8} height={12} rx={1} fill="#394453" />
            <rect x={-1.4} y={-9.5} width={2.8} height={3} rx={0.8} fill="#c07a5c" />
          </g>
          <circle cx={-26 + dx} cy={-44 + dy} r={3.2} fill={a.skin} />
        </>
      ) : (
        /* sitCall：通話中はヘッドセットと視線で伝える。手は顔へ寄せず、机側／軽いジェスチャーへ。 */
        <>
          <g transform={`translate(${dx},${dy})`}>
            {items.includes("notebook") ? <WkNotebook /> : <WkKeyboard />}
            {items.includes("memoPad") ? <WkMemoPad /> : null}
          </g>
          {/* 奥腕：机上（ノート／キーボード）へ。 */}
          <Limb a={[lean - sw, sy + 1]} b={[-12, -46]} c={[-22, -42]} w={5} color={armColor} />
          <circle cx={-22 + dx} cy={-42 + dy} r={3.3} fill={a.skin} />
          {/* 手前腕：机の手前で軽く手を開くジェスチャー（顔からは十分離す）。 */}
          <Limb a={[lean + sw, sy]} b={[sw + 5, -50]} c={[8, -42]} w={5} color={armColor} />
          <circle cx={8 + dx} cy={-42 + dy} r={3.2} fill={a.skin} />
          <path d={`M${9 + dx},${-42 + dy} l4,-1.4 M${9 + dx},${-40 + dy} l4.4,0.4`} stroke={a.skin} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

type Props = {
  view: V3AgentView;
  selected: boolean;
  dimmed: boolean;
  onSelect: (agentId: string) => void;
  /**
   * デモ進行中、このエージェントが現在の担当である場合だけ true。
   * 元データ（duties/appearance/役割名/座標/固定ステータス）は一切変更せず、
   * 表示層のオーバーライド（一時ステータスの追加表示・控えめな強調）に限定する。
   */
  isDemoActive?: boolean;
  demoStatusText?: string;
};

export default function OfficeAgent({ view, selected, dimmed, onSelect, isDemoActive = false, demoStatusText }: Props) {
  const { placement, name, role } = view;
  const a = placement.appearance;
  const x = isoX(placement.gx, placement.gy);
  const y = isoY(placement.gx, placement.gy);
  const flip = placement.facing === "nw" || placement.facing === "sw" ? -1 : 1;
  const sw = BUILD_SHOULDER[a.build];
  const arms = armsFor(a.pose, sw);
  const lean = a.pose === "typing" || a.pose === "reviewing" ? 2 : 0;
  // 13名共通の社員フィギュア。workerPose 未指定のみ従来表現へフォールバック。
  const workerPose = a.workerPose ?? null;
  const seatedWorker = workerPose != null && !isStandPose(workerPose);

  // ラベルは役割名＋状態ドットのみの1行表示にし、人物との間隔を統一する。
  // テキストは常にstart基準にして、位置(上下左右)ごとに箱の左端だけをずらす。
  const label = placement.labelPosition;
  const boxW = placement.shortRole.length * 13 + 28;
  // 着座フィギュアは頭が低いぶん、余白が空きすぎる上／左右ラベルだけを V3 Claude 側で最小限詰める（gx/gy は不変）。
  const lyAdj = seatedWorker ? (label === "top" ? 28 : label === "bottom" ? 0 : 18) : 0;
  const labelPos =
    label === "top" ? { lx: -boxW / 2, ly: -132 + lyAdj }
    : label === "bottom" ? { lx: -boxW / 2, ly: 26 + lyAdj }
    : label === "left" ? { lx: -boxW - 22, ly: -96 + lyAdj }
    : { lx: 22, ly: -96 + lyAdj };
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
      {isDemoActive ? <ellipse className={s.demoActiveRing} cx={0} cy={-40} rx={50} ry={85} /> : null}

      <g transform={`scale(${placement.scale}) translate(0,0)`}>
        {workerPose ? (
          // 全身上下動なし・接触点固定の静止表現。新アニメーションは付けない。
          <WorkerFigure pose={workerPose} a={a} />
        ) : (
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
        )}
      </g>

      <g
        className={`${s.agentLabel} ${placement.hierarchyLevel === "management" ? s.agentLabelManagement : ""}`}
        transform={`translate(${labelPos.lx}, ${labelPos.ly})`}
      >
        <rect x={0} y={-11} width={boxW} height={22} rx={8} />
        <circle cx={13} cy={0} r={3.2} fill={statusDot} className={s.statusDot} />
        <text x={22} y={4} textAnchor="start" className={s.labelRole}>
          {placement.shortRole}
        </text>
      </g>

      {isDemoActive && demoStatusText ? (
        <g className={s.demoActiveBadge} transform={`translate(${labelPos.lx}, ${labelPos.ly + 27})`}>
          <rect x={0} y={-9} width={Math.max(boxW, demoStatusText.length * 12 + 18)} height={18} rx={7} />
          <text x={9} y={4} textAnchor="start" className={s.demoActiveText}>
            {demoStatusText}
          </text>
        </g>
      ) : null}
    </g>
  );
}
