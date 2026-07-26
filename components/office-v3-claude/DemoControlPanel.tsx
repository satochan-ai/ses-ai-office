"use client";

import { CheckCircle2, Play, RotateCcw, UserCheck } from "lucide-react";
import type { OfficeV3DemoScenario, OfficeV3DemoStatus, OfficeV3DemoStep } from "@/types/officeV3ClaudeDemo";
import s from "./OfficeV3.module.css";

type Props = {
  demoStatus: OfficeV3DemoStatus;
  scenario: OfficeV3DemoScenario;
  currentStep: OfficeV3DemoStep | null;
  onStart: () => void;
  onReset: () => void;
};

/**
 * デモ開始・進行状況・リセットだけを扱う小さな操作パネル。
 * シナリオ選択・一時停止・速度変更は今回対象外（固定デモ1本のみ）。
 * 画面を覆う大型パネルにはせず、既存ヘッダー直下の細い1行として配置する。
 */
export default function DemoControlPanel({ demoStatus, scenario, currentStep, onStart, onReset }: Props) {
  return (
    <div className={s.demoPanel} aria-live="polite">
      {demoStatus === "idle" ? (
        <>
          <span className={s.demoPanelTag}>固定デモ</span>
          <span className={s.demoPanelTitle}>{scenario.title}</span>
          <button type="button" className={s.demoPanelPrimary} onClick={onStart}>
            <Play size={13} aria-hidden="true" />
            デモ開始
          </button>
        </>
      ) : demoStatus === "running" ? (
        <>
          <span className={`${s.demoPanelDot} ${s.demoPanelDotRunning}`} aria-hidden="true" />
          <span className={s.demoPanelTitle}>{currentStep?.title ?? "処理中"}</span>
          <span className={s.demoPanelSub}>AI組織が処理中です</span>
          <button type="button" className={s.demoPanelGhost} onClick={onReset}>
            <RotateCcw size={13} aria-hidden="true" />
            リセット
          </button>
        </>
      ) : demoStatus === "awaiting-approval" ? (
        <>
          <span className={`${s.demoPanelDot} ${s.demoPanelDotWaiting}`} aria-hidden="true" />
          <UserCheck size={14} aria-hidden="true" />
          <span className={s.demoPanelTitle}>人間責任者の承認待ちです</span>
          <span className={s.demoPanelSub}>人間責任者席を確認してください</span>
          <button type="button" className={s.demoPanelGhost} onClick={onReset}>
            <RotateCcw size={13} aria-hidden="true" />
            リセット
          </button>
        </>
      ) : (
        <>
          <CheckCircle2 size={14} className={s.demoPanelDoneIcon} aria-hidden="true" />
          <span className={s.demoPanelTitle}>デモ完了</span>
          <button type="button" className={s.demoPanelPrimary} onClick={onStart}>
            <Play size={13} aria-hidden="true" />
            再実行
          </button>
          <button type="button" className={s.demoPanelGhost} onClick={onReset}>
            <RotateCcw size={13} aria-hidden="true" />
            リセット
          </button>
        </>
      )}
    </div>
  );
}
