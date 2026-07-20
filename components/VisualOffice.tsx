"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BarChart3, Bell, BookOpen, Building2, Check, ChevronRight, Clock3, Send, Settings, Sparkles, Target, UserRound, X } from "lucide-react";
import { officeActions, officeAgents, officeAlerts, officeStatusBadges } from "@/data/office";
import type { OfficeAgent, OfficeAgentStatus } from "@/types/office";
import { useOfficeDemo } from "@/hooks/useOfficeDemo";
import { useAgentAnimation } from "@/hooks/useAgentAnimation";
import { useAgentMovement } from "@/hooks/useAgentMovement";
import { animationForAgent } from "@/types/animation";
import { DemoControls, DemoResult, DemoStart } from "./OfficeDemo";
import FirstVisitGuide from "./FirstVisitGuide";
import OfficeFloor from "./office/OfficeFloor";
import s from "./VisualOffice.module.css";

const ONBOARDING_STORAGE_KEY = "ses-ai-office-onboarding-seen";
const handoffLabels: Record<number, string> = { 2: "案件データ", 3: "分析結果", 4: "候補者一覧", 5: "候補者3名", 6: "優先順位", 7: "提案準備完了" };

function AgentStatus({ status }: { status: OfficeAgentStatus }) {
  return <span className={`${s.agentStatus} ${s[`status_${status}`]}`}><i />{status}</span>;
}

function OfficeHeader({ onGuide }: { onGuide: () => void }) {
  return <header className={s.header}><div className={s.brand}><div className={s.brandMark}><Sparkles size={20} /></div><div><strong>SES AI Office</strong><span>人と情報が動く、AI営業オフィス</span></div></div><div className={s.headerMeta}><span className={s.live}><i />AI社員 7名 稼働中</span><span className={s.checkCount}><Clock3 size={14} />本日 128処理</span><Link className={s.dashboardLink} href="/dashboard"><BarChart3 size={16} />管理Dashboard<ChevronRight size={15} /></Link><button className={s.guideButton} onClick={onGuide} aria-label="初回操作ガイドを開く"><BookOpen size={15} /><span>ガイド</span></button><button className={s.iconButton} aria-label="通知"><Bell size={18} /></button><button className={s.iconButton} aria-label="設定"><Settings size={18} /></button></div></header>;
}

function ActivityRail() {
  return <aside className={s.activityRail} aria-label="本日の業務サマリー"><section><header><Target size={15} /><div><strong>優先アクション</strong><span>AI営業Mgrの判断</span></div></header><ol>{officeActions.map(action => <li key={action.id}><b>{action.id}</b><span>{action.title}<small>{action.owner}</small></span></li>)}</ol></section><section><header><AlertTriangle size={15} /><div><strong>要確認</strong><span>対応漏れを防止</span></div></header>{officeAlerts.slice(0, 3).map(alert => <p key={alert.label}><span>{alert.label}</span><b>{alert.value}</b></p>)}</section><Link href="/dashboard">すべての業務を見る <ChevronRight size={13} /></Link></aside>;
}

function AgentDetailPanel({ agent, speech, history, onClose, onRun }: { agent: OfficeAgent; speech: string; history: string[]; onClose: () => void; onRun: (command: string) => void }) {
  const [command, setCommand] = useState(""); const [running, setRunning] = useState(false); const runTimer = useRef<number | null>(null);
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && onClose(); document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [onClose]);
  useEffect(() => () => { if (runTimer.current !== null) window.clearTimeout(runTimer.current); }, []);
  const run = () => { if (!command.trim() || running) return; setRunning(true); onRun(command.trim()); runTimer.current = window.setTimeout(() => { setRunning(false); setCommand(""); runTimer.current = null; }, 1800); };
  return <div className={s.panelBackdrop} onMouseDown={event => event.target === event.currentTarget && onClose()}><aside className={s.detailPanel} role="dialog" aria-modal="true" aria-labelledby="office-agent-title"><button className={s.closeButton} onClick={onClose} aria-label="詳細パネルを閉じる"><X size={20} /></button><div className={s.detailHero}><div className={`${s.humanDetailAvatar} ${s[`detail_${agent.decoration}`]}`}><UserRound size={28} /><b>AI</b></div><div><AgentStatus status={running ? "分析中" : agent.status} /><h2 id="office-agent-title">{agent.name}</h2><p>{agent.room}</p></div></div><div className={s.detailSpeech}><Sparkles size={15} /><p>{speech}</p></div><div className={s.detailTask}><span>現在の作業</span><strong>{running ? "新しい指示を実行中…" : agent.currentTask}</strong><div><span>進捗</span><b>{agent.progress}%</b></div><div className={s.detailProgress}><i style={{ width: `${agent.progress}%` }} /></div></div><div className={s.detailStats}><div><span>本日の成果</span><strong>{agent.result}</strong></div><div><span>未処理</span><strong>{agent.pending}件</strong></div></div><section className={s.detailSection}><h3>役割</h3><p>{agent.role}</p><ul>{agent.duties.map(duty => <li key={duty}><Check size={13} />{duty}</li>)}</ul></section><section className={s.detailSection}><h3>最近の実行履歴</h3><div className={s.history}>{history.slice(0, 3).map((item, index) => <p key={`${item}-${index}`}><time>{index === 0 ? "18:30" : index === 1 ? "18:12" : "17:45"}</time><span>{item}</span></p>)}</div></section><div className={s.instruction}><label htmlFor="agent-command">{agent.name}への指示</label><textarea id="agent-command" value={command} onChange={event => setCommand(event.target.value)} placeholder="例：A社へのフォローメール案を作成して" /><button onClick={run} disabled={!command.trim() || running}>{running ? <><span className={s.spinner} />実行中...</> : <><Send size={15} />指示を実行</>}</button></div><Link className={s.detailLink} href="/dashboard">詳細管理画面を見る <ChevronRight size={14} /></Link></aside></div>;
}

