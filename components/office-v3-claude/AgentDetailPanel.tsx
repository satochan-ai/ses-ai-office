"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Monitor, X } from "lucide-react";
import type { V3AgentView } from "@/types/officeV3Claude";
import s from "./OfficeV3.module.css";

export default function AgentDetailPanel({ view, onClose }: { view: V3AgentView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
