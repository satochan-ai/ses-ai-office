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

      {/* 一段高い台座：統括AI3名よりさらに上位であることを示す */}
      <polygon points="-13,3 13,3 18,-2 -18,-2" fill="#c9a96a" opacity={0.4} />
      <polygon points="-18,-2 18,-2 13,-6 -13,-6" fill="#e6c98f" opacity={0.58} />

      <ContactShadow rx={17} ry={9} opacity={0.2} />

      {/* 専用デスク（コンパクト） */}
      <polygon points="-14,-4 14,-4 18,-18 -18,-18" fill="#2b3348" stroke="rgba(226,184,119,0.55)" strokeWidth={1} />
      <polygon points="-18,-18 18,-18 18,-22 -18,-22" fill="#3d4761" />
      <rect x={-2} y={-34} width={4} height={12} fill="#232a3c" />

      {/* 意思決定用モニター */}
      <polygon points="-11,-34 11,-34 11,-54 -11,-54" fill="#1c2233" />
      <polygon points="-8,-36 8,-36 8,-52 -8,-52" fill="#e2b877" className={s.screen} opacity={0.9} />

      {/* 承認待ち通知バッジ */}
      {seat.pendingApprovals > 0 ? (
        <g transform="translate(15,-50)">
          <circle r={7} fill="#e2635c" className={s.badge} />
          <text y={2.5} textAnchor="middle" className={s.humanSeatBadgeText}>{seat.pendingApprovals}</text>
        </g>
      ) : null}

      {selected ? <ellipse className={s.agentRing} cx={0} cy={-2} rx={24} ry={12} /> : null}
      {isDemoActive ? <ellipse className={s.humanSeatDemoActive} cx={0} cy={-30} rx={40} ry={62} /> : null}

      {/* 常時ラベル：人間責任者／最終判断・承認（北東の契約管理ラベルと重ならないよう左寄りに配置） */}
      <g className={s.humanSeatLabel} transform="translate(-128,-84)">
        <rect x={0} y={-13} width={112} height={30} rx={9} />
        <text x={10} y={0} textAnchor="start" className={s.labelRole}>{seat.label}</text>
        <text x={10} y={13} textAnchor="start" className={s.humanSeatSub}>{seat.subLabel}</text>
      </g>

      {/* 常時ステータス：承認待ち／要確認（詳細はクリック後のパネルへ） */}
      <g className={s.humanSeatStatus} transform="translate(-118,14)">
        <rect x={0} y={0} width={96} height={30} rx={8} />
        <text x={9} y={12} className={s.humanSeatStatusText}>承認待ち {seat.pendingApprovals}件</text>
        <text x={9} y={24} className={s.humanSeatStatusText}>要確認 {seat.needsReview}件</text>
      </g>
    </g>
  );
}
