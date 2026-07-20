"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowUpDown, BarChart3, Bell, BookOpen, Building2, Check, ChevronRight, Clock3, Send, Settings, Sparkles, Target, UserRound, UsersRound, X } from "lucide-react";
import { officeActions, officeAgents, officeAlerts, officeStatusBadges } from "@/data/office";
import { collaborationRoutesByAgent } from "@/data/officeRoutes";
import type { OfficeAgent, OfficeAgentStatus } from "@/types/office";
import { useOfficeDemo } from "@/hooks/useOfficeDemo";
import { useAgentAnimation } from "@/hooks/useAgentAnimation";
import { useRouteMovement } from "@/hooks/useRouteMovement";
import type { ManualRoute } from "@/hooks/useRouteMovement";
import { animationForAgent } from "@/types/animation";
import { DemoControls, DemoResult, DemoStart } from "./OfficeDemo";
import FirstVisitGuide from "./FirstVisitGuide";
import OfficeFloor from "./office/OfficeFloor";
import s from "./VisualOffice.module.css";

const ONBOARDING_STORAGE_KEY = "ses-ai-office-onboarding-seen";
const floorNames = { "1f": "1F 営業・人材", "2f": "2F 顧客・管理" } as const;

function AgentStatus({ status }: { status: OfficeAgentStatus }) {
  return <span className={`${s.agentStatus} ${s[`status_${status}`]}`}><i />{status}</span>;
}

function OfficeHeader({ onGuide }: { onGuide: () => void }) {
  return <header className={s.header}><div className={s.brand}><div className={s.brandMark}><Sparkles size={20} /></div><div><strong>SES AI Office</strong><span>人と情報が動く、2階建てAIオフィス</span></div></div><div className={s.headerMeta}><span className={s.live}><i />AI社員 11名 稼働中</span><span className={s.checkCount}><Clock3 size={14} />本日 128処理</span><Link className={s.dashboardLink} href="/dashboard"><BarChart3 size={16} />管理Dashboard<ChevronRight size={15} /></Link><button className={s.guideButton} onClick={onGuide} aria-label="初回操作ガイドを開く"><BookOpen size={15} /><span>ガイド</span></button><button className={s.iconButton} aria-label="通知"><Bell size={18} /></button><button className={s.iconButton} aria-label="設定"><Settings size={18} /></button></div></header>;
}

function ActivityRail() {
  return <aside className={s.activityRail} aria-label="本日の業務サマリー"><section><header><Target size={15} /><div><strong>優先アクション</strong><span>AI営業Mgrの判断</span></div></header><ol>{officeActions.map(action => <li key={action.id}><b>{action.id}</b><span>{action.title}<small>{action.owner}</small></span></li>)}</ol></section><section><header><AlertTriangle size={15} /><div><strong>要確認</strong><span>対応漏れを防止</span></div></header>{officeAlerts.slice(0, 3).map(alert => <p key={alert.label}><span>{alert.label}</span><b>{alert.value}</b></p>)}</section><Link href="/dashboard">すべての業務を見る <ChevronRight size={13} /></Link></aside>;
}

function FloorSwitch({ activeFloor, onChange }: { activeFloor: "1f" | "2f"; onChange: (floor: "1f" | "2f") => void }) {
  return <div className={s.floorSwitchWrap}><div className={s.floorSwitch} role="tablist" aria-label="オフィスフロア切替">{(["1f", "2f"] as const).map(floor => <button key={floor} role="tab" aria-selected={activeFloor === floor} className={activeFloor === floor ? s.floorTabActive : ""} onClick={() => onChange(floor)}><Building2 size={14} /><span>{floorNames[floor]}</span><small>{floor === "1f" ? "7名" : "4名"}</small></button>)}</div><span className={s.elevatorHint}><ArrowUpDown size={13} />エレベーターでフロア連携</span></div>;
}

