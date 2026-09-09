"use client";

import { ArrowUp } from "lucide-react";
import { v3Layout1f } from "@/data/officeV3ClaudeLayout.1f";
import { v3Layout2f } from "@/data/officeV3ClaudeLayout.2f";
import { v3Layout3f } from "@/data/officeV3ClaudeLayout.3f";
import { v3Floors } from "@/data/officeV3ClaudeOrg";
import type { V3FloorLayout } from "@/types/officeV3Claude";
import type { V3FloorId } from "@/types/officeV3ClaudeOrg";
import s from "./BuildingOverview.module.css";

/**
 * Step13-A: BUILDING OVERVIEW（建物全体）MVP。
 *
 * 目的：1F/2F/3F を「上：3F → 下：1F」に縦積みした軽量オーバービューを見せ、
 * 各フロアカードから既存の 1F/2F/3F 詳細（floorView）へ入れる導線をつくる。
 *
 * - OfficeScene は再利用しない（×3 レンダーしない）。各フロアは専用の軽量 SVG。
 * - 人数・フロア名・floorTint は既存データ（v3Floors / v3LayoutXf）から導出し、重複ハードコードしない。
 * - dataRiser の本格表現・motion・HumanSeat 責任境界 polish は後続 Step。ここでは細い縦コネクタ1本のみ。
 */

type Props = {
  /** フロアカードを押したとき、その階の詳細（floorView）へ移動する。既存 changeFloor を渡す。 */
  onOpenFloor: (floorId: V3FloorId) => void;
};

/** MVP の最小限テキスト（役割の動詞・中心設備ラベル）。フロア名・人数はデータから取るのでここには置かない。 */
const CARD_TEXT: Record<V3FloorId, { action: string; center: string; captionOverride?: string }> = {
  "3f": { action: "判断・承認する", center: "DECISION / HUMAN APPROVAL", captionOverride: "DECISION FLOOR" },
  "2f": { action: "確認・整える", center: "QUALITY GATE" },
  "1f": { action: "動かす", center: "MATCHING HUB" },
};

/** 表示順は必ず 上=3F → 下=1F（DOM 順も同じ。読み上げ順と視覚順を一致させる）。 */
const FLOOR_ORDER: { floorId: V3FloorId; layout: V3FloorLayout }[] = [
  { floorId: "3f", layout: v3Layout3f },
  { floorId: "2f", layout: v3Layout2f },
  { floorId: "1f", layout: v3Layout1f },
];

const CYAN = "#63c1c7";
const GOLD = "#e2b877";

