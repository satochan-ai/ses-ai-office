import { Check, Mail, Phone } from "lucide-react";
import type { AgentAnimationState } from "@/types/animation";
import type { OfficeAgent } from "@/types/office";
import s from "./VisualOffice.module.css";

export function AgentWorkAnimation({ agent, state, matchingProgress }: { agent: OfficeAgent; state: AgentAnimationState; matchingProgress: number }) {
  const active = state !== "idle";
  return <>
    <span className={`${s.workMotion} ${s[`motion_${state}`]} ${active ? s.motionActive : ""}`} aria-hidden="true" />
    <div className={`${s.roomWorkVisual} ${s[`visual_${agent.decoration}`]} ${s[`visual_${state}`]}`} aria-hidden="true">
      {agent.decoration === "strategy" && <><i className={s.priorityMarker}>1</i><i className={s.priorityMarker}>2</i><i className={s.priorityMarker}>3</i><span className={s.documentLine} /></>}
      {agent.decoration === "analytics" && <><i className={s.scanLine} /><span className={s.resultCard}>分析結果</span></>}
      {agent.decoration === "search" && <><Phone size={11} /><Mail size={11} /></>}
      {agent.decoration === "network" && <><i /><i /><i /></>}
      {agent.decoration === "matching" && <><span className={s.workCard}>案件</span><i className={s.matchLink} /><span className={s.workCard}>要員</span>{matchingProgress >= 75 && <b className={s.candidateCount}>候補 3名</b>}</>}
      {agent.decoration === "recruit" && <><span className={s.resumeFlip}>履歴書</span><span className={s.calendarMark}>面談</span></>}
      {agent.decoration === "follow" && <><span className={s.followChat}>確認中</span><span className={s.followCheck}>✓</span></>}
    </div>
    {state === "completed" && <span className={s.workComplete} role="status" aria-live="polite"><Check size={10} />完了しました</span>}
  </>;
}
