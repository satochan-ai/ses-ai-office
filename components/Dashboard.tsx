"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bell, Bot, BriefcaseBusiness, Building2,
  CalendarCheck, Check, ChevronRight, CircleGauge, Clock3, Command, Handshake, Menu,
  MessageSquareText, PanelLeftClose, Rocket, Search, Send, Settings, Sparkles, Target,
  TrendingUp, UserRound, UsersRound, X, Zap,
} from "lucide-react";
import {
  agents, attentionItems, funnels, initialActivities, pipelineColumns, prospects, summaries, tasks,
} from "@/data/mockData";
import type { Activity as ActivityType, Agent as AgentType, PriorityTask, Tone } from "@/types";
import type { DemoStoredResult } from "@/types/demo";
import { DEMO_STORAGE_KEY } from "@/data/demoScenario";

const icons = [Target, CalendarCheck, BriefcaseBusiness, Send, MessageSquareText];
const menuItems = [
  ["ダッシュボード", CircleGauge], ["新規開拓", Rocket], ["顧客管理", Building2], ["BP管理", Handshake],
  ["案件管理", BriefcaseBusiness], ["要員管理", UsersRound], ["提案管理", Send], ["面談管理", CalendarCheck],
  ["採用管理", UserRound], ["稼働管理", Activity], ["営業分析", BarChart3], ["AI社員", Bot], ["設定", Settings],
] as const;