/** フロアの軽量ミニシーン。中心設備＋代表ノード数個＋floorTint だけ。全家具・全人物は描かない。 */
function MiniScene({ floorId, layout, aiCount }: { floorId: V3FloorId; layout: V3FloorLayout; aiCount: number }) {
  const tint = layout.floorTint ?? "#1b2230";
  const cx = 118;
  const cy = 46;

  return (
    <svg className={s.miniScene} viewBox="0 0 236 92" role="img" aria-hidden="true">
      <rect x={0} y={0} width={236} height={92} fill="#161c28" />
      <rect x={0} y={0} width={236} height={92} fill={tint} opacity={0.82} />
      {/* 夜景ラインの示唆 */}
      <line x1={0} y1={22} x2={236} y2={22} stroke="rgba(126,156,196,0.14)" />
      <line x1={0} y1={70} x2={236} y2={70} stroke="rgba(126,156,196,0.10)" />

      {floorId === "3f" ? (
        <>
          {/* 逆三角形：Human（上・中央）／ Mgr（左）／ 参謀（右）＋ 判断ノード */}
          <g fill="none" stroke={CYAN} strokeWidth={1.2} opacity={0.5}>
            <line x1={cx} y1={26} x2={70} y2={58} />
            <line x1={cx} y1={26} x2={166} y2={58} />
            <line x1={70} y1={58} x2={166} y2={58} />
          </g>
          <circle cx={70} cy={58} r={6} fill={CYAN} opacity={0.85} />
          <circle cx={166} cy={58} r={6} fill={CYAN} opacity={0.85} />
          <rect x={cx - 9} y={54} width={18} height={12} fill="rgba(99,193,199,0.16)" stroke={CYAN} strokeWidth={1} />
          {/* HumanSeat：金の小アクセントのみ */}
          <circle cx={cx} cy={26} r={7} fill="rgba(226,184,119,0.18)" stroke={GOLD} strokeWidth={1.6} />
          <text x={cx} y={16} textAnchor="middle" fill={GOLD} fontSize={8} fontWeight={700}>HUMAN</text>
          <text x={70} y={76} textAnchor="middle" fill="#c9d0dc" fontSize={7.5}>Mgr</text>
          <text x={166} y={76} textAnchor="middle" fill="#c9d0dc" fontSize={7.5}>参謀</text>
        </>
      ) : (
        <>
          {/* 中心設備＋周囲ノード（数は placements.length に対応） */}
          <rect x={cx - 34} y={cy - 12} width={68} height={24} rx={5} fill="rgba(99,193,199,0.14)" stroke={CYAN} strokeWidth={1.2} />
          {Array.from({ length: aiCount }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / aiCount - Math.PI / 2;
            const nx = cx + Math.cos(angle) * 78;
            const ny = cy + Math.sin(angle) * 30;
            return (
              <g key={i}>
                <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={CYAN} strokeWidth={1} opacity={0.35} />
                <circle cx={nx} cy={ny} r={4.5} fill={CYAN} opacity={0.75} />
              </g>
            );
          })}
        </>
      )}

      <text x={cx} y={cy + 3} textAnchor="middle" fill="#dfe6f0" fontSize={8.5} fontWeight={700} letterSpacing={0.4}>
        {CARD_TEXT[floorId].center}
      </text>
    </svg>
  );
}

export default function BuildingOverview({ onOpenFloor }: Props) {
  return (
    <div className={s.root}>
      <div className={s.inner}>
        <div className={s.stack}>
          {FLOOR_ORDER.map(({ floorId, layout }, index) => {
            const floor = v3Floors.find(f => f.id === floorId)!;
            const aiCount = layout.placements.length;
            const hasHuman = Boolean(layout.humanSeat);
            const caption = CARD_TEXT[floorId].captionOverride ?? floor.caption;

            return (
              <div key={floorId}>
                <button
                  type="button"
                  className={s.card}
                  onClick={() => onOpenFloor(floorId)}
                  aria-label={`${floorId.toUpperCase()} ${floor.name}を開く`}
                >
                  <span className={s.cardMeta}>
                    <span className={s.floorTopline}>
                      <span className={s.floorNum}>{floorId.toUpperCase()}</span>
                      <span className={s.floorEn}>{caption}</span>
                      <span className={s.floorRole}>{floor.name}</span>
                    </span>
                    <span className={s.floorAction}>{CARD_TEXT[floorId].action}</span>
                    <span className={s.floorCount}>
                      AI {aiCount}名
                      {hasHuman ? <span className={s.humanTag}>　＋　Human（最終判断・承認）</span> : null}
                    </span>
                  </span>
                  <MiniScene floorId={floorId} layout={layout} aiCount={aiCount} />
                </button>

                {/* フロア間の情報フロー（下→上）。装飾。意味は下の .flowNote が担う。 */}
                {index < FLOOR_ORDER.length - 1 ? (
                  <div className={s.flow} aria-hidden="true">
                    <span className={s.flowLine} />
                    <ArrowUp size={14} />
                    <span className={s.flowLine} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className={s.flowNote}>
          情報は <b>1F → 2F → 3F</b> へ上がる（実務 → 確認 → 判断・承認）。カードを選ぶと各フロアの詳細に入れます。
        </p>
      </div>
    </div>
  );
}