function AgentDirectory({ agents, activeFloor, onSelect }: { agents: OfficeAgent[]; activeFloor: "1f" | "2f"; onSelect: (agent: OfficeAgent) => void }) {
  return <details className={s.agentDirectory} open><summary><UsersRound size={14} /><span>AI社員一覧</span><b>11名</b></summary><div>{agents.map(agent => <button key={agent.id} className={agent.floorId === activeFloor ? s.directoryCurrentFloor : ""} onClick={() => onSelect(agent)}><i className={s[`directory_${agent.accent}`]} /><span><strong>{agent.name}</strong><small>{agent.floorLabel}・{agent.status}</small><em>{agent.currentTask}</em></span><ChevronRight size={12} /></button>)}</div></details>;
}

function AgentDetailPanel({ agent, speech, history, collaborationOptions, onClose, onRun, onCollaborate }: { agent: OfficeAgent; speech: string; history: string[]; collaborationOptions: { label: string; routeId: string }[]; onClose: () => void; onRun: (command: string) => void; onCollaborate: (routeId: string) => void }) {
  const [command, setCommand] = useState(""); const [running, setRunning] = useState(false); const runTimer = useRef<number | null>(null);
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && onClose(); document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [onClose]);
  useEffect(() => () => { if (runTimer.current !== null) window.clearTimeout(runTimer.current); }, []);
  const run = () => { if (!command.trim() || running) return; setRunning(true); onRun(command.trim()); runTimer.current = window.setTimeout(() => { setRunning(false); setCommand(""); runTimer.current = null; }, 1800); };
  return <div className={s.panelBackdrop} onMouseDown={event => event.target === event.currentTarget && onClose()}><aside className={s.detailPanel} role="dialog" aria-modal="true" aria-labelledby="office-agent-title"><button className={s.closeButton} onClick={onClose} aria-label="詳細パネルを閉じる"><X size={20} /></button><div className={s.detailHero}><div className={`${s.humanDetailAvatar} ${s[`detail_${agent.decoration}`]}`}><UserRound size={28} /><b>AI</b></div><div><AgentStatus status={running ? "分析中" : agent.status} /><h2 id="office-agent-title">{agent.name}</h2><p>{agent.room}・{agent.floorLabel}</p></div></div><div className={s.detailSpeech}><Sparkles size={15} /><p>{speech}</p></div><div className={s.detailTask}><span>現在の作業</span><strong>{running ? "新しい指示を実行中…" : agent.currentTask}</strong><div><span>進捗</span><b>{agent.progress}%</b></div><div className={s.detailProgress}><i style={{ width: `${agent.progress}%` }} /></div></div><div className={s.detailStats}><div><span>本日の成果</span><strong>{agent.result}</strong></div><div><span>未処理</span><strong>{agent.pending}件</strong></div></div><section className={s.detailSection}><h3>役割</h3><p>{agent.role}</p><ul>{agent.duties.map(duty => <li key={duty}><Check size={13} />{duty}</li>)}</ul></section><section className={s.detailSection}><h3>最近の実行履歴</h3><div className={s.history}>{history.slice(0, 3).map((item, index) => <p key={`${item}-${index}`}><time>{index === 0 ? "18:30" : index === 1 ? "18:12" : "17:45"}</time><span>{item}</span></p>)}</div></section>{collaborationOptions.length > 0 && <section className={s.collaborationActions}><h3>フロア連携</h3>{collaborationOptions.map(option => <button key={option.routeId} onClick={() => onCollaborate(option.routeId)}><ArrowUpDown size={14} />{option.label}</button>)}</section>}<div className={s.instruction}><label htmlFor="agent-command">{agent.name}への指示</label><textarea id="agent-command" value={command} onChange={event => setCommand(event.target.value)} placeholder="例：確認対象を整理して" /><button onClick={run} disabled={!command.trim() || running}>{running ? <><span className={s.spinner} />実行中...</> : <><Send size={15} />指示を実行</>}</button></div><Link className={s.detailLink} href="/dashboard">詳細管理画面を見る <ChevronRight size={14} /></Link></aside></div>;
}

function Toast({ message }: { message: string }) { return <div className={s.toast} role="status"><Check size={16} />{message}</div>; }

