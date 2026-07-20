import { BarChart3, BookOpen, BriefcaseBusiness, FileCheck2, FileText, Handshake, HeartHandshake, Mail, Network, Phone, Presentation, ReceiptText, Sofa, Sparkles, UsersRound } from "lucide-react";
import { agentLayouts, officeZones } from "@/data/officeLayout";
import type { OfficeAgent } from "@/types/office";
import type { RoutedAgentMotion } from "@/types/route";
import HumanAgent from "./HumanAgent";
import OfficePath from "./OfficePath";
import s from "./OfficeFloor.module.css";

function ZoneFurniture({ type }: { type: OfficeAgent["decoration"] }) {
  const Icon = type === "strategy" ? Presentation : type === "analytics" ? BarChart3 : type === "search" ? Phone : type === "network" ? Network : type === "matching" ? BriefcaseBusiness : type === "recruit" ? UsersRound : type === "relation" ? Handshake : type === "proposal" ? FileCheck2 : type === "contract" ? ReceiptText : type === "knowledge" ? BookOpen : HeartHandshake;
  return <><span className={s.desk}><i className={s.screen}><Icon size={16} /></i><i className={s.keyboard} /></span>{type === "follow" ? <span className={s.sofa}><Sofa size={26} /></span> : <span className={s.chair} />}{type === "search" && <span className={s.sideDevice}><Mail size={13} /></span>}{(type === "recruit" || type === "contract") && <span className={s.sideDevice}><FileText size={13} /></span>}{type === "knowledge" && <span className={s.knowledgeShelf}><BookOpen size={14} /><i /><i /></span>}</>;
}

export default function OfficeFloor({ floorId, agents, motions, activeIds, matchingProgress, handoffLabel, onSelect }: { floorId: "1f" | "2f"; agents: OfficeAgent[]; motions: Record<string, RoutedAgentMotion>; activeIds: string[]; matchingProgress: number; handoffLabel?: string; onSelect: (agent: OfficeAgent) => void }) {
  const visitedIds = new Set(Object.values(motions).map(motion => motion.interactionTarget).filter(Boolean));
  const elevatorActive = Object.entries(motions).some(([agentId, motion]) => activeIds.includes(agentId) && motion.floorId === floorId && motion.inElevator);
  return <section className={`${s.floor} ${floorId === "2f" ? s.floorSecond : ""}`} aria-label={`SES AI Office ${floorId === "1f" ? "1階" : "2階"}フロア`}>
    <div className={s.windows}><i /><i /><i /><i /></div><OfficePath floorId={floorId} elevatorActive={elevatorActive} />
    {officeZones.filter(zone => zone.floorId === floorId).map(zone => <section key={zone.id} className={`${s.zone} ${s[`zone_${zone.id}`]}`} style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }} aria-label={`${zone.label}エリア`}><header><strong>{zone.label}</strong><small>{zone.caption}</small></header><ZoneFurniture type={zone.id} /></section>)}
    <div className={s.handoff}><strong>{floorId === "1f" ? "情報受け渡し" : "資料確認"}</strong><span>{handoffLabel ?? "READY"}</span><i /></div>
    <div className={s.meeting}><span /><span /><strong>{floorId === "1f" ? "MEETING" : "SMALL MEETING"}</strong></div>
    <div className={s.plant}><i /><i /><b /></div><div className={`${s.plant} ${s.plantTwo}`}><i /><i /><b /></div>
    {floorId === "1f" && matchingProgress > 0 && <div className={s.matchingProgress}><span>要員照合</span><strong>{matchingProgress}%</strong><i style={{ width: `${matchingProgress}%` }} /></div>}
    {agentLayouts.map(layout => { const agent = agents.find(item => item.id === layout.agentId); const motion = motions[layout.agentId]; return agent && motion?.floorId === floorId ? <HumanAgent key={agent.id} agent={agent} layout={layout} motion={motion} active={activeIds.includes(agent.id)} beingVisited={visitedIds.has(agent.id)} onSelect={onSelect} /> : null; })}
    {floorId === "1f" && handoffLabel && <div className={s.dataCourier} aria-hidden="true"><Sparkles size={11} /><span>{handoffLabel}</span></div>}
  </section>;
}
