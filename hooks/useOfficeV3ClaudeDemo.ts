"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { officeV3ClaudeDemoScenarios } from "@/data/officeV3ClaudeDemo";
import type {
  OfficeV3ApprovalState,
  OfficeV3DemoLog,
  OfficeV3DemoScenario,
  OfficeV3DemoStatus,
  OfficeV3DemoStep,
} from "@/types/officeV3ClaudeDemo";

const DEFAULT_SCENARIO_ID = officeV3ClaudeDemoScenarios[0].id;

/**
 * Claude版V3専用の固定デモ（5シナリオ）進行フック。デモ状態の唯一の管理元。
 *
 * タイマー方針：
 * - setIntervalによる常時監視はせず、アクティブなステップ1つに対して setTimeout を1本だけ張る。
 * - 次のステップへ進む・シナリオ切替・リセット・アンマウントいずれの場合も、
 *   useEffectのクリーンアップ（`return () => clearTimeout(timer)`）だけでタイマーを解除する。
 * - 人間承認待ち（requiresHumanApproval）に到達した場合はタイマーを張らずに停止する。
 * - React Strict Modeの開発時二重実行（mount→cleanup→mount）対策として、
 *   「直前にログを追加したステップID」をrefで記録し、同一ステップの重複ログ追加を防ぐ。
 *
 * 承認・差し戻しの連打防止は、このフック内の1本の`actionLockRef`だけで行う。
 * 人間責任者席パネル・デモ操作パネルのどちらから approve/reject を呼んでも同じロックを共有するため、
 * 二重実装にならず、両方の表示が常に同じ状態へ揃う。
 */
