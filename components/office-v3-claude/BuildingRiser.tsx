"use client";

import { ChevronUp } from "lucide-react";
import s from "./BuildingOverview.module.css";

/**
 * Step13-C: BuildingRiser（Vertical Handoff）。
 *
 * 1F → 2F → 3F を一本で貫く「dark metal spine ＋ thin cyan core」。
 * floor node ×3（1F/2F/3F）と、最上部の Human 終端（gold）を結ぶ。
 * 情報フローは下→上（1F が入口、Human が最終責任点＝終端）。
 *
 * 純粋な装飾。方向・責任境界の意味は BuildingOverview 側の可読テキスト
 * （humanLine / flowNote）が担保するため aria-hidden。
 * animation / keyframes は入れない（Step13-C は静的）。
 */
export default function BuildingRiser() {
  return (
    <div className={s.riser} aria-hidden="true">
      {/* 終端＝人間の最終判断・承認（spine の頂点）。gold の小ノードのみ。 */}
      <span className={s.riserTerminal} />
      <div className={s.riserShaft}>
        <span className={s.riserCore} />
        {/* 上向き（下→上へ集約）を示す控えめなインジケータ */}
        <ChevronUp className={s.riserDir} style={{ top: "64%" }} size={11} />
        <ChevronUp className={s.riserDir} style={{ top: "34%" }} size={11} />
        {/* 各フロアの接続ノード（上=3F / 中=2F / 下=1F） */}
        <span className={s.riserNode} style={{ top: "15%" }} />
        <span className={s.riserNode} style={{ top: "50%" }} />
        <span className={s.riserNode} style={{ top: "85%" }} />
      </div>
    </div>
  );
}
