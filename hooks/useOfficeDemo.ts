"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_STORAGE_KEY, demoSteps } from "@/data/demoScenario";
import type { DemoSpeed, DemoStatus, DemoStoredResult } from "@/types/demo";

export function useOfficeDemo() {
  const [status, setStatus] = useState<DemoStatus>("idle");
  const [speed, setSpeed] = useState<DemoSpeed>("normal");
  const [stepIndex, setStepIndex] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const step = stepIndex >= 0 ? demoSteps[stepIndex] : null;
  const duration = step ? (speed === "fast" ? 1100 : step.duration) : 1;

  const begin = useCallback(() => { sessionStorage.removeItem(DEMO_STORAGE_KEY); setStepIndex(0); setElapsed(0); setLogs(demoSteps[0].logs); setStatus("running"); setResultOpen(false); }, []);
  const stop = useCallback(() => { sessionStorage.removeItem(DEMO_STORAGE_KEY); setStatus("idle"); setStepIndex(-1); setElapsed(0); setLogs([]); setResultOpen(false); }, []);
  const reset = useCallback(() => { stop(); }, [stop]);

  useEffect(() => {
    if (status !== "running" || !step) return;
    const timer = window.setInterval(() => setElapsed(value => Math.min(duration, value + 250)), 250);
    return () => window.clearInterval(timer);
  }, [duration, status, step]);

  useEffect(() => {
    if (status !== "running" || !step || elapsed < duration) return;
    if (stepIndex === demoSteps.length - 1) {
      const allLogs = demoSteps.flatMap(item => item.logs);
      const stored: DemoStoredResult = { completed: true, completedAt: new Date().toISOString(), logs: allLogs, newJobs: 1, candidates: 3, proposals: 1 };
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(stored));
      setLogs(allLogs); setStatus("completed"); setResultOpen(true); return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex); setElapsed(0); setLogs(current => [...current, ...demoSteps[nextIndex].logs]);
  }, [duration, elapsed, status, step, stepIndex]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (resultOpen) setResultOpen(false);
      else if (status === "running" || status === "paused") stop();
    };
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }, [resultOpen, status, stop]);

  const progress = step ? Math.min(100, Math.round(((stepIndex + elapsed / duration) / demoSteps.length) * 100)) : 0;
  const matchingProgress = step?.id === 3 ? Math.min(100, Math.round(elapsed / duration * 100 / 25) * 25) : step && step.id > 3 ? 100 : 0;
  return useMemo(() => ({ status, speed, setSpeed, step, stepIndex, elapsed, progress, matchingProgress, logs, resultOpen, setResultOpen, begin, stop, reset, pause: () => setStatus("paused"), resume: () => setStatus("running") }), [status, speed, step, stepIndex, elapsed, progress, matchingProgress, logs, resultOpen, begin, stop, reset]);
}
