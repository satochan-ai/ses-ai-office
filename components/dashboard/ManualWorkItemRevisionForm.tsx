"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MANUAL_INPUT_LIMITS, type ManualInputError, type ManualInputField, type NormalizedManualInput } from "@/lib/application/createManualWorkItem";
import { reviseManualWorkItem } from "@/lib/application/reviseManualWorkItem";
import { createWorkItemRepository } from "@/lib/repositories/createWorkItemRepository";
import { ERROR_TEXT, FIELD_LABEL, newSubmissionKey } from "./manualWorkItemFields";

type Values = { title: string; candidateLabel: string; skills: string; startDate: string; route: string };
const blank: Values = { title: "", candidateLabel: "", skills: "", startDate: "unknown", route: "unknown" };

/** Humanが入力し直した修正版を、既存の reviseManualWorkItem で新しい案件として登録する。AIの再作業ではない。 */
export default function ManualWorkItemRevisionForm({ sourceWorkItemId, initial, onRevised, onCancel }: { sourceWorkItemId: string; initial: NormalizedManualInput | null; onRevised: (message: string) => Promise<void>; onCancel: () => void }) {
  const [values, setValues] = useState<Values>(initial ?? blank);
  const [errors, setErrors] = useState<ManualInputError[]>([]);
  const [message, setMessage] = useState<string | null>(initial ? null : "元の入力記録を読み込めなかったため、初期値は空欄です。");
  const [submitting, setSubmitting] = useState(false);
  // 同じ登録操作の再送信では同じキーを使い、成功時だけ破棄する。同一イベント内の二重送信はrefで止める。
  const submissionKey = useRef<string | null>(null);
  const inFlight = useRef(false);
  const firstField = useRef<HTMLInputElement>(null);
  useEffect(() => { firstField.current?.focus(); }, []);
  const errorFor = (field: ManualInputField) => errors.find(error => error.field === field);
  const set = (field: keyof Values) => (event: { target: { value: string } }) => setValues(current => ({ ...current, [field]: event.target.value }));
  const idFor = (field: string) => `revision-${sourceWorkItemId}-${field}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setSubmitting(true); setMessage(null);
    try {
      submissionKey.current ??= newSubmissionKey();
      const result = await reviseManualWorkItem(values, createWorkItemRepository({ storage: window.sessionStorage }), { sourceWorkItemId, submissionKey: submissionKey.current, now: new Date().toISOString() });
      if (!result.ok && (result.code === "already-superseded" || result.code === "invalid-state" || result.code === "inconsistent-reason" || result.code === "source-not-found")) {
        // 古い詳細表示からの操作：何も保存されていないので、最新の保存状態を読み直して表示する。
        await onRevised(`${result.message}最新の保存状態を表示しています。`);
        return;
      }
      if (!result.ok) {
        setErrors(result.code === "invalid-input" ? result.errors : []);
        setMessage(result.code === "invalid-input" ? "入力内容を確認してください" : result.message);
        return;
      }
      submissionKey.current = null;
      await onRevised(result.created ? "修正版を新しい案件として登録しました。元の案件は「修正版へ置換済み」になりました。" : "この修正版はすでに登録済みです。");
    } catch {
      setMessage("このブラウザでは一時保存領域を利用できません");
    } finally { inFlight.current = false; setSubmitting(false); }
  };

  const textField = (field: "title" | "candidateLabel" | "skills") => (
    <label className="manual-field" htmlFor={idFor(field)}>{FIELD_LABEL[field]}<small>必須・{MANUAL_INPUT_LIMITS[field]}文字以内</small>
      <input id={idFor(field)} ref={field === "title" ? firstField : undefined} value={values[field]} onChange={set(field)} maxLength={MANUAL_INPUT_LIMITS[field] * 2} disabled={submitting} aria-invalid={Boolean(errorFor(field))} aria-describedby={errorFor(field) ? `${idFor(field)}-error` : undefined} />
      {errorFor(field) ? <em id={`${idFor(field)}-error`}>{ERROR_TEXT[errorFor(field)!.code]}</em> : null}
    </label>
  );

  return <form className="manual-revision-form" onSubmit={submit} noValidate aria-label="修正版の登録">
    <p className="manual-revision-note">修正版は新しい案件として登録されます。元の案件と過去の確認記録は残ります。AIによる再作業ではなく、Humanが入力した修正版です。情報開示範囲などの確認事項は、修正版で改めて回答します。</p>
    <div className="manual-form">
      {textField("title")}
      {textField("candidateLabel")}
      {textField("skills")}
      <label className="manual-field" htmlFor={idFor("startDate")}>{FIELD_LABEL.startDate}
        <select id={idFor("startDate")} value={values.startDate} onChange={set("startDate")} disabled={submitting}><option value="unknown">未確認（Humanへ確認）</option><option value="matched">一致を確認済み</option></select>
        {errorFor("startDate") ? <em>{ERROR_TEXT[errorFor("startDate")!.code]}</em> : null}
      </label>
      <label className="manual-field" htmlFor={idFor("route")}>{FIELD_LABEL.route}
        <select id={idFor("route")} value={values.route} onChange={set("route")} disabled={submitting}><option value="unknown">未確認（Humanへ確認）</option><option value="clear">確認済み</option></select>
        {errorFor("route") ? <em>{ERROR_TEXT[errorFor("route")!.code]}</em> : null}
      </label>
      <div className="manual-actions"><button type="submit" disabled={submitting}>{submitting ? "登録中…" : "修正版を登録"}</button><button type="button" className="manual-secondary" onClick={onCancel} disabled={submitting}>キャンセル</button></div>
    </div>
    {message ? <p className="manual-message" role="status">{message}</p> : null}
  </form>;
}
