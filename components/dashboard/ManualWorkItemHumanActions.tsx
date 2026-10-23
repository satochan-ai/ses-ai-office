"use client";

import { useRef, useState, type FormEvent } from "react";
import { executeManualHumanAction, type ManualHumanAction, type ManualHumanActions } from "@/lib/application/manualWorkItemHumanActions";
import { createWorkItemRepository } from "@/lib/repositories/createWorkItemRepository";

const LABELS = { proposalRoute: "商流（提案経路）", availabilityStart: "開始時期", disclosureScope: "情報開示範囲" } as const;
const OPTIONS = {
  proposalRoute: [["clear", "確認済み"], ["conflict", "矛盾あり"]],
  availabilityStart: [["matched", "開始日一致"], ["mismatched", "開始日不一致"]],
  disclosureScope: [["defined", "開示可能"], ["restricted", "開示制限"]],
} as const;

export default function ManualWorkItemHumanActions({ workItemId, actions, disabled, onBusyChange, onSaved }: { workItemId: string; actions: ManualHumanActions; disabled: boolean; onBusyChange: (busy: boolean) => void; onSaved: (message: string) => Promise<void> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [choice, setChoice] = useState("");
  const [date, setDate] = useState("");
  const [decision, setDecision] = useState<"reject" | "rework" | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const busy = disabled || submitting;
  const question = actions.questions.find(info => info.id === selected);

  const run = async (action: ManualHumanAction) => {
    if (disabled || inFlight.current) return;
    inFlight.current = true; setSubmitting(true); onBusyChange(true); setMessage(null);
    try {
      const result = await executeManualHumanAction(createWorkItemRepository({ storage: window.sessionStorage }), workItemId, action, { now: new Date().toISOString(), commandId: `manual-human-${crypto.randomUUID()}` });
      if (!result.ok) { setMessage(result.message); return; }
      setSelected(null); setChoice(""); setDate(""); setDecision(null); setReason("");
      // 保存後の表示更新失敗は、保存そのものの失敗とは区別する。
      try { await onSaved(result.message); }
      catch { setMessage(`${result.message}表示を更新できませんでした。最新の状態を読み込んでください。`); }
    } catch { setMessage("一時保存領域を利用できません。入力内容を保持しています。"); }
    finally { inFlight.current = false; setSubmitting(false); onBusyChange(false); }
  };

  const answer = (event: FormEvent) => {
    event.preventDefault();
    if (question) void run({ type: "answer", missingInfoId: question.id, choice, date });
  };
  const decide = (event: FormEvent) => {
    event.preventDefault();
    if (decision && actions.approvalId) void run({ type: decision, approvalId: actions.approvalId, reason });
  };

  if (!actions.questions.length && !actions.approvalId && !actions.canPrepare && !message) return null;
  return <section className="manual-human-actions" aria-label="いま必要なHuman操作" aria-busy={submitting}>
    <h5>いま必要なHuman操作</h5>
    {actions.questions.length ? <>
      <p>未回答の確認事項に回答してください。回答は根拠として保存されます。</p>
      <div className="manual-human-questions">{actions.questions.map(info => <button type="button" key={info.id} disabled={busy} aria-pressed={selected === info.id} onClick={() => { setSelected(info.id); setChoice(""); setDate(""); setMessage(null); }}>{LABELS[info.field]}に回答</button>)}</div>
      {question ? <form onSubmit={answer} className="manual-human-form">
        <p>{question.question}</p>
        <label className="manual-field">{LABELS[question.field]}の回答<select autoFocus required value={choice} disabled={busy} onChange={event => setChoice(event.target.value)}><option value="">選択してください</option>{OPTIONS[question.field].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {question.field === "availabilityStart" ? <label className="manual-field">稼働開始日<input required type="date" value={date} disabled={busy} onChange={event => setDate(event.target.value)} onInput={event => setDate(event.currentTarget.value)} /></label> : null}
        <div className="manual-actions"><button type="submit" disabled={busy || !choice || (question.field === "availabilityStart" && !date)}>回答を保存</button><button type="button" disabled={busy} onClick={() => setSelected(null)}>キャンセル</button></div>
      </form> : null}
    </> : null}
    {actions.canPrepare ? <><p>回答は保存済みです。確認準備の可否をもう一度確認できます。</p><button type="button" disabled={busy} onClick={() => void run({ type: "prepare" })}>準備内容の確認待ちに進む</button></> : null}
    {actions.approvalId ? <>
      <p>上の案件情報と下の保存済み回答・根拠を確認してください。準備内容のみの承認です。提案の適合判定や外部送信は行いません。</p>
      {decision ? <form onSubmit={decide} className="manual-human-form">
        <label className="manual-field">{decision === "reject" ? "承認しない理由" : "修正を依頼する理由"}<textarea autoFocus required value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
        <div className="manual-actions"><button type="submit" disabled={busy || !reason.trim()}>理由を保存して確定</button><button type="button" disabled={busy} onClick={() => setDecision(null)}>キャンセル</button></div>
      </form> : <div className="manual-human-decisions">
        <button type="button" disabled={busy} onClick={() => void run({ type: "approve", approvalId: actions.approvalId!, reason: "" })}>承認する</button>
        <button type="button" disabled={busy} onClick={() => { setDecision("reject"); setReason(""); }}>承認しない</button>
        <button type="button" disabled={busy} onClick={() => { setDecision("rework"); setReason(""); }}>修正を依頼</button>
      </div>}
    </> : null}
    {message ? <p role="status" className="manual-message">{message}</p> : null}
  </section>;
}
