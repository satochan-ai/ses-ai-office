"use client";

import { isoX, isoY } from "@/data/officeV3ClaudeLayout";
import type { V3HumanSeat as V3HumanSeatData } from "@/types/officeV3Claude";
import { ContactShadow } from "./OfficeFurniture";
import s from "./OfficeV3.module.css";

type Props = {
  seat: V3HumanSeatData;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
  /** デモが人間承認待ちのときだけ true。静的な`seat`データは変更しない。 */
  isDemoActive?: boolean;
};

/**
 * 人間責任者席。AI社員ではないため、人物イラスト（顔・体）は描かない。
 * 指令席の壁面モニター2枚の間の狭い間隔に収まるよう、専用デスク・意思決定モニター・
 * 承認待ち通知・簡易ステータスだけをごく小さくまとめて「最終承認者の存在」を表現する。
 */
export default function HumanSeat({ seat, selected, dimmed, onSelect, isDemoActive = false }: Props) {
  const x = isoX(seat.gx, seat.gy);
  const y = isoY(seat.gx, seat.gy);

  return (
    <g
      className={`${s.humanSeat} ${selected ? s.humanSeatSelected : ""} ${dimmed ? s.agentDim : ""}`}
      transform={`translate(${x}, ${y})`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${seat.label}／${seat.subLabel}／承認待ち${seat.pendingApprovals}件・要確認${seat.needsReview}件`}
      onClick={() => onSelect(seat.id)}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(seat.id);
        }
      }}
    >
      <ellipse className={s.agentHit} cx={0} cy={-30} rx={30} ry={44} />

      {/* 低ダイス：AI3名よりさらに上位。6〜8px の段差感。ステージ・玉座にはしない。 */}
      <polygon points="-15,4 15,4 21,-3 -21,-3" fill="#b89a6c" opacity={0.34} />
      <polygon points="-21,-3 21,-3 15,-10 -15,-10" fill="#e6c98f" opacity={0.5} />

      <ContactShadow rx={18} ry={9} opacity={0.2} />

      {/* 専用デスク：AI用commandDeskではなく通常deskを少し上位に見せる（ダーク＋木縁＋細い金）。 */}
      <polygon points="-14,-4 14,-4 18,-18 -18,-18" fill="#2b3348" stroke="rgba(201,160,99,0.5)" strokeWidth={1} />
      <polygon points="-18,-18 18,-18 18,-22 -18,-22" fill="#3d4761" />
      <polygon points="-18,-22 18,-22 18,-23.4 -18,-23.4" fill="#b58f57" opacity={0.7} />
      <rect x={-2} y={-34} width={4} height={12} fill="#232a3c" />

      {/* 在席ランプ：小型・金・HumanSeat のみ。初期は静的。 */}
      <g transform="translate(12,-21)">
        <circle cx={0} cy={-6} r={4.6} fill="#f0d79a" opacity={0.22} />
        <rect x={-1} y={-6} width={2} height={6} fill="#7c6a44" />
        <circle cx={0} cy={-6.6} r={2.4} fill="#f0d79a" />
      </g>

      {/* 意思決定モニター＝Dashboard の簡易プレビュー（iframe／実画面は埋め込まない）。 */}
      <polygon points="-12,-34 12,-34 12,-55 -12,-55" fill="#141b28" />
      <polygon points="-10,-36 10,-36 10,-53 -10,-53" fill="#1d2c44" />
      <rect x={-8.5} y={-51.5} width={7.5} height={6} rx={1} fill="#2f4a6b" />
      <rect x={1} y={-51.5} width={7.5} height={6} rx={1} fill="#2f4a6b" />
      <rect x={-8.5} y={-43.5} width={16} height={2.4} rx={1} fill="#3a5a80" />
      <rect x={-8.5} y={-40} width={12} height={2.4} rx={1} fill="#3a5a80" />
      <rect x={-8.5} y={-36.5} width={9} height={2.4} rx={1} fill="#8a6a3e" />
      <polygon
        points="-12,-34 12,-34 12,-55 -12,-55"
        fill="none"
        stroke="#c9a063"
        strokeWidth={seat.pendingApprovals > 0 ? 1.4 : 0.8}
        opacity={seat.pendingApprovals > 0 ? 0.85 : 0.4}
        className={seat.pendingApprovals > 0 ? s.screen : undefined}
      />

      {/* 承認待ち通知バッジ */}
      {seat.pendingApprovals > 0 ? (
        <g transform="translate(15,-50)">
          <circle r={7} fill="#e2635c" className={s.badge} />
          <text y={2.5} textAnchor="middle" className={s.humanSeatBadgeText}>{seat.pendingApprovals}</text>
        </g>
      ) : null}

      {selected ? <ellipse className={s.agentRing} cx={0} cy={-2} rx={24} ry={12} /> : null}
      {isDemoActive ? <ellipse className={s.humanSeatDemoActive} cx={0} cy={-30} rx={40} ry={62} /> : null}

      {/* 常時ラベル：人間責任者／最終判断・承認。
          all（seat.gx≈15.4）は従来どおり左寄せ。3F（seat.gx≈11.5＝最奥中央）は
          左に指令席があり重なるため、席の真上へ縦に配置する。 */}
      {seat.gx <= 13 ? (
        <>
          <g className={s.humanSeatLabel} transform="translate(-54,-106)">
            <rect x={0} y={-13} width={108} height={30} rx={9} />
            <text x={10} y={0} textAnchor="start" className={s.labelRole}>{seat.label}</text>
            <text x={10} y={13} textAnchor="start" className={s.humanSeatSub}>{seat.subLabel}</text>
          </g>
          <g className={s.humanSeatStatus} transform="translate(-48,-74)">
            <rect x={0} y={0} width={96} height={28} rx={8} />
            <text x={9} y={11} className={s.humanSeatStatusText}>承認待ち {seat.pendingApprovals}件</text>
            <text x={9} y={22} className={s.humanSeatStatusText}>要確認 {seat.needsReview}件</text>
          </g>
        </>
      ) : (
        <>
          <g className={s.humanSeatLabel} transform="translate(-128,-84)">
            <rect x={0} y={-13} width={112} height={30} rx={9} />
            <text x={10} y={0} textAnchor="start" className={s.labelRole}>{seat.label}</text>
            <text x={10} y={13} textAnchor="start" className={s.humanSeatSub}>{seat.subLabel}</text>
          </g>
          <g className={s.humanSeatStatus} transform="translate(-118,14)">
            <rect x={0} y={0} width={96} height={30} rx={8} />
            <text x={9} y={12} className={s.humanSeatStatusText}>承認待ち {seat.pendingApprovals}件</text>
            <text x={9} y={24} className={s.humanSeatStatusText}>要確認 {seat.needsReview}件</text>
          </g>
        </>
      )}
    </g>
  );
}
