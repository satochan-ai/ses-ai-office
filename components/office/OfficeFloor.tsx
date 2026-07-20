import { BarChart3, BriefcaseBusiness, FileText, HeartHandshake, Mail, Network, Phone, Presentation, Sofa, Sparkles, UsersRound } from "lucide-react";
import { agentLayouts, officeZones } from "@/data/officeLayout";
import type { OfficeAgent } from "@/types/office";
import type { AgentMotion } from "@/types/movement";
import HumanAgent from "./HumanAgent";
import s from "./OfficeFloor.module.css";

function ZoneFurniture({ type }: { type: OfficeAgent["decoration"] }) {
  const Icon = type === "strategy" ? Presentation : type === "analytics" ? BarChart3 : type === "search" ? Phone : type === "network" ? Network : type === "matching" ? BriefcaseBusiness : type === "recruit" ? UsersRound : HeartHandshake;
  return <><span className={s.desk}><i className={s.screen}><Icon size={16} /></i><i className={s.keyboard} /></span>{type === "follow" ? <span className={s.sofa}><Sofa size={26} /></span> : <span className={s.chair} />}{type === "search" && <span className={s.sideDevice}><Mail size={13} /></span>}{type === "recruit" && <span className={s.sideDevice}><FileText size={13} /></span>}</>;
}

export default function OfficeFloor({ agents, motions, activeIds, matchingProgress, handoffLabel, onSelect }: { agents: OfficeAgent[]; motions: Record<string, AgentMotion>; activeIds: string[]; matchingProgress: number; handoffLabel?: string; onSelect: (agent: OfficeAgent) => void }) {
  return <section className={s.floor} aria-label="SES AI Office フロア">
    <div className={s.windows}><i /><i /><i /><i /></div><div className={s.centralAisle}><span>CENTRAL WALKWAY</span></div>
    {officeZones.map(zone => <section key={zone.id} className={`${s.zone} ${s[`zone_${zone.id}`]}`} style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }} aria-label={`${zone.label}エリア`}><header><strong>{zone.label}</strong><small>{zone.caption}</small></header><ZoneFurniture type={zone.id} /></section>)}
    <div className={s.handoff}><strong>情報受け渡し</strong><span>{handoffLabel ?? "READY"}</span><i /></div>
    <div className={s.meeting}><span /><span /><strong>MEETING</strong></div>
    <div className={s.plant}><i /><i /><b /></div><div className={`${s.plant} ${s.plantTwo}`}><i /><i /><b /></div>
    {matchingProgress > 0 && <div className={s.matchingProgress}><span>要員照合</span><strong>{matchingProgress}%</strong><i style={{ width: `${matchingProgress}%` }} /></div>}
    {agentLayouts.map(layout => { const agent = agents.find(item => item.id === layout.agentId); return agent ? <HumanAgent key={agent.id} agent={agent} layout={layout} motion={motions[agent.id]} active={activeIds.includes(agent.id)} onSelect={onSelect} /> : null; })}
    {handoffLabel && <div className={s.dataCourier} aria-hidden="true"><Sparkles size={11} /><span>{handoffLabel}</span></div>}
  </section>;
}
