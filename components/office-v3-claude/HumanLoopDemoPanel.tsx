"use client";
import type { WorkItem } from "@/types/workItem";
import type { Approval } from "@/types/approval";
import { projectAgentActivity, type ActivityFrame } from "@/lib/visual-office/agentActivity";
import s from "./OfficeV3.module.css";
const LABELS = { idle: "待機", working: "作業中", handoff: "引き継ぎ", waiting_human: "Human待ち", reviewing: "確認中", completed: "完了" };
export default function HumanLoopDemoPanel({ item, approval, frame, playing, busy, error, frames, names, onStart, onOpen, onReplay }: { item?: WorkItem; approval?: Approval; frame?: ActivityFrame; playing: boolean; busy: boolean; error: string | null; frames: ActivityFrame[]; names: Record<string, string>; onStart: () => void; onOpen: () => void; onReplay: () => void }) {
  const live = projectAgentActivity(item, approval), shown = playing && frame ? frame : live;
  const open = item?.missingInfo.filter(info => info.status === "open") ?? [];
  return <section className={s.humanLoopDemo} aria-label="AI引き継ぎ・Human質問デモ">
    <div className={s.humanLoopDemoHeading}><strong>AI引き継ぎ・Human質問デモ</strong><small>架空データ・外部送信なし</small></div>
    <p>案件整理 → 候補者比較 → Human回答 → 提案準備 → Human確認</p>
    {!item ? <button type="button" disabled={busy} onClick={onStart}>AI業務デモを開始</button> : <>
      <div className={s.humanLoopActivity} role="status" aria-live="polite"><b>{LABELS[shown.activity]}</b><strong>{shown.agentId ? names[shown.agentId] : "Human"}</strong><span>{shown.text}</span></div>
      {playing ? <small>Demo工程を再生中。保存済み状態：{live.text}</small> : null}
      {playing && frame?.handoff ? <p className={s.humanLoopHandoff}>{names[frame.handoff.from]} → {names[frame.handoff.to]}</p> : null}
      {!playing && open.length ? <div className={s.humanLoopQuestion}><strong>{live.agentId ? names[live.agentId] : "AIマッチング担当"}からHumanへ確認</strong><p>{open[0].question}</p><button type="button" disabled={busy} onClick={onOpen}>確認・回答する</button></div> : null}
      {!playing && !open.length ? <button type="button" disabled={busy} onClick={onOpen}>{approval?.state === "pending" ? "Human確認を開く" : "保存済みの仕事を確認"}</button> : null}
      {!playing && frames.length ? <button type="button" disabled={busy} onClick={onReplay}>工程をもう一度見る</button> : null}
      {frames.some(f => f.handoff) ? <details><summary>今回の引き継ぎ履歴</summary><ul>{frames.filter(f => f.handoff).map((f, i) => <li key={i}>{names[f.handoff!.from]} → {names[f.handoff!.to]}：引き継ぎ済み</li>)}</ul></details> : null}
    </>}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
