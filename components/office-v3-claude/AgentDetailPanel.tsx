"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Monitor, X } from "lucide-react";
import type { V3AgentView } from "@/types/officeV3Claude";
import type { AgentWorkload } from "@/lib/workItem/projection/agentWorkload";
import type { MissingInfoResolutionValue } from "@/types/workItemResolution";
import type { Approval } from "@/types/approval";
import s from "./OfficeV3.module.css";

const FIELD_LABEL: Record<string, string> = { proposalRoute: "提案経路", personIntent: "本人意向", availabilityStart: "稼働開始日", duplicateProposal: "重複提案", disclosureScope: "情報開示範囲", informationFreshness: "情報の鮮度" };
const OPTIONS: Record<string, { label: string; status: string }[]> = {
  proposalRoute: [{ label: "確認済み", status: "clear" }, { label: "矛盾あり", status: "conflict" }],
  personIntent: [{ label: "提案可", status: "confirmed" }, { label: "辞退", status: "declined" }],
  availabilityStart: [{ label: "開始日一致", status: "matched" }, { label: "開始日不一致", status: "mismatched" }],
  duplicateProposal: [{ label: "重複なし", status: "none" }, { label: "重複の可能性", status: "possible" }, { label: "重複確認", status: "confirmed" }],
  disclosureScope: [{ label: "開示可能", status: "defined" }, { label: "開示制限", status: "restricted" }],
};

type ResolveHandler = (workItemId: string, missingInfoId: string, value: MissingInfoResolutionValue) => Promise<{ ok: true } | { ok: false; message: string }>;
type ApproveHandler = (workItemId: string, approvalId: string) => Promise<{ ok: true } | { ok: false; message: string }>;

