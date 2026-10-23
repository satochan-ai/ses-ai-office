"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createManualWorkItem, MANUAL_INPUT_LIMITS, type ManualInputError, type ManualInputField, type ManualWorkItemSummary } from "@/lib/application/createManualWorkItem";
import { createWorkItemRepository } from "@/lib/repositories/createWorkItemRepository";
import { buildVisualOfficeWorkItemHref } from "@/lib/workItem/ui/visualOfficeTarget";
import type { WorkItemStatus } from "@/types/workItem";

const FIELD_LABEL: Record<ManualInputField, string> = { title: "架空案件名", candidateLabel: "架空候補者の呼称", skills: "必須スキル", startDate: "開始時期の一致", route: "商流（提案経路）" };
const ERROR_TEXT: Record<ManualInputError["code"], string> = { required: "入力してください", "too-long": "文字数が上限を超えています", invalid: "入力内容を確認してください（改行・制御文字は使えません）" };
const STATUS_TEXT: Partial<Record<WorkItemStatus, string>> = { blocked_missing_info: "不足情報の回答待ち", awaiting_approval: "準備内容の確認待ち", preparation_recorded: "確認済み（準備のみ）", returned_for_rework: "差し戻し", approval_invalidated: "再確認待ち" };
const initial = { title: "", candidateLabel: "", skills: "", startDate: "unknown", route: "unknown" };

function newSubmissionKey(): string {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return random.toLowerCase();
}

export default function ManualWorkItemForm({ items, onCreated }: { items: ManualWorkItemSummary[]; onCreated: () => Promise<void> }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<ManualInputError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 失敗後の再送信でも同じキーを使い、成功後にだけ新しいキーへ切り替える。
  const submissionKey = useRef<string | null>(null);
  const inFlight = useRef(false);
  // 登録直後の連続クリックが空フォームの送信になり、成功表示をエラーで上書きしないようにする。
  const justCreated = useRef(false);
  const errorFor = (field: ManualInputField) => errors.find(error => error.field === field);
  const set = (field: keyof typeof initial) => (event: { target: { value: string } }) => { justCreated.current = false; setValues(current => ({ ...current, [field]: event.target.value })); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current || justCreated.current) return;
    inFlight.current = true; setSubmitting(true); setMessage(null);
    try {
      submissionKey.current ??= newSubmissionKey();
      const result = await createManualWorkItem(values, createWorkItemRepository({ storage: window.sessionStorage }), { submissionKey: submissionKey.current, now: new Date().toISOString() });
      if (!result.ok) {
        setErrors(result.code === "invalid-input" ? result.errors : []);
        setMessage(result.code === "invalid-input" ? "入力内容を確認してください" : result.message);
        return;
      }
      setErrors([]); setValues(initial); submissionKey.current = null; justCreated.current = true;
      setMessage(result.created ? "登録しました。不足情報があれば「あなたの判断が必要な項目」に表示されます。" : "この入力はすでに登録済みです。");
      await onCreated();
    } catch {
      setMessage("このブラウザでは一時保存領域を利用できません");
    } finally { inFlight.current = false; setSubmitting(false); }
  };

  const textField = (field: "title" | "candidateLabel" | "skills", placeholder: string) => (
    <label className="manual-field">{FIELD_LABEL[field]}<small>必須・{MANUAL_INPUT_LIMITS[field]}文字以内</small>
      <input value={values[field]} onChange={set(field)} maxLength={MANUAL_INPUT_LIMITS[field] * 2} placeholder={placeholder} disabled={submitting} aria-invalid={Boolean(errorFor(field))} aria-describedby={errorFor(field) ? `manual-${field}-error` : undefined} />
      {errorFor(field) ? <em id={`manual-${field}-error`}>{ERROR_TEXT[errorFor(field)!.code]}</em> : null}
    </label>
  );

  return <section className="panel manual-work-item-panel" aria-labelledby="manual-work-item-title">
    <div className="panel-head"><div><h2 id="manual-work-item-title">架空案件の手入力</h2><p>入力内容から不足情報を判定し、Humanの回答と内容確認へ進めます。AIは実行しません。</p></div></div>
    <p className="manual-notice" role="note"><strong>架空・匿名のテストデータのみ入力してください。実在する顧客情報・個人情報・機密情報は入力しないでください。</strong><br />データはこのブラウザの一時保存領域（sessionStorage）に保存され、サーバーには送信されません。再読み込みでは残りますが、このタブを閉じると消え、他のタブ・端末とは共有されません。</p>
    <form className="manual-form" onSubmit={submit} noValidate>
      {textField("title", "例：架空 Java保守開発案件")}
      {textField("candidateLabel", "例：候補者A")}
      {textField("skills", "例：Java、Spring Boot")}
      <label className="manual-field">{FIELD_LABEL.startDate}<small>候補者の稼働開始と案件の開始時期</small>
        <select value={values.startDate} onChange={set("startDate")} disabled={submitting}><option value="unknown">未確認（Humanへ確認）</option><option value="matched">一致を確認済み</option></select>
        {errorFor("startDate") ? <em>{ERROR_TEXT[errorFor("startDate")!.code]}</em> : null}
      </label>
      <label className="manual-field">{FIELD_LABEL.route}<small>提案経路の確認状況</small>
        <select value={values.route} onChange={set("route")} disabled={submitting}><option value="unknown">未確認（Humanへ確認）</option><option value="clear">確認済み</option></select>
        {errorFor("route") ? <em>{ERROR_TEXT[errorFor("route")!.code]}</em> : null}
      </label>
      <div className="manual-actions"><button type="submit" disabled={submitting}>{submitting ? "登録中…" : "架空案件を登録"}</button><span>開始時期の不一致・商流の矛盾がある案件は対象外です。情報開示範囲は登録後に必ずHumanへ確認します。</span></div>
    </form>
    {message ? <p className="manual-message" role="status">{message}</p> : null}
    {items.length > 0 ? <div className="manual-list"><h3>登録済みの手入力案件（このタブのみ）</h3><ul>{items.slice(0, 5).map(item => <li key={item.id}><span>{item.title}</span><em>{STATUS_TEXT[item.status] ?? item.status}</em>{item.canOpenInVisualOffice ? <Link href={buildVisualOfficeWorkItemHref(item.id)}>Visual Officeで確認</Link> : null}</li>)}</ul>{items.length > 5 ? <p>ほか{items.length - 5}件</p> : null}</div> : null}
  </section>;
}