function Toast({ message }: { message: string }) { return <div className={s.toast} role="status"><Check size={16} />{message}</div>; }

export default function VisualOffice() {
  const [selected, setSelected] = useState<OfficeAgent | null>(null); const [speeches, setSpeeches] = useState<Record<string, string>>({}); const [histories, setHistories] = useState<Record<string, string[]>>({}); const [toast, setToast] = useState(""); const [guideOpen, setGuideOpen] = useState(false); const instructionTimer = useRef<number | null>(null);
  const demo = useOfficeDemo(); const agentAnimation = useAgentAnimation(); const motions = useAgentMovement(demo.step?.id, agentAnimation.states);
  const selectedSpeech = selected ? speeches[selected.id] ?? selected.speech : ""; const selectedHistory = useMemo(() => selected ? histories[selected.id] ?? selected.history : [], [histories, selected]);
  const visibleAgents = officeAgents.map(agent => { const instruction = agentAnimation.states[agent.id]; return { ...agent, status: demo.step?.statuses[agent.id] ?? (instruction === "completed" ? "完了" : instruction ? "分析中" : agent.status), speech: demo.step?.speeches[agent.id] ?? speeches[agent.id] ?? agent.speech, currentTask: demo.step?.agentIds.includes(agent.id) ? demo.step.process : agent.currentTask, progress: agent.id === "matching" && demo.step?.id === 3 ? demo.matchingProgress : agent.progress }; });
  const demoBadges = demo.step ? [`新着案件 ${demo.step.id >= 1 ? 19 : 18}`, `提案候補 ${demo.step.id >= 4 ? 10 : 7}`, `提案中 ${demo.status === "completed" ? 28 : 27}`, "面談予定 14", "要フォロー 6"] : officeStatusBadges;
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3000); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { if (localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "seen") setGuideOpen(true); }, []);
  const closeGuide = useCallback(() => { localStorage.setItem(ONBOARDING_STORAGE_KEY, "seen"); setGuideOpen(false); }, []);
  useEffect(() => () => { if (instructionTimer.current !== null) window.clearTimeout(instructionTimer.current); }, []);
  const runInstruction = (command: string) => { if (!selected) return; const id = selected.id; if (instructionTimer.current !== null) window.clearTimeout(instructionTimer.current); agentAnimation.run(id, animationForAgent(selected, undefined, true)); setSpeeches(previous => ({ ...previous, [id]: "新しい指示を実行しています…" })); setHistories(previous => ({ ...previous, [id]: [`指示を受付：${command}`, ...(previous[id] ?? selected.history)] })); setToast(`${selected.name}が指示を受け付けました`); instructionTimer.current = window.setTimeout(() => { setSpeeches(previous => ({ ...previous, [id]: `${command.slice(0, 18)}${command.length > 18 ? "…" : ""}を完了しました` })); setToast(`${selected.name}の処理が完了しました`); instructionTimer.current = null; }, 1800); };
  return <div className={`${s.officePage} ${demo.step ? s.demoRunning : ""}`}><OfficeHeader onGuide={() => setGuideOpen(true)} /><main className={s.officeMain}><div className={s.statusStrip}>{demoBadges.map((badge, index) => <span key={badge}><i className={s[`stripDot${index}`]} />{badge}</span>)}</div><div className={s.officeIntro}><div><span className={s.eyebrow}><Building2 size={13} />LIVE WORKSPACE</span><h1>AI社員が、人と情報をつないでいます</h1><p>一つのオフィスで、営業・採用・マッチングの連携をリアルタイムに確認できます。</p></div>{demo.status === "idle" ? <DemoStart onStart={demo.begin} speed={demo.speed} onSpeed={demo.setSpeed} /> : <span className={s.updated}><Clock3 size={13} />18:30 更新</span>}</div><div className={s.unifiedWorkspace}><OfficeFloor agents={visibleAgents} motions={motions} activeIds={demo.step?.agentIds ?? []} matchingProgress={demo.matchingProgress} handoffLabel={demo.step ? handoffLabels[demo.step.id] : undefined} onSelect={setSelected} /><ActivityRail /></div><div className={s.mobileHint}><Sparkles size={14} />AI社員をタップすると仕事と成果を確認できます</div></main>{selected && <AgentDetailPanel agent={selected} speech={demo.step?.speeches[selected.id] ?? selectedSpeech} history={selectedHistory} onClose={() => setSelected(null)} onRun={runInstruction} />}{demo.step && demo.status !== "idle" && <DemoControls status={demo.status} step={demo.step} progress={demo.progress} matchingProgress={demo.matchingProgress} onPause={demo.pause} onResume={demo.resume} onStop={demo.stop} onRestart={demo.begin} />}{demo.resultOpen && <DemoResult logs={demo.logs} onClose={() => demo.setResultOpen(false)} onRestart={demo.begin} />}{guideOpen && <FirstVisitGuide open={guideOpen} onClose={closeGuide} />}{toast && <Toast message={toast} />}</div>;
}