export default function AgentDetailPanel({ view, onClose, workload, approvalStates, onResolveMissingInfo, onApproveWorkItem }: { view: V3AgentView; onClose: () => void; workload?: AgentWorkload; approvalStates?: Record<string, Approval>; onResolveMissingInfo?: ResolveHandler; onApproveWorkItem?: ApproveHandler }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedMissing, setSelectedMissing] = useState<{ workItemId: string; id: string; field: string } | null>(null);
  const [choice, setChoice] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [view.placement.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const { placement } = view;
  const submit = async () => {
    if (!selectedMissing || !onResolveMissingInfo || (selectedMissing.field !== "informationFreshness" && !choice)) return;
    const field = selectedMissing.field;
    let value: MissingInfoResolutionValue;
    if (field === "informationFreshness") value = { field, note: note || undefined };
    else if (field === "availabilityStart") value = { field, status: choice as "matched" | "mismatched", date: date || undefined };
    else value = { field, status: choice as never, note: note || undefined } as MissingInfoResolutionValue;
    setSaving(true); setMessage(null);
    const result = await onResolveMissingInfo(selectedMissing.workItemId, selectedMissing.id, value);
    setSaving(false);
    if (result.ok) { setMessage("確認内容を保存しました"); setSelectedMissing(null); setChoice(""); setDate(""); setNote(""); }
    else setMessage(result.message);
  };

  return (
    <div
      ref={panelRef}
      className={s.detail}
      role="dialog"
      aria-modal="false"
      aria-label={`${view.name} の詳細`}
    >
      <header>
        <div>
          <span className={s.detailZone}>{view.zoneName}</span>
          <strong>{view.name}</strong>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="詳細を閉じる（Escキーでも閉じます）">
          <X size={16} />
        </button>
      </header>

      <p className={s.detailRole}>{view.role}</p>

      <div className={s.detailStatus}>
        <span>現在の状態</span>
        <strong>
          <i aria-hidden="true" />
          {placement.currentStatus}
        </strong>
        <small>{view.currentTask}</small>
      </div>

      {workload ? (
        <section>
          <h3>現在の仕事</h3>
          <div className={s.workloadSummary}>
            <span>担当中 {workload.total}件</span>
            <span>人間判断待ち {workload.needsHumanDecision}件</span>
          </div>
          {workload.items.length === 0 ? (
            <p className={s.workloadEmpty}>現在担当しているWorkItemはありません</p>
          ) : (
            <ul className={s.workloadList}>
              {workload.items.map(item => (
                <li key={item.id} className={s.workloadItem}>
                  <div className={s.workloadMeta}>
                    <strong>{item.kindLabel}</strong>
                    <span>{item.statusLabel}</span>
                  </div>
                  <p>{item.nextAction}</p>
                  {item.needsHumanDecision ? <small>人間判断待ち</small> : null}
                  {item.isDemo ? <em className={s.workloadDemo}>Demo</em> : null}
                  {item.missingInfo.filter(info => info.status === "open").length > 0 && onResolveMissingInfo ? (
                    <div className={s.missingInfoForm}>
                      <strong>不足情報 {item.missingInfo.filter(info => info.status === "open").length}件</strong>
                      <ul>{item.missingInfo.filter(info => info.status === "open").map(info => (
                        <li key={info.id}><button type="button" onClick={() => { setSelectedMissing({ workItemId: item.id, id: info.id, field: info.field }); setChoice(""); setDate(""); setNote(""); setMessage(null); }}>{FIELD_LABEL[info.field] ?? info.field}</button></li>
                      ))}</ul>
                    </div>
                  ) : null}
                  {approvalStates?.[item.id] ? (
                    <div className={s.approvalSection}>
                      {approvalStates[item.id].state === "approved" ? <strong>承認済み</strong> : approvalStates[item.id].state === "pending" ? <><span>人間確認が必要です</span><button type="button" disabled={approving === item.id} onClick={async () => { setApproving(item.id); const result = await onApproveWorkItem?.(item.id, approvalStates[item.id].id); setApproving(null); setMessage(result?.ok ? "承認しました" : result?.message ?? "承認できませんでした"); }}>{approving === item.id ? "承認中…" : "承認する"}</button></> : <span>承認待ちに戻る必要があります</span>}
                    </div>
                  ) : null}
                  {selectedMissing?.workItemId === item.id ? (
                    <div className={s.missingInfoEditor}>
                      <label>{FIELD_LABEL[selectedMissing.field] ?? selectedMissing.field}
                        {selectedMissing.field === "informationFreshness" ? <textarea value={note} onChange={event => setNote(event.target.value)} placeholder="確認メモ（任意）" /> : selectedMissing.field === "availabilityStart" ? <><select value={choice} onChange={event => setChoice(event.target.value)}><option value="">選択してください</option>{OPTIONS[selectedMissing.field].map(option => <option key={option.status} value={option.status}>{option.label}</option>)}</select><input type="date" value={date} onChange={event => setDate(event.target.value)} /></> : <select value={choice} onChange={event => setChoice(event.target.value)}><option value="">選択してください</option>{OPTIONS[selectedMissing.field]?.map(option => <option key={option.status} value={option.status}>{option.label}</option>)}</select>}
                      </label>
                      <div><button type="button" onClick={submit} disabled={saving || (selectedMissing.field !== "informationFreshness" && !choice)}>{saving ? "保存中…" : "確定"}</button><button type="button" onClick={() => setSelectedMissing(null)} disabled={saving}>キャンセル</button></div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {workload.total > workload.items.length ? <p className={s.workloadMore}>ほか{workload.total - workload.items.length}件</p> : null}
          {message ? <p className={s.workloadMessage} role="status">{message}</p> : null}
        </section>
      ) : null}

      <section>
        <h3>担当業務</h3>
        <ul className={s.detailList}>
          {view.duties.map(duty => (
            <li key={duty}>
              <CheckCircle2 size={12} aria-hidden="true" />
              {duty}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>今日の処理例</h3>
        <ul className={s.detailLog}>
          {view.history.map(entry => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>使用設備</h3>
        <ul className={s.detailChips}>
          {placement.equipment.map(item => (
            <li key={item}>
              <Monitor size={11} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {view.finalDeliverables && view.finalDeliverables.length > 0 ? (
        <section>
          <h3>最終成果物</h3>
          <ul className={s.detailChips}>
            {view.finalDeliverables.map(item => (
              <li key={item}>
                <CheckCircle2 size={11} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
