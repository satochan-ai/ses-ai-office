"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Gavel, RotateCcw, ShieldAlert, X } from "lucide-react";
import type { V3AgentView, V3HumanSeat } from "@/types/officeV3Claude";
import type { OfficeV3ApprovalState, OfficeV3DemoJob, OfficeV3DemoStatus } from "@/types/officeV3ClaudeDemo";
import s from "./OfficeV3.module.css";

type Props = {
  seat: V3HumanSeat;
  strategistView?: V3AgentView;
  managerView?: V3AgentView;
  qualityView?: V3AgentView;
  onClose: () => void;
  /** 以下はデモ関連（未指定時は従来どおりの固定表示のみになる）。 */
  demoStatus?: OfficeV3DemoStatus;
  approvalState?: OfficeV3ApprovalState;
  demoJob?: OfficeV3DemoJob;
  demoStepTitle?: string;
  onApprove?: () => void;
  onReject?: () => void;
};

/**
 * 人間責任者席専用の詳細パネル。AgentDetailPanel とは別コンポーネントとして分離し、
 * AI社員の詳細表示（AgentDetailPanel）には一切手を加えない。
 * デモ未実行時は既存の固定表示のみを行い、デモ関連props未指定時の見た目は変えない。
 */
export default function HumanSeatPanel({
  seat, strategistView, managerView, qualityView, onClose,
  demoStatus = "idle", approvalState = "none", demoJob, demoStepTitle, onApprove, onReject,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // 承認・差し戻しボタンの連打防止。
  // useState単体だと、setState の反映（再レンダー）を待つ間に同期的な連続クリックが
  // 古いactionLocked値を読んでしまい素通りするため、即時反映されるrefで実際のロックを行う。
  // useStateの方はボタンのdisabled表示（見た目の反映）専用に使う。
  const actionLockRef = useRef(false);
  const [actionLocked, setActionLocked] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
  }, [seat.id]);

  useEffect(() => {
    if (demoStatus === "awaiting-approval") {
      actionLockRef.current = false;
      setActionLocked(false);
    }
  }, [demoStatus]);

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

  // 承認待ち件数は静的データ(seat.pendingApprovals)を書き換えず、表示上だけデモ分を加算する。
  const displayPendingApprovals = seat.pendingApprovals + (demoStatus === "awaiting-approval" ? 1 : 0);

  const handleApprove = () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionLocked(true);
    onApprove?.();
  };
  const handleReject = () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionLocked(true);
    onReject?.();
  };

  return (
    <div
      ref={panelRef}
      className={`${s.detail} ${s.humanSeatPanel}`}
      role="dialog"
      aria-modal="false"
      aria-label={`${seat.label} の詳細`}
    >
      <header>
        <div>
          <span className={s.detailZone}>最終承認層</span>
          <strong>{seat.label}</strong>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="詳細を閉じる（Escキーでも閉じます）">
          <X size={16} />
        </button>
      </header>

      <p className={s.detailRole}>
        {seat.subLabel}。AI経営参謀・AI営業Mgr・AI品質管理からの重要提案／報告／警告を確認し、AIでは判断できない案件の最終判断・承認を行います。
      </p>

      <div className={s.detailStatus}>
        <span>本日の重要判断</span>
        <strong>
          <i aria-hidden="true" />
          {seat.todayKeyDecision}
        </strong>
        <small>承認待ち {displayPendingApprovals}件・要確認 {seat.needsReview}件</small>
      </div>

      {demoStatus === "running" && approvalState !== "rejected" ? (
        <p className={s.demoProcessingNote}>
          <ShieldAlert size={13} aria-hidden="true" />
          AI組織が案件を処理中です（{demoStepTitle ?? "処理中"}）
        </p>
      ) : null}

      {demoStatus === "running" && approvalState === "rejected" ? (
        <p className={s.demoProcessingNote}>
          <RotateCcw size={13} aria-hidden="true" />
          差し戻し済み・AI組織が再処理中です（{demoStepTitle ?? "再処理中"}）
        </p>
      ) : null}

      {demoStatus === "awaiting-approval" && demoJob ? (
        <>
          <dl className={s.demoJobCard}>
            <div><dt>案件名</dt><dd>{demoJob.title}</dd></div>
            <div><dt>顧客区分</dt><dd>{demoJob.clientType}</dd></div>
            <div><dt>候補者数</dt><dd>{demoJob.candidateCount}名</dd></div>
            <div><dt>最終候補者</dt><dd>{demoJob.finalCandidateCount}名</dd></div>
            <div><dt>マッチングスコア</dt><dd>{demoJob.matchingScore}点</dd></div>
            <div><dt>緊急度</dt><dd>{demoJob.urgency}</dd></div>
          </dl>

          <section>
            <h3>AI品質管理の結果</h3>
            <ul className={s.detailList}>
              <li><ShieldAlert size={12} aria-hidden="true" />品質基準を満たしました（修正後に再確認済み）</li>
            </ul>
          </section>

          <section>
            <h3>AI営業Mgrの判断</h3>
            <ul className={s.detailList}>
              <li><Gavel size={12} aria-hidden="true" />重要案件として経営判断へ上げました</li>
            </ul>
          </section>

          <section>
            <h3>AI経営参謀の提案</h3>
            <ul className={s.detailList}>
              <li><Gavel size={12} aria-hidden="true" />収益性・顧客関係・受注可能性を踏まえ、承認を提案します</li>
            </ul>
          </section>

          <div className={s.humanApprovalActions}>
            <button
              type="button"
              className={`${s.humanApprovalButton} ${s.humanApprovalApprove}`}
              onClick={handleApprove}
              disabled={actionLocked}
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              承認
            </button>
            <button
              type="button"
              className={`${s.humanApprovalButton} ${s.humanApprovalReject}`}
              onClick={handleReject}
              disabled={actionLocked}
            >
              <AlertTriangle size={14} aria-hidden="true" />
              差し戻し
            </button>
          </div>
        </>
      ) : null}

      {demoStatus === "completed" ? (
        <p className={`${s.demoResultNote} ${s.demoResultApproved}`}>
          <CheckCircle2 size={13} aria-hidden="true" />
          承認済み・提案準備完了
        </p>
      ) : null}

      <section>
        <h3>AI経営参謀からの提案</h3>
        <ul className={s.detailList}>
          <li>
            <Gavel size={12} aria-hidden="true" />
            {strategistView?.currentTask ?? "現在、提案はありません"}
          </li>
        </ul>
      </section>

      <section>
        <h3>AI営業Mgrからの報告</h3>
        <ul className={s.detailList}>
          <li>
            <Gavel size={12} aria-hidden="true" />
            {managerView?.currentTask ?? "現在、報告はありません"}
          </li>
        </ul>
      </section>

      <section>
        <h3>AI品質管理からの警告</h3>
        <ul className={s.detailList}>
          <li>
            <ShieldAlert size={12} aria-hidden="true" />
            {qualityView?.currentTask ?? "現在、警告はありません"}
          </li>
        </ul>
      </section>

      <section>
        <h3>対応が必要な重要事項</h3>
        <ul className={s.detailChips}>
          <li>
            <AlertTriangle size={11} aria-hidden="true" />
            {seat.todayKeyDecision}
          </li>
        </ul>
      </section>
    </div>
  );
}
