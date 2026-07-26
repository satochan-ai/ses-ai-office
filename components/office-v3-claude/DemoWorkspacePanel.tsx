"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Gavel, Play, RotateCcw, ScrollText, ShieldAlert } from "lucide-react";
import type {
  OfficeV3ApprovalState,
  OfficeV3DemoLog,
  OfficeV3DemoScenario,
  OfficeV3DemoStatus,
  OfficeV3DemoStep,
} from "@/types/officeV3ClaudeDemo";
import s from "./OfficeV3.module.css";

type Props = {
  scenarios: OfficeV3DemoScenario[];
  selectedScenarioId: string;
  selectedScenario: OfficeV3DemoScenario;
  selectScenario: (id: string) => void;
  demoStatus: OfficeV3DemoStatus;
  approvalState: OfficeV3ApprovalState;
  approvalLocked: boolean;
  currentStep: OfficeV3DemoStep | null;
  currentStepIndex: number;
  totalSteps: number;
  progressPercent: number;
  activeAgentId: string | null;
  activeStatusText: string;
  agentNames: Record<string, string>;
  logs: OfficeV3DemoLog[];
  startDemo: () => void;
  resetDemo: () => void;
  approve: () => void;
  reject: () => void;
};

/**
 * デモに関する表示・操作を1箇所へ集約する右側の固定パネル。
 * シナリオ選択・開始／リセット・進捗・現在工程・現在担当AI・最新ログ・
 * 対象データ概要・承認/差し戻し・完了結果まで、これ1つでまとめて扱う
 * （DemoControlPanel / DemoActivityLog を統合し、細かい分割を避けた構成）。
 */
