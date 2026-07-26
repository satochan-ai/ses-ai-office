"use client";

import { CheckCircle2, ScrollText } from "lucide-react";
import type { OfficeV3DemoLog, OfficeV3DemoStatus } from "@/types/officeV3ClaudeDemo";
import s from "./OfficeV3.module.css";

type Props = {
  logs: OfficeV3DemoLog[];
  demoStatus: OfficeV3DemoStatus;
  currentStepTitle?: string;
  /** デスクトップ5件・モバイル3件など、表示件数を呼び出し側で調整する。 */
  limit: number;
};

/**
 * 直近ログだけを表示する小さなパネル。時刻表示はしない。
 * オフィス画面より大きくならないよう、常に`limit`件までに絞る。
 */
export default function DemoActivityLog({ logs, demoStatus, currentStepTitle, limit }: Props) {
  if (demoStatus === "idle") return null;

  const recent = logs.slice(-limit).reverse();

  return (
    <section className={s.demoLog} aria-label="デモ処理ログ">
      <header>
        <ScrollText size={13} aria-hidden="true" />
        <span>処理ログ</span>
        {demoStatus === "completed" ? (
          <b className={s.demoLogDone}><CheckCircle2 size={12} aria-hidden="true" />完了</b>
        ) : currentStepTitle ? (
          <b className={s.demoLogStep}>{currentStepTitle}</b>
        ) : null}
      </header>
      <ol>
        {recent.map((log, index) => (
          <li key={log.id} className={index === 0 ? s.demoLogLatest : undefined}>
            {log.message}
          </li>
        ))}
      </ol>
    </section>
  );
}
