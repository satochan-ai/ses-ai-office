"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Gavel, ShieldAlert, X } from "lucide-react";
import type { V3AgentView, V3HumanSeat } from "@/types/officeV3Claude";
import s from "./OfficeV3.module.css";

type Props = {
  seat: V3HumanSeat;
  strategistView?: V3AgentView;
  managerView?: V3AgentView;
  qualityView?: V3AgentView;
  onClose: () => void;
};

/**
 * 人間責任者席専用の詳細パネル。AgentDetailPanel とは別コンポーネントとして分離し、
 * AI社員の詳細表示（AgentDetailPanel）には一切手を加えない。
 */
export default function HumanSeatPanel({ seat, strategistView, managerView, qualityView, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [seat.id]);

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
        <small>承認待ち {seat.pendingApprovals}件・要確認 {seat.needsReview}件</small>
      </div>

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
