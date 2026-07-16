"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Bot, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import s from "./VisualOffice.module.css";

const guideSteps = [
  { icon: Bot, title: "AI社員の状況を確認", text: "各部屋をクリックすると、担当AIの現在の仕事・成果・実行履歴を確認できます。" },
  { icon: Play, title: "連携デモを開始", text: "「デモを開始」から、新着案件を提案準備まで進めるAI社員の連携を体験できます。" },
  { icon: BarChart3, title: "Dashboardで結果を確認", text: "デモ完了後、管理DashboardでKPI・優先タスク・AI実行ログの変化を確認できます。" },
] as const;

export default function FirstVisitGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) setStep(0); }, [open]);
  useEffect(() => { if (!open) return; const previousFocus = document.activeElement as HTMLElement | null; closeButtonRef.current?.focus(); return () => previousFocus?.focus(); }, [open]);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose(); document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [open, onClose]);
  if (!open) return null;
  const current = guideSteps[step]; const Icon = current.icon;
  return <div className={s.guideBackdrop} onMouseDown={event => event.target === event.currentTarget && onClose()}><section className={s.guideModal} role="dialog" aria-modal="true" aria-labelledby="guide-title"><button ref={closeButtonRef} className={s.guideClose} onClick={onClose} aria-label="初回操作ガイドを閉じる"><X size={19} /></button><header><span>QUICK START</span><h2 id="guide-title">SES AI Officeへようこそ</h2><p>最初に見るポイントを3つに絞ってご案内します。</p></header><div className={s.guideDots} aria-label={`ガイド Step ${step + 1} / ${guideSteps.length}`}>{guideSteps.map((item, index) => <i key={item.title} className={index === step ? s.guideDotActive : ""} />)}</div><div className={s.guideContent}><div><Icon size={26} /></div><span>STEP {step + 1} / {guideSteps.length}</span><h3>{current.title}</h3><p>{current.text}</p></div><footer><button onClick={onClose}>スキップ</button><div>{step > 0 && <button onClick={() => setStep(value => value - 1)}><ChevronLeft size={15} />戻る</button>}{step < guideSteps.length - 1 ? <button className={s.guidePrimary} onClick={() => setStep(value => value + 1)}>次へ<ChevronRight size={15} /></button> : <button className={s.guidePrimary} onClick={onClose}>ガイドを終了<ChevronRight size={15} /></button>}</div></footer></section></div>;
}