export default function VisualOffice() {
  const [selected, setSelected] = useState<OfficeAgent | null>(null); const [activeFloor, setActiveFloor] = useState<"1f" | "2f">("1f"); const [manualRoute, setManualRoute] = useState<ManualRoute>(null); const [floorAnnouncement, setFloorAnnouncement] = useState("");
  const [speeches, setSpeeches] = useState<Record<string, string>>({}); const [histories, setHistories] = useState<Record<string, string[]>>({}); const [toast, setToast] = useState(""); const [guideOpen, setGuideOpen] = useState(false); const instructionTimer = useRef<number | null>(null); const manualRouteTimer = useRef<number | null>(null); const lastTrackedFloor = useRef<"1f" | "2f" | null>(null);
  const demo = useOfficeDemo(); const agentAnimation = useAgentAnimation(); const motions = useRouteMovement(demo.step, demo.status, demo.speed, agentAnimation.states, manualRoute);
  const selectedSpeech = selected ? speeches[selected.id] ?? selected.speech : ""; const selectedHistory = useMemo(() => selected ? histories[selected.id] ?? selected.history : [], [histories, selected]);
  const visibleAgents = officeAgents.map(agent => { const instruction = agentAnimation.states[agent.id]; return { ...agent, status: demo.step?.statuses[agent.id] ?? (instruction === "completed" ? "完了" : instruction ? "分析中" : agent.status), speech: demo.step?.speeches[agent.id] ?? speeches[agent.id] ?? agent.speech, currentTask: demo.step?.agentIds.includes(agent.id) ? demo.step.process : agent.currentTask, progress: agent.id === "matching" && demo.step?.id === 3 ? demo.matchingProgress : agent.progress }; });
  const demoBadges = demo.step ? [`${demo.scenario.title}`, `Step ${demo.step.id} / ${demo.scenario.steps.length}`, demo.step.activeFloor === "1f" ? "1Fで処理中" : "2Fで処理中", demo.step.handoffCard ?? "AI連携中", demo.status === "paused" ? "一時停止" : "LIVE"] : officeStatusBadges;
  const trackedAgentId = manualRoute?.agentId ?? Object.keys(agentAnimation.states)[0] ?? demo.step?.agentIds[0];

  useEffect(() => { if (demo.status !== "idle") return; setActiveFloor(demo.scenario.startFloor); lastTrackedFloor.current = null; }, [demo.scenario.startFloor, demo.status]);
  useEffect(() => { const motion = trackedAgentId ? motions[trackedAgentId] : undefined; if (!motion) { lastTrackedFloor.current = null; return; } const agent = officeAgents.find(item => item.id === trackedAgentId); if (motion.inElevator) setFloorAnnouncement(`${agent?.name ?? "AI社員"}がエレベーターで移動中です`); if (lastTrackedFloor.current !== motion.floorId) { setActiveFloor(motion.floorId); if (lastTrackedFloor.current) setFloorAnnouncement(`${agent?.name ?? "AI社員"}が${floorNames[motion.floorId]}へ到着しました`); lastTrackedFloor.current = motion.floorId; } }, [motions, trackedAgentId]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3000); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { if (localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "seen") setGuideOpen(true); }, []);
  const closeGuide = useCallback(() => { localStorage.setItem(ONBOARDING_STORAGE_KEY, "seen"); setGuideOpen(false); }, []);
  useEffect(() => () => { if (instructionTimer.current !== null) window.clearTimeout(instructionTimer.current); if (manualRouteTimer.current !== null) window.clearTimeout(manualRouteTimer.current); }, []);

  const selectAgent = (agent: OfficeAgent) => { setActiveFloor(agent.floorId); setSelected(agent); };
  const runInstruction = (command: string) => { if (!selected) return; const id = selected.id; if (instructionTimer.current !== null) window.clearTimeout(instructionTimer.current); agentAnimation.run(id, animationForAgent(selected, undefined, true)); setSpeeches(previous => ({ ...previous, [id]: "新しい指示を実行しています…" })); setHistories(previous => ({ ...previous, [id]: [`指示を受付：${command}`, ...(previous[id] ?? selected.history)] })); setToast(`${selected.name}が指示を受け付けました`); instructionTimer.current = window.setTimeout(() => { setSpeeches(previous => ({ ...previous, [id]: `${command.slice(0, 18)}${command.length > 18 ? "…" : ""}を完了しました` })); setToast(`${selected.name}の処理が完了しました`); instructionTimer.current = null; }, 1800); };
  const runCollaboration = (agent: OfficeAgent, routeId: string) => { if (demo.status !== "idle") { setToast("デモ停止後にフロア連携を実行できます"); return; } if (manualRouteTimer.current !== null) window.clearTimeout(manualRouteTimer.current); setSelected(null); setManualRoute({ agentId: agent.id, routeId }); setToast(`${agent.name}が2階担当へ確認に向かいます`); manualRouteTimer.current = window.setTimeout(() => { setManualRoute(null); setToast(`${agent.name}が確認を終えて帰席しました`); manualRouteTimer.current = null; }, demo.speed === "fast" ? 1800 : 5600); };
  const startDemo = () => { setSelected(null); setManualRoute(null); setActiveFloor(demo.scenario.startFloor); lastTrackedFloor.current = null; demo.begin(); };
  const stopDemo = () => { setManualRoute(null); setActiveFloor(demo.scenario.startFloor); lastTrackedFloor.current = null; setFloorAnnouncement("デモを停止し、開始フロアへ戻りました"); demo.stop(); };
  const selectScenario = (id: Parameters<typeof demo.setScenarioId>[0]) => { demo.setScenarioId(id); const scenario = demo.scenarios.find(item => item.id === id); if (scenario) setActiveFloor(scenario.startFloor); };

  return <div className={`${s.officePage} ${demo.step ? s.demoRunning : ""}`}><OfficeHeader onGuide={() => setGuideOpen(true)} /><main className={s.officeMain}><div className={s.statusStrip}>{demoBadges.map((badge, index) => <span key={`${badge}-${index}`}><i className={s[`stripDot${index}`]} />{badge}</span>)}</div><div className={s.officeIntro}><div><span className={s.eyebrow}><Building2 size={13} />TWO-FLOOR LIVE WORKSPACE</span><h1>11名のAI社員が、2つのフロアで連携しています</h1><p>営業・人材運用から顧客深耕、契約、教育までを一つのAIオフィスで確認できます。</p></div>{demo.status === "idle" ? <DemoStart scenarios={demo.scenarios} scenario={demo.scenario} onScenario={selectScenario} onStart={startDemo} speed={demo.speed} onSpeed={demo.setSpeed} /> : <span className={s.updated}><Clock3 size={13} />デモ実行中</span>}</div><FloorSwitch activeFloor={activeFloor} onChange={setActiveFloor} /><div className={s.unifiedWorkspace}><OfficeFloor floorId={activeFloor} agents={visibleAgents} motions={motions} activeIds={demo.step?.agentIds ?? []} matchingProgress={demo.stepProgress} handoffLabel={demo.step?.handoffCard} onSelect={selectAgent} /><div className={s.workspaceRail}><ActivityRail /><AgentDirectory agents={visibleAgents} activeFloor={activeFloor} onSelect={selectAgent} /></div></div><div className={s.mobileHint}><Sparkles size={14} />フロアを切り替え、AI社員をタップすると仕事と成果を確認できます</div></main><div className={s.srOnly} aria-live="polite">{floorAnnouncement}</div>{selected && <AgentDetailPanel agent={selected} speech={demo.step?.speeches[selected.id] ?? selectedSpeech} history={selectedHistory} collaborationOptions={collaborationRoutesByAgent[selected.id] ?? []} onClose={() => setSelected(null)} onRun={runInstruction} onCollaborate={routeId => runCollaboration(selected, routeId)} />}{demo.step && demo.status !== "idle" && <DemoControls scenario={demo.scenario} status={demo.status} step={demo.step} progress={demo.progress} stepProgress={demo.stepProgress} onPause={demo.pause} onResume={demo.resume} onStop={stopDemo} onRestart={startDemo} />}{demo.resultOpen && <DemoResult scenario={demo.scenario} logs={demo.logs} onClose={() => demo.setResultOpen(false)} onRestart={startDemo} onSelectAnother={stopDemo} />}{guideOpen && <FirstVisitGuide open={guideOpen} onClose={closeGuide} />}{toast && <Toast message={toast} />}</div>;
}
