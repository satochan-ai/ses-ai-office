"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, Bell, Bot, BriefcaseBusiness, Building2, Check, ChevronRight,
  ClipboardList, Clock3, FileUser, GitCompareArrows, HeartHandshake, Lightbulb, Mail,
  Map, MessageCircleMore, Network, Phone, Search, Send, Settings, Sparkles, Target,
  UserRoundSearch, UsersRound, X,
} from "lucide-react";
import { officeActions, officeAgents, officeAlerts, officeStatusBadges } from "@/data/office";
import type { OfficeAgent, OfficeAgentStatus } from "@/types/office";
import s from "./VisualOffice.module.css";

function OfficeNavigation() {
  return <Link className={s.dashboardLink} href="/dashboard"><BarChart3 size={16} />管理ダッシュボードを見る<ChevronRight size={15} /></Link>;
}

function OfficeHeader() {
  return <header className={s.header}><div className={s.brand}><div className={s.brandMark}><Sparkles size={20} /></div><div><strong>SES AI Office</strong><span>営業・採用・マッチングをAI社員と動かす</span></div></div><div className={s.headerMeta}><div className={s.date}><span>2026年7月16日 木曜日</span><b>18:30</b></div><span className={s.live}><i />AI社員 7名 稼働中</span><span className={s.checkCount}><AlertTriangle size={14} />要確認 7件</span><OfficeNavigation /><button className={s.iconButton} aria-label="通知"><Bell size={18} /></button><button className={s.iconButton} aria-label="設定"><Settings size={18} /></button><div className={s.user}><span>さ</span><b>さとちゃん</b></div></div></header>;
}

function AgentStatus({ status }: { status: OfficeAgentStatus }) {
  return <span className={`${s.agentStatus} ${s[`status_${status}`]}`}><i />{status}</span>;
}

const roleLabels: Record<OfficeAgent["decoration"], string> = {
  strategy: "営業統括", search: "新規開拓", network: "BP開拓", matching: "マッチング",
  recruit: "採用", follow: "フォロー", analytics: "分析",
};

function CharacterProps({ type }: { type: OfficeAgent["decoration"] }) {
  if (type === "strategy") return <><span className={`${s.characterProp} ${s.tabletProp}`}><Map size={13} /></span><i className={s.tie} /></>;
  if (type === "search") return <><span className={`${s.characterProp} ${s.phoneProp}`}><Phone size={12} /></span><i className={s.headset} /></>;
  if (type === "network") return <><span className={`${s.characterProp} ${s.cardProp}`}><b>AI</b></span><span className={`${s.characterProp} ${s.handshakeProp}`}><HeartHandshake size={13} /></span></>;
  if (type === "matching") return <><span className={`${s.characterProp} ${s.caseProp}`}><b>案件</b></span><span className={`${s.characterProp} ${s.talentProp}`}><b>要員</b></span></>;
  if (type === "recruit") return <><span className={`${s.characterProp} ${s.resumeProp}`}><FileUser size={13} /></span><span className={`${s.characterProp} ${s.memoProp}`}><b>面談</b></span></>;
  if (type === "follow") return <><span className={`${s.characterProp} ${s.chatProp}`}><MessageCircleMore size={13} /></span><span className={s.heartProp}>♡</span></>;
  return <><span className={`${s.characterProp} ${s.chartProp}`}><BarChart3 size={13} /></span><i className={s.glasses}><b /><b /></i></>;
}

function AIAgentAvatar({ agent, large = false }: { agent: OfficeAgent; large?: boolean }) {
  const Accessory = agent.decoration === "search" ? Phone : agent.decoration === "network" ? Network : agent.decoration === "matching" ? GitCompareArrows : agent.decoration === "recruit" ? FileUser : agent.decoration === "follow" ? MessageCircleMore : agent.decoration === "analytics" ? BarChart3 : Map;
  return <div className={`${s.robot} ${s[`accent_${agent.accent}`]} ${s[`persona_${agent.decoration}`]} ${large ? s.robotLarge : ""}`} aria-hidden="true"><div className={s.antenna}><i /></div><div className={s.robotHead}><div className={s.face}><span /><span /><b /></div></div><div className={s.robotBody}><i className={s.collar} /><b>{agent.shortName}</b><Accessory size={11} /></div><span className={s.armLeft} /><span className={s.armRight} /><span className={s.legLeft} /><span className={s.legRight} /><CharacterProps type={agent.decoration} /><span className={s.roleTag}>{roleLabels[agent.decoration]}</span></div>;
}

