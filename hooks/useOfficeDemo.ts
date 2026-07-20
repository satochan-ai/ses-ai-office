"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_STORAGE_KEY, demoScenarioById, demoScenarios } from "@/data/demoScenario";
import type { DemoScenarioId, DemoSpeed, DemoStatus, DemoStoredResult } from "@/types/demo";

export function useOfficeDemo() {
  const [scenarioId, setScenarioIdState] = useState<DemoScenarioId>("proposal-prep");
  const [status, setStatus] = useState<DemoStatus>("idle");
  const [speed, setSpeed] = useState<DemoSpeed>("normal");
  const [stepIndex, setStepIndex] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const scenario = demoScenarioById[scenarioId];
  const step = stepIndex >= 0 ? scenario.steps[stepIndex] : null;
  const duration = step ? (speed === "fast" ? Math.min(900, Math.round(step.duration * .24)) : step.duration) : 1;

  const setScenarioId = useCallback((next: DemoScenarioId) => {
    if (status !== "idle") return;
    setScenarioIdState(next);
    setStepIndex(-1);
    setElapsed(0);
    setLogs([]);
    setResultOpen(false);
  }, [status]);

  const begin = useCallback(() => {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    setStepIndex(0);
    setElapsed(0);
    setLogs(scenario.steps[0].logs);
    setStatus("running");
    setResultOpen(false);
  }, [scenario]);

  const stop = useCallback(() => {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    setStatus("idle");
    setStepIndex(-1);
    setElapsed(0);
    setLogs([]);
    setResultOpen(false);
  }, []);

  useEffect(() => {
    if (status !== "running" || !step) return;
    const timer = window.setInterval(() => setElapsed(value => Math.min(duration, value + 200)), 200);
    return () => window.clearInterval(timer);
  }, [duration, status, step]);

  useEffect(() => {
    if (status !== "running" || !step || elapsed < duration) return;
    if (stepIndex === scenario.steps.length - 1) {
      const allLogs = scenario.steps.flatMap(item => item.logs);
      const adjustments = scenario.dashboardAdjustments;
      const stored: DemoStoredResult = {
        completed: true,
        completedAt: new Date().toISOString(),
        logs: allLogs,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        metrics: scenario.result.metrics,
        priorityTasks: [scenario.result.priorityTask],
        dashboardAdjustments: adjustments,
        dashboardSummary: scenario.result.dashboardSummary,
        newJobs: adjustments.newJobs ?? 0,
        candidates: adjustments.candidates ?? 0,
        proposals: adjustments.proposals ?? 0,
      };
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(stored));
      setLogs(allLogs);
      setStatus("completed");
      setResultOpen(true);
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    setElapsed(0);
    setLogs(current => [...current, ...scenario.steps[nextIndex].logs]);
  }, [duration, elapsed, scenario, status, step, stepIndex]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (resultOpen) setResultOpen(false);
      else if (status === "running" || status === "paused") stop();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [resultOpen, status, stop]);

  const progress = step ? Math.min(100, Math.round(((stepIndex + elapsed / duration) / scenario.steps.length) * 100)) : 0;
  const stepProgress = step?.progressLabel ? Math.min(100, Math.round(elapsed / duration * 100 / 25) * 25) : 0;

  return useMemo(() => ({
    scenarios: demoScenarios, scenario, scenarioId, setScenarioId, status, speed, setSpeed, step, stepIndex,
    elapsed, progress, stepProgress, matchingProgress: stepProgress, logs, resultOpen, setResultOpen, begin, stop,
    reset: stop, pause: () => setStatus("paused"), resume: () => setStatus("running"),
  }), [scenario, scenarioId, setScenarioId, status, speed, step, stepIndex, elapsed, progress, stepProgress, logs, resultOpen, begin, stop]);
}
