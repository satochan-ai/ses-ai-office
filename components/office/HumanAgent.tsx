import { Check, Sparkles } from "lucide-react";
import type { OfficeAgent } from "@/types/office";
import type { AgentLayout } from "@/types/layout";
import type { RoutedAgentMotion } from "@/types/route";
import s from "./OfficeFloor.module.css";

export default function HumanAgent({ agent, layout, motion, active, beingVisited, onSelect }: { agent: OfficeAgent; layout: AgentLayout; motion: RoutedAgentMotion; active: boolean; beingVisited: boolean; onSelect: (agent: OfficeAgent) => void }) {
  const dx = motion.point.x - layout.desk.x; const dy = motion.point.y - layout.desk.y;
  const speech = motion.interactionText ?? agent.speech;
  const classes = [s.agent, s[`person_${layout.appearance}`], s[`motion_${motion.state}`], s[`work_${motion.work}`], s[`facing_${motion.facing}`], motion.seated && s.agentSeated, beingVisited && s.beingVisited, active && s.agentActive].filter(Boolean).join(" ");
  return <button
    className={classes}
    style={{ left: `${layout.desk.x}%`, top: `${layout.desk.y}%`, "--move-x": `${dx * 10}px`, "--move-y": `${dy * 5.3}px` } as React.CSSProperties}
    onClick={() => onSelect(agent)} aria-label={`${agent.name}・${agent.room}の詳細を開く`}>
    <span className={s.speech}><Sparkles size={10} />{speech}</span>
    <span className={s.person} aria-hidden="true"><i className={s.hair} /><i className={s.head}><b /><b /><em /></i><i className={s.neck} /><i className={s.torso}><b>AI</b></i><i className={s.armA} /><i className={s.armB} /><i className={s.legA} /><i className={s.legB} /><i className={s.accessory} /></span>
    <span className={s.identity}><strong>{agent.name}</strong><small>{agent.status}</small></span>
    {motion.interactionText && <span className={s.interactionCard} role="status" aria-live="polite">{motion.interactionText}</span>}
    {motion.state === "completed" && <span className={s.complete} role="status" aria-live="polite"><Check size={10} />完了しました</span>}
  </button>;
}