function StatusBadge({ children, tone = "blue" }: { children: React.ReactNode; tone?: Tone | "red" | "gray" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Header({ onMenu }: { onMenu: () => void }) {
  return <header className="header"><div className="brand">
    <button className="mobile-menu icon-button" onClick={onMenu} aria-label="メニューを開く"><Menu size={20} /></button>
    <div className="brand-mark"><Sparkles size={21} /></div><div><strong>SES AI Office</strong><span>営業・採用業務をAIで加速</span></div>
  </div><div className="header-actions"><Link className="v3-link" href="/office-v3-claude"><Building2 size={15} />AI Office V3<b className="v3-tag">正式版</b></Link><Link className="office-return" href="/"><Building2 size={15} />AIオフィスへ戻る</Link><div className="now"><span>2026年7月16日 木曜日</span><strong>18:30</strong></div>
    <div className="live-pill"><span className="pulse" /> AI社員 8名 稼働中</div><button className="icon-button" aria-label="通知"><Bell size={19} /><i>3</i></button>
    <button className="icon-button hide-mobile" aria-label="設定"><Settings size={19} /></button><div className="user"><div className="avatar">さ</div><span>さとちゃん</span></div>
  </div></header>;
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <><aside className={`sidebar ${open ? "open" : ""}`}><div className="side-title"><span>WORKSPACE</span><PanelLeftClose size={16} /></div>
    <nav>{menuItems.map(([label, Icon], i) => <button key={label} className={i === 0 ? "active" : ""} onClick={onClose}><Icon size={18} /><span>{label}</span>{i === 1 && <em>42</em>}</button>)}</nav>
    <div className="upgrade"><div className="upgrade-icon"><Zap size={20} /></div><strong>AIで営業をもっとスマートに。</strong><p>分析機能と自動化を拡張</p><button>アップグレード</button></div>
  </aside>{open && <button className="scrim" onClick={onClose} aria-label="メニューを閉じる" />}</>;
}

function SummaryCard({ item, index }: { item: (typeof summaries)[number]; index: number }) {
  const Icon = icons[index];
  return <article className={`summary-card tone-${item.tone}`}><div className="summary-icon"><Icon size={20} /></div><div><span>{item.label}</span><strong>{item.value}<small>{item.unit}</small></strong><p>{item.note}</p></div><ChevronRight className="summary-arrow" size={18} /></article>;
}

function Panel({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}

const taskGroups = [
  { title: "今すぐ対応", tone: "urgent", ids: [1, 3] }, { title: "今日中", tone: "today", ids: [4, 6] },
  { title: "確認待ち", tone: "waiting", ids: [2] }, { title: "AI処理中", tone: "running", ids: [5] },
];

function PriorityTasks({ onSelect, taskItems, demoCompleted }: { onSelect: (task: PriorityTask) => void; taskItems: PriorityTask[]; demoCompleted: boolean }) {
  const groups = taskGroups.map(group => group.title === "今すぐ対応" && demoCompleted ? { ...group, ids: [7, ...group.ids] } : group);
  return <Panel title="今日の優先タスク" subtitle="売上インパクトと期限から、今見るべき6件に絞りました" action={<button className="text-button">すべて見る <ArrowRight size={15} /></button>}>
    <div className="task-board">{groups.map(group => <div className={`task-column task-column-${group.tone}`} key={group.title}><div className="task-column-head"><span className="column-dot" /><strong>{group.title}</strong><em>{group.ids.length}</em></div>
      {group.ids.map(id => { const task = taskItems.find(t => t.id === id)!; return <button className="task-card" key={id} onClick={() => onSelect(task)}><div><strong>{task.title}</strong><StatusBadge tone={task.priority === "高" ? "red" : task.priority === "中" ? "orange" : "gray"}>{task.priority}</StatusBadge></div><p><Bot size={13} />{task.agent}</p><footer><span><Clock3 size={12} />{task.deadline}</span><span className={task.status === "進行中" ? "is-working" : ""}>{task.status}</span></footer></button>; })}
    </div>)}</div>
  </Panel>;
}

function FunnelAndProspects() {
  const [tab, setTab] = useState<"customer" | "bp">("customer");
  const labels = tab === "customer" ? ["開拓候補", "アプローチ済", "返信あり", "商談調整", "初回商談", "2回目商談", "案件獲得", "取引開始"] : ["開拓候補", "アプローチ済", "返信あり", "商談調整", "初回商談", "2回目商談", "情報交換", "取引開始"];
  const values = funnels[tab]; const visibleProspects = tab === "customer" ? prospects.filter(p => p.type.includes("顧客")) : prospects.filter(p => p.type.includes("BP"));
  return <Panel title="新規開拓" subtitle="ファネルの停滞と、次に動かす企業だけを表示" action={<div className="tabs"><button className={tab === "customer" ? "active" : ""} onClick={() => setTab("customer")}>顧客開拓</button><button className={tab === "bp" ? "active" : ""} onClick={() => setTab("bp")}>BP開拓</button></div>}>
    <div className="funnel-horizontal">{values.map((value, i) => <div className="funnel-node" key={labels[i]}><span>{labels[i]}</span><strong>{value}</strong>{i < values.length - 1 && <i><ChevronRight size={14} /></i>}</div>)}</div>
    <div className="focus-row-head"><div><Target size={15} /><strong>今、対応すべき企業</strong></div><button className="text-button">新規開拓を開く <ArrowRight size={14} /></button></div>
    <div className="prospect-cards">{visibleProspects.map(p => <article className="prospect-card" key={p.company}><header><StatusBadge tone={p.type.includes("BP") ? "orange" : "purple"}>{p.type}</StatusBadge><StatusBadge tone={p.due === "本日" ? "red" : "gray"}>{p.due}</StatusBadge></header><h3>{p.company}</h3><p><span>現在</span>{p.touch}</p><p><span>次へ</span><b>{p.next}</b></p><footer><Bot size={13} />{p.agent}</footer></article>)}</div>
  </Panel>;
}

const agentProgress = [82, 70, 58, 64, 76, 48];
const agentResults = ["停滞案件3件を検知", "優先候補8社を抽出", "有望BP5社を選定", "商機候補6件を発見", "推薦候補11名を抽出", "面談準備7件を完了"];
function AgentCards({ onSelect }: { onSelect: (a: AgentType) => void }) {
  return <Panel title="AI社員の活動状況" subtitle="AIチームが今どこまで進めているか" action={<button className="text-button">すべてのAI社員を見る <ArrowRight size={15} /></button>}>
    <div className="agent-activity-grid">{agents.slice(0, 6).map((a, i) => <button className="agent-activity-card" key={a.id} onClick={() => onSelect(a)}><header><div className={`agent-avatar tone-${a.tone}`}>{a.shortName}</div><div><strong>{a.name}</strong><span className="online"><i />稼働中</span></div><ChevronRight size={16} /></header><p className="agent-role">{a.role}</p><div className="agent-work"><span>現在の作業</span><strong>{a.task}</strong></div><div className="progress-label"><span>進捗</span><b>{agentProgress[i]}%</b></div><div className="progress-track"><i style={{ width: `${agentProgress[i]}%` }} /></div><footer><Check size={13} /><span>本日の成果</span><strong>{agentResults[i]}</strong></footer></button>)}</div>
  </Panel>;
}

function AttentionCards() {
  return <Panel title="要注意顧客・BP" subtitle="フォロー漏れと次の商機をAIが整理" action={<button className="text-button">顧客・BP管理を開く <ArrowRight size={15} /></button>}><div className="attention-grid">{attentionItems.map(item => <article className={`attention-card attention-${item.kind}`} key={item.label}><header>{item.kind === "chance" ? <TrendingUp size={17} /> : <AlertTriangle size={17} />}<span>{item.label}</span><strong>{item.count}<small>件</small></strong></header><div>{item.companies.map(name => <span key={name}>{name}</span>)}</div></article>)}</div></Panel>;
}

function PipelineBoard() {
  return <Panel title="案件・要員・採用進捗" subtitle="各ステージの代表案件だけを表示" action={<button className="text-button">進捗管理を開く <ArrowRight size={15} /></button>}><div className="pipeline-board">{pipelineColumns.map((column, i) => <div className="pipeline-column" key={column.stage}><header><span>{column.stage}</span><em>{column.items.length}</em></header>{column.items.map(item => <article key={item.title}><div><strong>{item.title}</strong><span>{item.candidates}名</span></div><p>{item.next}</p><footer><span><Bot size={12} />{item.agent}</span><time>{item.updated}</time></footer></article>)}{column.items.length === 1 && i < 5 && <div className="empty-slot">次の進捗を待機中</div>}</div>)}</div></Panel>;
}

function ActivityLog({ logs }: { logs: ActivityType[] }) {
  return <Panel title="AI実行ログ" subtitle="最新5件" action={<button className="text-button">すべてのログを見る <ArrowRight size={15} /></button>}><div className="timeline log-compact">{logs.slice(0, 5).map((log, i) => <div className="log" key={`${log.time}-${i}`}><span className={`log-dot ${log.status === "処理中" ? "running" : ""}`}>{log.status === "完了" ? <Check size={11} /> : <Activity size={11} />}</span><time>{log.time}</time><div><strong>{log.agent}</strong><p>{log.action}</p></div><StatusBadge tone={log.status === "完了" ? "green" : "blue"}>{log.status}</StatusBadge></div>)}</div></Panel>;
}

function CommandPanel({ onExecute, running }: { onExecute: (text: string, agent: string) => void; running: boolean }) {
  const initial = "本日の新規顧客候補、BP候補、既存顧客、案件、要員、応募者情報を確認し、優先して対応すべき営業活動と次回アクションを整理してください";
  const [text, setText] = useState(initial); const [agent, setAgent] = useState("すべてのAI社員");
  return <section className="command-panel"><div className="command-title"><div><Command size={20} /></div><span><strong>AIへの一括指示</strong><small>自然な言葉でチームに依頼できます</small></span></div><textarea value={text} onChange={e => setText(e.target.value)} aria-label="AIへの指示" /><div className="command-controls"><label>指示対象<select value={agent} onChange={e => setAgent(e.target.value)}>{["すべてのAI社員", ...agents.map(a => a.name)].map(a => <option key={a}>{a}</option>)}</select></label><label>優先度<select><option>高</option><option>中</option><option>低</option></select></label><label>実行期限<select><option>今すぐ</option><option>本日中</option><option>明日まで</option><option>今週中</option></select></label><button disabled={running || !text.trim()} onClick={() => onExecute(text, agent)}>{running ? <><span className="spinner" />実行中...</> : <><Sparkles size={17} />AI社員に実行を指示</>}</button></div></section>;
}

function AgentModal({ agent, onClose }: { agent: AgentType; onClose: () => void }) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="agent-title"><button className="modal-close" onClick={onClose} aria-label="閉じる"><X size={20} /></button><div className="modal-hero"><div className={`agent-avatar large tone-${agent.tone}`}>{agent.shortName}</div><div><span className="online"><i />稼働中</span><h2 id="agent-title">{agent.name}</h2><p>{agent.role}</p></div></div><div className="modal-stats"><div><span>現在のタスク</span><strong>{agent.task}</strong></div><div><span>本日の処理数</span><strong>{agent.processed}件</strong></div></div><h3>担当業務</h3><ul className="duty-list">{agent.duties.map(d => <li key={d}><Check size={14} />{d}</li>)}</ul><h3>最近の実行履歴</h3><div className="recent"><p><time>18:12</time> 優先候補の分析を完了しました</p><p><time>17:48</time> 停滞しているタスクを3件検知しました</p></div><div className="knowledge"><span>使用ナレッジ</span><b>顧客DB・案件票・接点履歴</b><span>連携予定</span><b>メール・カレンダー・CRM</b></div><div className="modal-command"><input aria-label={`${agent.name}への指示`} placeholder={`${agent.name}に追加の指示を入力...`} /><button><Send size={16} />実行</button></div></div></div>;
}

function TaskModal({ task, onClose }: { task: PriorityTask; onClose: () => void }) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal task-modal" role="dialog" aria-modal="true" aria-labelledby="task-title"><button className="modal-close" onClick={onClose} aria-label="閉じる"><X size={20} /></button><StatusBadge tone={task.priority === "高" ? "red" : task.priority === "中" ? "orange" : "gray"}>優先度 {task.priority}</StatusBadge><h2 id="task-title">{task.title}</h2><p className="task-description">AIが関連する顧客情報、接点履歴、進行状況を確認し、次に取るべきアクションを整理しています。</p><div className="task-detail-grid"><div><span>担当AI</span><strong><Bot size={15} />{task.agent}</strong></div><div><span>期限</span><strong><Clock3 size={15} />{task.deadline}</strong></div><div><span>ステータス</span><strong>{task.status}</strong></div><div><span>カテゴリ</span><strong>{task.category}</strong></div></div><h3>AIからの推奨</h3><div className="recommendation"><Sparkles size={17} /><p>期限と商談化の可能性を考慮し、午前中の対応を推奨します。関連情報の下書きは準備済みです。</p></div><button className="modal-primary"><Check size={16} />対応を開始する</button></div></div>;
}

export default function Dashboard() {
  const [sidebar, setSidebar] = useState(false); const [selected, setSelected] = useState<AgentType | null>(null); const [selectedTask, setSelectedTask] = useState<PriorityTask | null>(null); const [logs, setLogs] = useState(initialActivities); const [running, setRunning] = useState(false); const [toast, setToast] = useState("");
  const [demoResult, setDemoResult] = useState<DemoStoredResult | null>(null);
  const executeTimer = useRef<number | null>(null);
  const today = useMemo(() => ({ recruit: 36, active: 128 }), []);
  useEffect(() => { const raw = sessionStorage.getItem(DEMO_STORAGE_KEY); if (!raw) return; try { const result = JSON.parse(raw) as DemoStoredResult; setDemoResult(result); setLogs([...result.logs].reverse().map((action, index) => ({ time: `18:${Math.max(0, 30 - index).toString().padStart(2, "0")}`, agent: action.includes("契約") || action.includes("勤務表") ? "AI契約・請求管理担当" : action.includes("ナレッジ") || action.includes("改善") ? "AI教育・ナレッジ担当" : action.includes("面談") ? "AI提案・面談支援担当" : action.includes("マッチング") || action.includes("候補") ? "AIマッチング担当" : action.includes("分析") || action.includes("失注") ? "AI分析担当" : "AI営業Mgr", action, status: "完了" as const }))); } catch { sessionStorage.removeItem(DEMO_STORAGE_KEY); } }, []);
  const displayedSummaries = summaries.map(item => item.label === "新着案件" && demoResult ? { ...item, value: item.value + demoResult.newJobs, note: "デモ案件 +1" } : item.label === "提案中" && demoResult ? { ...item, value: item.value + demoResult.proposals, note: "提案準備完了 +1" } : item);
  const displayedTasks: PriorityTask[] = demoResult ? [{ id: 7, title: demoResult.priorityTasks?.[0] ?? "Java案件の提案送付", agent: demoResult.scenarioId === "contract-risk" ? "AIフォロー担当" : demoResult.scenarioId === "lost-knowledge" ? "AI分析担当" : "AI営業Mgr", priority: "高", deadline: "今すぐ", status: "未着手", category: demoResult.scenarioId === "contract-risk" ? "契約" : demoResult.scenarioId === "lost-knowledge" ? "分析" : "提案" }, ...tasks] : tasks;
  const resetDemo = () => { sessionStorage.removeItem(DEMO_STORAGE_KEY); setDemoResult(null); setLogs(initialActivities); setToast("デモ結果をリセットしました"); };
  const execute = (text: string, agent: string) => { if (executeTimer.current !== null) window.clearTimeout(executeTimer.current); setRunning(true); setToast("AI社員に指示を送信しました"); setLogs(prev => [{ time: "18:30", agent, action: `一括指示を受付：${text.slice(0, 22)}…`, status: "処理中" }, ...prev]); executeTimer.current = window.setTimeout(() => { setRunning(false); setToast("優先アクションの整理が完了しました"); setLogs(prev => prev.map((l, i) => i === 0 ? { ...l, status: "完了" } : l)); executeTimer.current = null; }, 1600); };
  useEffect(() => () => { if (executeTimer.current !== null) window.clearTimeout(executeTimer.current); }, []);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(""), 3000); return () => window.clearTimeout(id); }, [toast]);
  return <div className="app-shell"><Header onMenu={() => setSidebar(true)} /><Sidebar open={sidebar} onClose={() => setSidebar(false)} /><main>
    <div className="page-intro"><div><p><span className="pulse" />AI営業チームは正常に稼働しています</p><h1>おはようございます、さとちゃんさん</h1><span>今日の判断に必要な情報だけをまとめました。</span></div><button><Search size={16} />企業・案件・要員を検索 <kbd>⌘ K</kbd></button></div>
    {demoResult && <div className="demo-dashboard-banner"><div><Check size={17} /><span><strong>{demoResult.scenarioTitle ?? "Java案件の提案準備が完了"}</strong> {demoResult.dashboardSummary ?? "新着案件 +1 ・ 提案候補 +3 ・ 提案中 +1"}</span></div><button onClick={resetDemo}>デモ結果をリセット</button></div>}
    <div className="summary-grid">{displayedSummaries.map((s, i) => <SummaryCard key={s.label} item={s} index={i} />)}</div>
    <div className="mini-summary"><div><span>採用選考中</span><strong>{today.recruit}<small>件</small></strong><em>書類選考 18件</em></div><div><span>稼働中要員</span><strong>{today.active}<small>名</small></strong><em>更新確認 12名</em></div><div className="attention"><span>要確認アラート</span><strong>7<small>件</small></strong><em>期限超過・停滞</em></div></div>
    <PriorityTasks onSelect={setSelectedTask} taskItems={displayedTasks} demoCompleted={Boolean(demoResult)} /><FunnelAndProspects /><AgentCards onSelect={setSelected} /><AttentionCards /><PipelineBoard />
    <ActivityLog logs={logs} /><CommandPanel onExecute={execute} running={running} /><footer>SES AI Office Dashboard <span>•</span> モックデータ最終更新 18:30</footer>
  </main>{selected && <AgentModal agent={selected} onClose={() => setSelected(null)} />}{selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />}{toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}</div>;
}
