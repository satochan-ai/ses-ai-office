"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentAnimationMap, AgentAnimationState } from "@/types/animation";

export function useAgentAnimation() {
  const [states, setStates] = useState<AgentAnimationMap>({});
  const timers = useRef<Record<string, number>>({});
  const clear = useCallback((id: string) => { if (timers.current[id]) window.clearTimeout(timers.current[id]); delete timers.current[id]; }, []);
  const run = useCallback((id: string, state: AgentAnimationState) => {
    clear(id); setStates(current => ({ ...current, [id]: state }));
    timers.current[id] = window.setTimeout(() => {
      setStates(current => ({ ...current, [id]: "completed" }));
      timers.current[id] = window.setTimeout(() => setStates(current => { const next = { ...current }; delete next[id]; return next; }), 2200);
    }, 1800);
  }, [clear]);
  useEffect(() => () => Object.values(timers.current).forEach(window.clearTimeout), []);
  return { states, run };
}