function AgentSpeechBubble({ text, focus }: { text: string; focus: boolean }) {
  return <div className={`${s.speech} ${focus ? s.speechFocus : ""}`}><Sparkles size={11} /><span>{text}</span></div>;
}

function AnimatedMonitor({ type }: { type: OfficeAgent["decoration"] }) {
  const content = type === "analytics" ? <><i className={s.barOne} /><i className={s.barTwo} /><i className={s.barThree} /></> : type === "matching" ? <><span className={s.matchCard} /><GitCompareArrows size={18} /><span className={s.matchCard} /></> : type === "network" ? <Network size={27} /> : type === "search" ? <Search size={24} /> : type === "recruit" ? <UserRoundSearch size={25} /> : type === "follow" ? <HeartHandshake size={25} /> : <Target size={25} />;
  return <div className={s.monitor}><div>{content}</div><span /></div>;
}

function RoomDecoration({ type }: { type: OfficeAgent["decoration"] }) {
  const Icon = type === "search" ? Mail : type === "network" ? UsersRound : type === "matching" ? BriefcaseBusiness : type === "recruit" ? UserRoundSearch : type === "follow" ? HeartHandshake : type === "analytics" ? BarChart3 : Lightbulb;
  return <><div className={s.window}><span /><span /><i /></div><div className={s.wallArt}><Icon size={16} /></div><WorkWall type={type} /><div className={s.plant}><i /><i /><b /></div><div className={s.shelf}><span /><span /><span /><span /></div>{type === "follow" && <div className={s.sofa}><i /><i /></div>}<div className={s.rug} /></>;
}

function WorkWall({ type }: { type: OfficeAgent["decoration"] }) {
  if (type === "strategy") return <div className={`${s.workWall} ${s.strategyWall}`}><div className={s.mapBoard}><i /><i /><i /><i /><span /><span /></div><div className={s.priorityBoard}><b>01</b><b>02</b><b>03</b></div></div>;
  if (type === "analytics") return <div className={`${s.workWall} ${s.analyticsWall}`}><div className={s.bigChart}><i /><i /><i /><i /></div><div className={s.donut}><span /></div></div>;
  if (type === "search") return <div className={`${s.workWall} ${s.searchWall}`}><div className={s.leadList}><i /><i /><i /></div><Mail size={13} /><Phone size={12} /></div>;
  if (type === "network") return <div className={`${s.workWall} ${s.networkWall}`}><i /><i /><i /><i /><span /><span /><span /></div>;
  if (type === "matching") return <div className={`${s.workWall} ${s.matchingWall}`}><div><b>案件</b><i /><i /></div><span /><div><b>要員</b><i /><i /></div></div>;
  if (type === "recruit") return <div className={`${s.workWall} ${s.recruitWall}`}><span><i /></span><span><i /></span><span><i /></span><FileUser size={13} /></div>;
  return <div className={`${s.workWall} ${s.followWall}`}><ClipboardList size={14} /><div><i /><i /><i /></div><b>更新</b></div>;
}

function DeskSetup({ type }: { type: OfficeAgent["decoration"] }) {
  return <div className={s.desk}><div className={s.monitorCluster}><AnimatedMonitor type={type} />{(type === "analytics" || type === "strategy") && <AnimatedMonitor type={type} />}</div><span className={s.deskLamp}><i /></span><span className={s.keyboard} /><span className={s.mug} /></div>;
}