export default function DemoWorkspacePanel({
  scenarios, selectedScenarioId, selectedScenario, selectScenario,
  demoStatus, approvalState, approvalLocked,
  currentStep, currentStepIndex, totalSteps, progressPercent,
  activeAgentId, activeStatusText, agentNames,
  logs, startDemo, resetDemo, approve, reject,
}: Props) {
  const [logsExpanded, setLogsExpanded] = useState(false);
  const canChangeScenario = demoStatus === "idle" || demoStatus === "completed";

  useEffect(() => {
    if (demoStatus === "idle") setLogsExpanded(false);
  }, [demoStatus]);

  const recentLogs = logsExpanded ? [...logs].reverse() : logs.slice(-3).reverse();
  const activeAgentName = activeAgentId ? agentNames[activeAgentId] ?? activeAgentId : null;

  return (
    <aside className={s.demoWorkspace} aria-label="デモ操作パネル">
      <div className={s.demoWorkspaceHeader}>
        <span className={s.demoPanelTag}>固定デモ・5シナリオ</span>
        <label className={s.demoScenarioSelectWrap}>
          <span>デモシナリオ</span>
          <select
            value={selectedScenarioId}
            disabled={!canChangeScenario}
            onChange={event => selectScenario(event.target.value)}
          >
            {scenarios.map(scenario => (
              <option key={scenario.id} value={scenario.id}>{scenario.title}</option>
            ))}
          </select>
          <ChevronDown size={13} aria-hidden="true" className={s.demoScenarioSelectIcon} />
        </label>
      </div>

      {demoStatus === "idle" ? <p className={s.demoScenarioDesc}>{selectedScenario.shortDescription}</p> : null}

      <div className={s.demoWorkspaceActions}>
        {demoStatus === "idle" ? (
          <button type="button" className={s.demoPanelPrimary} onClick={startDemo}>
            <Play size={13} aria-hidden="true" />
            デモ開始
          </button>
        ) : demoStatus === "completed" ? (
          <>
            <button type="button" className={s.demoPanelPrimary} onClick={startDemo}>
              <Play size={13} aria-hidden="true" />
              再実行
            </button>
            <button type="button" className={s.demoPanelGhost} onClick={resetDemo}>
              <RotateCcw size={13} aria-hidden="true" />
              別のシナリオを選ぶ
            </button>
          </>
        ) : (
          <button type="button" className={s.demoPanelGhost} onClick={resetDemo}>
            <RotateCcw size={13} aria-hidden="true" />
            リセット
          </button>
        )}
      </div>

      {demoStatus !== "idle" ? (
        <div className={s.demoProgress} aria-live="polite">
          <div className={s.demoProgressHead}>
            <span>STEP {Math.min(currentStepIndex + 1, totalSteps)} / {totalSteps}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className={s.demoProgressBar}>
            <div className={s.demoProgressFill} style={{ width: `${progressPercent}%` }} />
          </div>
          <p className={s.demoProgressStep}>
            {approvalState === "rejected" && demoStatus === "running" ? (
              <span className={s.demoProgressRejectedTag}>差し戻し再処理中</span>
            ) : null}
            {currentStep?.title ?? ""}
          </p>
          {activeAgentName ? (
            <p className={s.demoProgressAgent}>
              担当：{activeAgentName}
              {activeStatusText ? `（${activeStatusText}）` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 承認待ちのときは、操作（承認/差し戻し）を対象データ概要より先に置き、
          スクロールしなくてもボタンへ到達しやすくする。 */}
      {demoStatus === "awaiting-approval" ? (
        <div className={s.demoApprovalCard}>
          <h3>{selectedScenario.approvalSummary.title}</h3>
          <ul className={s.detailList}>
            <li><ShieldAlert size={12} aria-hidden="true" />AI品質管理：{selectedScenario.approvalSummary.qualityResult}</li>
            <li><Gavel size={12} aria-hidden="true" />AI営業Mgr：{selectedScenario.approvalSummary.managerDecision}</li>
            {selectedScenario.approvalSummary.strategistProposal ? (
              <li><Gavel size={12} aria-hidden="true" />AI経営参謀：{selectedScenario.approvalSummary.strategistProposal}</li>
            ) : null}
          </ul>
          <div className={s.humanApprovalActions}>
            <button
              type="button"
              className={`${s.humanApprovalButton} ${s.humanApprovalApprove}`}
              onClick={approve}
              disabled={approvalLocked}
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              承認
            </button>
            <button
              type="button"
              className={`${s.humanApprovalButton} ${s.humanApprovalReject}`}
              onClick={reject}
              disabled={approvalLocked}
            >
              <AlertTriangle size={14} aria-hidden="true" />
              差し戻し
            </button>
          </div>
        </div>
      ) : null}

      {/* 承認待ちのときは、対象データの詳細行は省き要約1行だけにする
          （詳細行は承認カードと合わせると縦に長くなりすぎ、最新ログが画面外に落ちてしまうため）。
          running/completed のときは従来どおり詳細行まで表示する。 */}
      {demoStatus !== "idle" ? (
        <dl className={s.demoJobCard}>
          <div className={s.demoJobCardHead}>
            <dt>{selectedScenario.subjectLabel}</dt>
            <dd>{selectedScenario.subjectSummary}</dd>
          </div>
          {demoStatus !== "awaiting-approval" ? selectedScenario.subjectDetails.map(row => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          )) : null}
        </dl>
      ) : null}

      {demoStatus === "completed" ? (
        <div className={s.demoResultCard}>
          <h3><CheckCircle2 size={14} aria-hidden="true" />デモ完了</h3>
          <dl>
            {selectedScenario.approvalSummary.metrics.map(metric => (
              <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>
            ))}
            <div><dt>品質確認</dt><dd>合格</dd></div>
            <div><dt>人間責任者</dt><dd>承認済み</dd></div>
          </dl>
        </div>
      ) : null}

      {demoStatus !== "idle" ? (
        <div className={s.demoLogPanel}>
          <div className={s.demoLogPanelHead}>
            <ScrollText size={12} aria-hidden="true" />
            <span>処理ログ</span>
            {logs.length > 3 ? (
              <button type="button" className={s.demoLogToggle} onClick={() => setLogsExpanded(v => !v)}>
                {logsExpanded ? "閉じる" : "すべて見る"}
              </button>
            ) : null}
          </div>
          <ol className={logsExpanded ? s.demoLogScroll : undefined}>
            {recentLogs.map((log, index) => (
              <li key={log.id} className={index === 0 && !logsExpanded ? s.demoLogLatest : undefined}>
                <span aria-hidden="true">{index === 0 && !logsExpanded && demoStatus === "running" ? "●" : "✓"}</span> {log.message}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </aside>
  );
}
