"use client";

import { ArrowRight } from "lucide-react";
import { v3Layout1f } from "@/data/officeV3ClaudeLayout.1f";
import { v3Layout2f } from "@/data/officeV3ClaudeLayout.2f";
import { v3Layout3f } from "@/data/officeV3ClaudeLayout.3f";
import { v3Floors } from "@/data/officeV3ClaudeOrg";
import type { V3FloorLayout } from "@/types/officeV3Claude";
import type { V3FloorId } from "@/types/officeV3ClaudeOrg";
import BuildingRiser from "./BuildingRiser";
import s from "./BuildingOverview.module.css";

/**
 * Step13-A: BUILDING OVERVIEW（建物全体）。
 * Step13-C: フロア間の個別コネクタを廃し、1F→2F→3F→Human を一本で貫く BuildingRiser に統合。
 *           3F は「AI クラスタ → Decision → 承認ライン → Human 終端」の順で責任境界を明示。
 *           ミニシーンは aspect-ratio で縦圧縮を解消。
 *
 * 目的：1F/2F/3F を「上：3F → 下：1F」に縦積みした軽量オーバービューを見せ、
 * 各フロアカードから既存の 1F/2F/3F 詳細（floorView）へ入れる導線をつくる。
 *
 * - OfficeScene は再利用しない（×3 レンダーしない）。各フロアは専用の軽量 SVG。
 * - 人数・フロア名・floorTint は既存データ（v3Floors / v3LayoutXf）から導出し、重複ハードコードしない。
 * - motion / keyframes は入れない（静的）。
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
      <line x1={0} y1={15} x2={236} y2={15} stroke="rgba(126,156,196,0.14)" />
      <line x1={0} y1={81} x2={236} y2={81} stroke="rgba(126,156,196,0.10)" />

      {floorId === "3f" ? (
        <>
          {/* 下から上へ：AI クラスタ（下）→ Decision（中）→ 承認ライン → Human 終端（上）。
              Step13-D: 承認ラインと DECISION の間隔を広げ、責任境界を読みやすくする。 */}
          {/* AI クラスタ：Mgr ／ 参謀。cyan・neutral。 */}
          <g fill="none" stroke={CYAN} strokeWidth={1.2} opacity={0.55}>
            <line x1={72} y1={68} x2={cx} y2={57} />
            <line x1={164} y1={68} x2={cx} y2={57} />
          </g>
          <circle cx={72} cy={72} r={6} fill={CYAN} opacity={0.85} />
          <circle cx={164} cy={72} r={6} fill={CYAN} opacity={0.85} />
          <text x={72} y={87} textAnchor="middle" fill="#c9d0dc" fontSize={7}>Mgr</text>
          <text x={164} y={87} textAnchor="middle" fill="#c9d0dc" fontSize={7}>参謀</text>
          {/* Decision ノード（中）。neutral/cyan。 */}
          <rect x={cx - 14} y={48} width={28} height={13} rx={2} fill="rgba(99,193,199,0.16)" stroke={CYAN} strokeWidth={1} />
          <text x={cx} y={57} textAnchor="middle" fill="#dfe6f0" fontSize={7} fontWeight={700}>DECISION</text>
          {/* 責任境界（承認ライン）：AI が作る／Human が承認する の境目。gold の細い破線のみ。 */}
          <line x1={40} y1={28} x2={196} y2={28} stroke="rgba(226,184,119,0.42)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={cx} y={38} textAnchor="middle" fill={GOLD} fontSize={6.5} fontWeight={700}>承認ライン</text>
          <line x1={cx} y1={48} x2={cx} y2={22} stroke={GOLD} strokeWidth={1.4} opacity={0.7} />
          {/* Human 終端（上・中央）＝最終判断・承認。gold の小アクセントのみ。 */}
          <circle cx={cx} cy={15} r={6.5} fill="rgba(226,184,119,0.2)" stroke={GOLD} strokeWidth={1.7} />
          <text x={cx} y={7} textAnchor="middle" fill={GOLD} fontSize={7} fontWeight={700}>HUMAN</text>
        </>
      ) : (
        <>
          {/* 中心設備＋周囲ノード（数は placements.length に対応） */}
          <rect x={cx - 34} y={cy - 12} width={68} height={24} rx={5} fill="rgba(99,193,199,0.14)" stroke={CYAN} strokeWidth={1.2} />
          {Array.from({ length: aiCount }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / aiCount - Math.PI / 2;
            const nx = cx + Math.cos(angle) * 78;
            const ny = cy + Math.sin(angle) * 28;
            return (
              <g key={i}>
                <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={CYAN} strokeWidth={1} opacity={0.35} />
                <circle cx={nx} cy={ny} r={4.5} fill={CYAN} opacity={0.75} />
              </g>
            );
          })}
          <text x={cx} y={cy + 3} textAnchor="middle" fill="#dfe6f0" fontSize={8.5} fontWeight={700} letterSpacing={0.4}>
            {CARD_TEXT[floorId].center}
          </text>
          {/* 上へ送る（成果物を BuildingRiser へ）。1F は入口、2F は Quality Gate 経由。 */}
          <line x1={cx} y1={cy - 12} x2={cx} y2={12} stroke={CYAN} strokeWidth={1.4} opacity={0.6} />
          <path d={`M${cx - 4} 17 L${cx} 11 L${cx + 4} 17`} fill="none" stroke={CYAN} strokeWidth={1.4} opacity={0.8} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

export default function BuildingOverview({ onOpenFloor }: Props) {
  return (
    <div className={s.root}>
      <div className={s.inner}>
        <div className={s.stack}>
          {/* 1F→2F→3F→Human を一本で貫く Vertical Handoff（装飾。意味は flowNote / humanLine が担保）。 */}
          <BuildingRiser />

          {FLOOR_ORDER.map(({ floorId, layout }) => {
            const floor = v3Floors.find(f => f.id === floorId)!;
            const aiCount = layout.placements.length;
            const hasHuman = Boolean(layout.humanSeat);
            const caption = CARD_TEXT[floorId].captionOverride ?? floor.caption;

            return (
              <button
                key={floorId}
                type="button"
                className={s.card}
                onClick={() => onOpenFloor(floorId)}
                aria-label={`${floorId.toUpperCase()} ${floor.name}を見る`}
              >
                <span className={s.cardMeta}>
                  <span className={s.floorTopline}>
                    <span className={s.floorNum}>{floorId.toUpperCase()}</span>
                    <span className={s.floorEn}>{caption}</span>
                    <span className={s.floorRole}>{floor.name}</span>
                  </span>
                  <span className={s.floorAction}>{CARD_TEXT[floorId].action}</span>
                  <span className={s.floorCount}>AI {aiCount}名</span>
                  {hasHuman ? (
                    <span className={s.humanLine}>＋ Human 1席（最終判断・承認）</span>
                  ) : null}
                  {/* CTA は装飾（button 全体が既に clickable）。nested interactive にしない。 */}
                  <span className={s.cardCta} aria-hidden="true">
                    このフロアを見る
                    <ArrowRight size={13} />
                  </span>
                </span>
                <MiniScene floorId={floorId} layout={layout} aiCount={aiCount} />
              </button>
            );
          })}

          <p className={s.flowNote}>
            情報は <b>1F → 2F → 3F</b> へ上がり、最上部の <b>人間の最終判断・承認</b> で確定します
            （実務 → 確認 → 判断 → 承認）。カードを選ぶと各フロアの詳細に入れます。
          </p>
        </div>
      </div>
    </div>
  );
}