export function useOfficeV3ClaudeDemo() {
  const [selectedScenarioId, setSelectedScenarioId] = useState(DEFAULT_SCENARIO_ID);
  const [demoStatus, setDemoStatus] = useState<OfficeV3DemoStatus>("idle");
  const [approvalState, setApprovalState] = useState<OfficeV3ApprovalState>("none");
  const [approvalLocked, setApprovalLocked] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [rejectionIndex, setRejectionIndex] = useState(-1);
  const [logs, setLogs] = useState<OfficeV3DemoLog[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeStatusText, setActiveStatusText] = useState("");

  const loggedStepRef = useRef<string | null>(null);
  const logSeqRef = useRef(0);
  const actionLockRef = useRef(false);

  const selectedScenario: OfficeV3DemoScenario = useMemo(
    () => officeV3ClaudeDemoScenarios.find(scenario => scenario.id === selectedScenarioId) ?? officeV3ClaudeDemoScenarios[0],
    [selectedScenarioId],
  );
  const { steps, rejectionSteps } = selectedScenario;

  const appendLogs = useCallback((stepId: string, messages: string[]) => {
    if (messages.length === 0) return;
    setLogs(prev => [
      ...prev,
      ...messages.map(message => {
        logSeqRef.current += 1;
        return { id: `log-${logSeqRef.current}`, message, stepId, createdAt: Date.now() };
      }),
    ]);
  }, []);

  const activeStep: OfficeV3DemoStep | null = useMemo(() => {
    if (rejectionIndex >= 0) return rejectionSteps?.[rejectionIndex] ?? null;
    if (currentStepIndex >= 0 && currentStepIndex < steps.length) return steps[currentStepIndex];
    return null;
  }, [currentStepIndex, rejectionIndex, steps, rejectionSteps]);

  // アクティブなステップが変わるたびに、ログ追加＋状態表示の更新＋（必要なら）次ステップへのタイマーを1本張る。
  useEffect(() => {
    if (!activeStep) return;

    if (loggedStepRef.current !== activeStep.id) {
      appendLogs(activeStep.id, activeStep.logs);
      loggedStepRef.current = activeStep.id;
    }
    setActiveAgentId(activeStep.agentId);
    setActiveStatusText(activeStep.statusText);

    if (activeStep.requiresHumanApproval) {
      actionLockRef.current = false;
      setApprovalLocked(false);
      setDemoStatus("awaiting-approval");
      setApprovalState("pending");
      return;
    }

    const timer = window.setTimeout(() => {
      if (rejectionIndex >= 0) {
        const nextRejectionIdx = rejectionIndex + 1;
        if (rejectionSteps && nextRejectionIdx < rejectionSteps.length) {
          setRejectionIndex(nextRejectionIdx);
        } else {
          // 再処理フロー完了。currentStepIndexは承認ゲート（人間承認待ちステップ）のまま変えていないため、
          // rejectionIndexを-1に戻すだけで activeStep が自動的にそのステップへ戻り、
          // 上のuseEffectが再度 requiresHumanApproval を検知して承認待ち状態へ復帰する。
          setRejectionIndex(-1);
        }
      } else {
        const nextIdx = currentStepIndex + 1;
        if (nextIdx < steps.length) {
          setCurrentStepIndex(nextIdx);
        } else {
          setDemoStatus("completed");
        }
      }
    }, activeStep.durationMs);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, appendLogs]);

  const resetRuntimeState = useCallback(() => {
    loggedStepRef.current = null;
    logSeqRef.current = 0;
    actionLockRef.current = false;
    setLogs([]);
    setRejectionIndex(-1);
    setCurrentStepIndex(-1);
    setApprovalState("none");
    setApprovalLocked(false);
    setActiveAgentId(null);
    setActiveStatusText("");
  }, []);

  // シナリオ変更可能なのは idle / completed のときだけ。切り替えたら前シナリオの状態は残さない。
  const selectScenario = useCallback((id: string) => {
    if (demoStatus !== "idle" && demoStatus !== "completed") return;
    setSelectedScenarioId(id);
    resetRuntimeState();
    setDemoStatus("idle");
  }, [demoStatus, resetRuntimeState]);

  const startDemo = useCallback(() => {
    resetRuntimeState();
    setDemoStatus("running");
    setCurrentStepIndex(0);
  }, [resetRuntimeState]);

  const resetDemo = useCallback(() => {
    // currentStepIndex/rejectionIndexを-1に戻すと activeStep が null になり、
    // 直前のuseEffectのクリーンアップで進行中タイマーが解除される。
    resetRuntimeState();
    setDemoStatus("idle");
  }, [resetRuntimeState]);

  // 注意：setStateのupdater関数の内側で他のsetStateを呼ぶ副作用のある書き方はしない
  // （Strict Modeがupdaterを2回呼ぶため二重実行の原因になる）。
  // 代わりに、直前のレンダーで確定した demoStatus を通常のクロージャとして読み、
  // useCallbackの依存配列に demoStatus を含めて常に最新値を参照する。
  // 連打防止は actionLockRef（同期）で行い、useState側は disabled 表示専用に使う。
  const approve = useCallback(() => {
    if (demoStatus !== "awaiting-approval" || actionLockRef.current) return;
    actionLockRef.current = true;
    setApprovalLocked(true);
    appendLogs("approve", ["人間責任者が提案を承認しました"]);
    setApprovalState("approved");
    setRejectionIndex(-1);
    setDemoStatus("running");
    setCurrentStepIndex(prev => prev + 1);
  }, [demoStatus, appendLogs]);

  const reject = useCallback(() => {
    if (demoStatus !== "awaiting-approval" || actionLockRef.current) return;
    actionLockRef.current = true;
    setApprovalLocked(true);
    appendLogs("reject", ["人間責任者が提案内容を差し戻しました"]);
    setApprovalState("rejected");
    setDemoStatus("running");
    setRejectionIndex(0);
  }, [demoStatus, appendLogs]);

  // アンマウント時のタイマー解除は、activeStepを監視するuseEffectのクリーンアップで
  // 自動的に行われるため、ここで別途タイマーを保持・解除する必要はない。

  const totalSteps = steps.length;
  const progressPercent = currentStepIndex >= 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0;

  return {
    scenarios: officeV3ClaudeDemoScenarios,
    selectedScenarioId,
    selectedScenario,
    selectScenario,
    demoStatus,
    approvalState,
    approvalLocked,
    currentStep: activeStep,
    currentStepIndex,
    totalSteps,
    progressPercent,
    activeAgentId: demoStatus === "idle" ? null : activeAgentId,
    activeStatusText,
    logs,
    isRejectionFlow: rejectionIndex >= 0,
    startDemo,
    resetDemo,
    approve,
    reject,
  };
}
