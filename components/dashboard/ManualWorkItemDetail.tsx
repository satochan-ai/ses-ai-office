"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getManualWorkItemDetail, type ManualWorkItemDetailResult, type RelatedManualWorkItem } from "@/lib/application/getManualWorkItemDetail";
import { getManualRevisionDraft, type ManualRevisionDraft } from "@/lib/application/reviseManualWorkItem";
import { createWorkItemRepository } from "@/lib/repositories/createWorkItemRepository";
import ManualWorkItemRevisionForm from "./ManualWorkItemRevisionForm";

const ERROR_TEXT = { "not-found": "この案件はこのタブの一時保存領域に見つかりません。", "not-manual": "手入力した架空案件ではないため、ここでは表示できません。", "repository-error": "保存データを読み込めませんでした。データは変更していません。" } as const;
const REVISION_LABEL = { returned: "修正依頼の理由", rejected: "承認しなかった理由" } as const;

function Related({ label, item }: { label: string; item: RelatedManualWorkItem }) {
  return <p className="manual-detail-related">{label}：{item.confirmed ? <strong>{item.title ?? "（案件名を読み込めません）"}</strong> : <em>関連案件を確認できません</em>}<small>（WorkItem ID {item.id}）</small></p>;
}

/** 保存済みの状態・確認記録だけを表示する。操作履歴・監査ログではない。開くたび・更新操作のたびに再取得する。 */
export default function ManualWorkItemDetail({ workItemId, onClose, onChanged }: { workItemId: string; onClose: () => void; onChanged?: () => Promise<void> }) {
  const [result, setResult] = useState<ManualWorkItemDetailResult | null>(null);
  const [draft, setDraft] = useState<ManualRevisionDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [revising, setRevising] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reviseButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `manual-detail-${workItemId}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const repository = createWorkItemRepository({ storage: window.sessionStorage });
      setResult(await getManualWorkItemDetail(repository, workItemId));
      setDraft(await getManualRevisionDraft(repository, workItemId));
    } catch { setResult({ ok: false, code: "repository-error" }); setDraft(null); }
    finally { setLoading(false); }
  }, [workItemId]);
  useEffect(() => { void load(); headingRef.current?.focus(); }, [load]);
  // キャンセル時はフォームが消えてボタンが再描画された後にフォーカスを戻す。
  const focusReviseButton = useRef(false);
  useEffect(() => { if (!revising && focusReviseButton.current) { focusReviseButton.current = false; reviseButtonRef.current?.focus(); } }, [revising]);

  // 修正版の登録・古い表示からの操作のあとは、保存済みの状態を読み直して一覧も更新する。
  const revised = async (message: string) => {
    setRevising(false); setNotice(message);
    await load();
    await onChanged?.();
    headingRef.current?.focus();
  };

  const detail = result?.ok ? result.detail : null;
  return <section className="manual-detail" id={`${titleId}-region`} aria-labelledby={titleId} aria-busy={loading}>
    <div className="manual-detail-head">
      <h4 id={titleId} ref={headingRef} tabIndex={-1}>{detail?.title ?? "手入力案件の詳細"}</h4>
      <div><button type="button" onClick={() => void load()} disabled={loading || revising}>{loading ? "読み込み中…" : "最新の状態を読み込む"}</button><button type="button" onClick={onClose}>詳細を閉じる</button></div>
    </div>
    <p className="manual-detail-note">このタブに保存済みの状態と確認記録です（操作履歴・監査ログではありません）。架空・匿名データのみを扱います。</p>
    {notice ? <p className="manual-message" role="status">{notice}</p> : null}
    {result && !result.ok ? <p role="alert">{ERROR_TEXT[result.code]}</p> : null}
    {detail ? <>
      <p className="manual-detail-status" role="status">現在の状態：<strong>{detail.statusLabel}</strong></p>
      {detail.successor ? <Related label="修正版" item={detail.successor} /> : null}
      {detail.parent ? <Related label="元の案件" item={detail.parent} /> : null}
      {draft?.ok ? <div className="manual-revision">
        <p><strong>{REVISION_LABEL[draft.revision.kind]}：</strong>{draft.revision.reason}</p>
        {revising
          ? <ManualWorkItemRevisionForm sourceWorkItemId={workItemId} initial={draft.input} onRevised={revised} onCancel={() => { focusReviseButton.current = true; setRevising(false); }} />
          : <button type="button" ref={reviseButtonRef} onClick={() => { setNotice(null); setRevising(true); }} disabled={loading}>修正して再登録</button>}
      </div> : draft && !draft.ok && draft.code === "inconsistent-reason" ? <p className="manual-revision" role="note">差し戻し・却下の記録が確認できないため、修正版を作成できません。</p> : null}
      <h5>案件情報</h5>
      {detail.inputLines.length ? <dl>{detail.inputLines.map(line => <div key={line.label}><dt>{line.label}</dt><dd>{line.value}</dd></div>)}</dl> : <p>登録時の入力記録が見つかりません。</p>}
      <dl><div><dt>登録日時</dt><dd>{detail.createdAt}</dd></div><div><dt>WorkItem ID</dt><dd><small>{detail.id}</small></dd></div></dl>
      <h5>Humanへの確認事項</h5>
      {detail.missingInfo.length ? <ul>{detail.missingInfo.map(info => <li key={info.id}><strong>{info.label}</strong>：{info.answered ? <>{info.answer}<small>（回答日時 {info.answeredAt}）</small></> : <em>未回答</em>}<br /><small>{info.question}</small></li>)}</ul> : <p>確認事項の記録はありません。</p>}
      <h5>準備内容の確認結果</h5>
      {detail.approvals.length ? <ul>{detail.approvals.map(approval => <li key={approval.id}><strong>{approval.stateLabel}</strong>{approval.current ? <small>（現在の確認対象）</small> : null}<br /><small>確認依頼 {approval.requestedAt}{approval.decidedAt ? ` ／ 結果 ${approval.decidedAt}` : ""}</small>{approval.reason ? <><br />理由：{approval.reason}</> : null}</li>)}</ul> : <p>準備内容の確認依頼はまだ作成されていません。</p>}
      {detail.rework ? <p>差し戻し理由：{detail.rework.reason}<small>（{detail.rework.returnedAt}）</small></p> : null}
      <h5>保存済みの根拠（{detail.evidence.length}件）</h5>
      {detail.evidence.length ? <ol>{detail.evidence.map(entry => <li key={entry.id}><strong>{entry.kindLabel}</strong>{entry.relatedTo ? `：${entry.relatedTo}` : ""}<small>（{entry.createdAt}）</small>{entry.linked ? null : <em> 案件に未登録の記録</em>}{entry.lines.map(line => <span key={line.label} className="manual-detail-line">{line.label}：{line.value}</span>)}</li>)}</ol> : <p>記録なし</p>}
      {detail.missingEvidenceCount > 0 ? <p>参照先が見つからない記録：{detail.missingEvidenceCount}件</p> : null}
    </> : null}
  </section>;
}