function OfficeRoom({ agent, onSelect }: { agent: OfficeAgent; onSelect: (agent: OfficeAgent) => void }) {
  const speechFocus = agent.status === "要対応" || agent.status === "分析中";
  return <button className={`${s.room} ${s[`room_${agent.accent}`]} ${agent.id === "manager" ? s.managerRoom : ""}`} onClick={() => onSelect(agent)} aria-label={`${agent.room}・${agent.name}の詳細を開く`}><div className={s.roomHeader}><div><span className={s.roomNumber}>{agent.floor === "upper" ? "2F" : "1F"}</span><strong>{agent.room}</strong></div><AgentStatus status={agent.status} /></div><AgentSpeechBubble text={agent.speech} focus={speechFocus} /><div className={s.roomScene}><RoomDecoration type={agent.decoration} /><DeskSetup type={agent.decoration} /><div className={s.avatarSpot}><span className={s.chair} /><AIAgentAvatar agent={agent} /><span className={s.agentName}>{agent.name}</span></div></div><div className={s.roomFooter}><strong>{agent.currentTask}</strong><div><span>{agent.metrics[0]}</span></div></div><span className={s.roomOpen}>詳細を見る <ChevronRight size={12} /></span></button>;
}

function OfficeFloor({ floor, agents, onSelect }: { floor: "upper" | "lower"; agents: OfficeAgent[]; onSelect: (agent: OfficeAgent) => void }) {
  return <section className={`${s.floor} ${floor === "upper" ? s.upperFloor : s.lowerFloor}`} aria-label={floor === "upper" ? "2階" : "1階"}><div className={s.floorLabel}>{floor === "upper" ? "2F  STRATEGY" : "1F  OPERATIONS"}</div><div className={s.floorRooms}>{agents.map(agent => <OfficeRoom key={agent.id} agent={agent} onSelect={onSelect} />)}</div></section>;
}

function OfficeBuilding({ speeches, onSelect }: { speeches: Record<string, string>; onSelect: (agent: OfficeAgent) => void }) {
  const hydratedAgents = officeAgents.map(agent => ({ ...agent, speech: speeches[agent.id] ?? agent.speech }));
  return <div className={s.buildingWrap}><div className={s.roof}><span>SES AI OFFICE</span><div className={s.roofLight} /></div><div className={s.building}><OfficeFloor floor="upper" agents={hydratedAgents.filter(a => a.floor === "upper")} onSelect={onSelect} /><OfficeFloor floor="lower" agents={hydratedAgents.filter(a => a.floor === "lower")} onSelect={onSelect} /></div><div className={s.foundation}><span /><span /><span /></div></div>;
}

function PriorityActions() {
  return <section className={s.priority}><header><Target size={16} /><div><strong>本日の最優先アクション</strong><span>AI営業Mgrからの提案</span></div></header><ol>{officeActions.map(action => <li key={action.id}><b>{action.id}</b><div><strong>{action.title}</strong><span>{action.owner}</span></div></li>)}</ol><Link href="/dashboard">優先タスクを詳しく見る <ChevronRight size={13} /></Link></section>;
}

function AlertPanel() {
  return <section className={s.alertPanel}><header><AlertTriangle size={16} /><div><strong>要確認アラート</strong><span>対応漏れを防止</span></div></header><div>{officeAlerts.map(alert => <p key={alert.label} className={alert.severity === "critical" ? s.critical : ""}><span>{alert.label}</span><b>{alert.value}</b></p>)}</div><Link href="/dashboard">すべて確認する <ChevronRight size={13} /></Link></section>;
}

