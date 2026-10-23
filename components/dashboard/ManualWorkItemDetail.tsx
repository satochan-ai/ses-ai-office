"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getManualWorkItemDetail, type ManualWorkItemDetailResult } from "@/lib/application/getManualWorkItemDetail";
import { createWorkItemRepository } from "@/lib/repositories/createWorkItemRepository";

const ERROR_TEXT = { "not-found": "この案件はこのタブの一時保存領域に見つかりません。", "not-manual": "手入力した架空案件ではないため、ここでは表示できません。", "repository-error": "保存データを読み込めませんでした。データは変更していません。" } as const;

/** 保存済みの状態・確認記録だけを表示する。操作履歴・監査ログではない。開くたび・更新操作のたびに再取得する。 */
export default function ManualWorkItemDetail({ workItemId, onClose }: { workItemId: string; onClose: () => void }) {
  const [result, setResult] = useState<ManualWorkItemDetailResult | null>(null);
  const [loading, setLoading] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = `manual-detail-${workItemId}`;

  const load = useCallback(async () => {
    setLoading(true);
    try { setResult(await getManualWorkItemDetail(createWorkItemRepository({ storage: window.sessionStorage }), workItemId)); }
    catch { setResult({ ok: false, code: "repository-error" }); }
    finally { setLoading(false); }
  }, [workItemId]);
  useEffect(() => { void load(); headingRef.current?.focus(); }, [load]);

  const detail = result?.ok ? result.detail : null;
  return <section className="manual-detail" id={`${titleId}-region`} aria-labelledby={titleId} aria-busy={loading}>
    <div className="manual-detail-head">
      <h4 id={titleId} ref={headingRef} tabIndex={-1}>{detail?.title ?? "手入力案件の詳細"}</h4>
      <div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "読み込み中…" : "最新の状態を読み込む"}</button><button type="button" onClick={onClose}>詳細を閉じる</button></div>
    </div>
    <p className="manual-detail-note">このタブに保存済みの状態と確認記録です（操作履歴・監査ログではありません）。架空・匿名データのみを扱います。</p>
    {result && !result.ok ? <p role="alert">{ERROR_TEXT[result.code]}</p> : null}
    {detail ? <>
      <p className="manual-detail-status" role="status">現在の状態：<strong>{detail.statusLabel}</strong></p>
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