function AgentDetailPanel({ agent, speech, history, onClose, onRun }: { agent: OfficeAgent; speech: string; history: string[]; onClose: () => void; onRun: (command: string) => void }) {
  const [command, setCommand] = useState(""); const [running, setRunning] = useState(false);
  useEffect(() => { const close = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [onClose]);
  const run = () => { if (!command.trim() || running) return; setRunning(true); onRun(command.trim()); window.setTimeout(() => { setRunning(false); setCommand(""); }, 1800); };
  return <div className={s.panelBackdrop} onMouseDown={e => e.target === e.currentTarget && onClose()}><aside className={s.detailPanel} role="dialog" aria-modal="true" aria-labelledby="office-agent-title"><button className={s.closeButton} onClick={onClose} aria-label="詳細パネルを閉じる"><X size={20} /></button><div className={s.detailHero}><AIAgentAvatar agent={agent} large /><div><AgentStatus status={running ? "分析中" : agent.status} /><h2 id="office-agent-title">{agent.name}</h2><p>{agent.room}</p></div></div><div className={s.detailSpeech}><Sparkles size={15} /><p>{speech}</p></div><div className={s.detailTask}><span>現在の作業</span><strong>{running ? "新しい指示を実行中…" : agent.currentTask}</strong><div><span>進捗</span><b>{agent.progress}%</b></div><div className={s.detailProgress}><i style={{ width: `${agent.progress}%` }} /></div></div><div className={s.detailStats}><div><span>本日の成果</span><strong>{agent.result}</strong></div><div><span>未処理</span><strong>{agent.pending}件</strong></div></div><section className={s.detailSection}><h3>役割</h3><p>{agent.role}</p><ul>{agent.duties.map(duty => <li key={duty}><Check size={13} />{duty}</li>)}</ul></section><section className={s.detailSection}><h3>最近の実行履歴</h3><div className={s.history}>{history.slice(0, 3).map((item, i) => <p key={`${item}-${i}`}><time>{i === 0 ? "18:30" : i === 1 ? "18:12" : "17:45"}</time><span>{item}</span></p>)}</div></section><div className={s.instruction}><label htmlFor="agent-command">{agent.name}への指示</label><textarea id="agent-command" value={command} onChange={e => setCommand(e.target.value)} placeholder="例：A社へのフォローメール案を作成して" /><button onClick={run} disabled={!command.trim() || running}>{running ? <><span className={s.spinner} />実行中...</> : <><Send size={15} />指示を実行</>}</button></div><Link className={s.detailLink} href="/dashboard">詳細管理画面を見る <ChevronRight size={14} /></Link></aside></div>;
}

function Toast({ message }: { message: string }) {
  return <div className={s.toast} role="status"><Check size={16} />{message}</div>;
}

export default function VisualOffice() {
  const [selected, setSelected] = useState<OfficeAgent | null>(null); const [speeches, setSpeeches] = useState<Record<string, string>>({}); const [histories, setHistories] = useState<Record<string, string[]>>({}); const [toast, setToast] = useState("");
  const selectedSpeech = selected ? speeches[selected.id] ?? selected.speech : ""; const selectedHistory = useMemo(() => selected ? histories[selected.id] ?? selected.history : [], [histories, selected]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3000); return () => window.clearTimeout(timer); }, [toast]);
  const runInstruction = (command: string) => { if (!selected) return; const id = selected.id; setSpeeches(prev => ({ ...prev, [id]: "新しい指示を実行しています…" })); setHistories(prev => ({ ...prev, [id]: [`指示を受付：${command}`, ...(prev[id] ?? selected.history)] })); setToast(`${selected.name}が指示を受け付けました`); window.setTimeout(() => { setSpeeches(prev => ({ ...prev, [id]: `${command.slice(0, 18)}${command.length > 18 ? "…" : ""}を完了しました` })); setToast(`${selected.name}の処理が完了しました`); }, 1800); };
  return <div className={s.officePage}><OfficeHeader /><main className={s.officeMain}><div className={s.statusStrip}>{officeStatusBadges.map((badge, i) => <span key={badge}><i className={s[`stripDot${i}`]} />{badge}</span>)}</div><div className={s.officeIntro}><div><span className={s.eyebrow}><Building2 size={13} />LIVE OFFICE VIEW</span><h1>AI社員が、今日の営業を動かしています</h1><p>部屋を選ぶと、現在の仕事と成果を確認して直接指示できます。</p></div><span className={s.updated}><Clock3 size={13} />18:30 更新</span></div><div className={s.officeStage}><PriorityActions /><OfficeBuilding speeches={speeches} onSelect={setSelected} /><AlertPanel /></div><div className={s.mobileHint}><Bot size={14} />部屋カードをタップしてAI社員に指示できます</div></main>{selected && <AgentDetailPanel agent={selected} speech={selectedSpeech} history={selectedHistory} onClose={() => setSelected(null)} onRun={runInstruction} />}{toast && <Toast message={toast} />}</div>;
}
