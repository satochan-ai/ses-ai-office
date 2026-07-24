"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BarChart3, Check, ChevronRight, CircleStop, FastForward, Play, RotateCcw, Sparkles, UsersRound } from "lucide-react";
import { officeAgents } from "@/data/office";
import { isoProject, v2Agents, v2Furniture, v2Zones } from "@/data/officeV2Layout";
import { demoSequence, v2Routes } from "@/data/officeV2Routes";
import type { V2Point } from "@/types/officeV2";
import IsometricAgent from "./IsometricAgent";
import IsometricFurniture from "./IsometricFurniture";
import s from "./IsometricOffice.module.css";

function ZoneTile({ zone }: { zone: (typeof v2Zones)[number] }) {
  const points = zone.corners.map(isoProject);
  const minX = Math.min(...points.map(p => p.left)); const maxX = Math.max(...points.map(p => p.left));
  const minY = Math.min(...points.map(p => p.top)); const maxY = Math.max(...points.map(p => p.top));
  const polygon = points.map(p => `${((p.left - minX) / (maxX - minX)) * 100}% ${((p.top - minY) / (maxY - minY)) * 100}%`).join(",");
  return <div className={`${s.zone} ${s[`zone_${zone.tone}`]}`} style={{ left: `${minX}%`, top: `${minY}%`, width: `${maxX - minX}%`, height: `${maxY - minY}%`, clipPath: `polygon(${polygon})` }}><span><b>{zone.label}</b><small>{zone.caption}</small></span></div>;
}

function PathNetwork() {
  return <div className={s.paths} aria-label="歩行可能な中央通路と枝道">
    <i className={s.pathMain} /><i className={s.pathCross} /><i className={s.pathNorthWest} /><i className={s.pathNorthEast} /><i className={s.pathSouthWest} /><i className={s.pathSouthEast} />
  </div>;
}

export default function IsometricOffice() {
  const [selectedId, setSelectedId] = useState("manager");
  const [routeId, setRouteId] = useState<string | null>(null);
  const [routeIndex, setRouteIndex] = useState(0);
  const [demoStep, setDemoStep] = useState(-1);
  const [fast, setFast] = useState(false);
  const [mobileArea, setMobileArea] = useState<"all" | "north" | "center" | "south">("all");
  const timer = useRef<number | null>(null);
  const activeRoute = routeId ? v2Routes[routeId] : null;

  const clearTimer = useCallback(() => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; }, []);
  const stop = useCallback(() => { clearTimer(); setRouteId(null); setRouteIndex(0); setDemoStep(-1); }, [clearTimer]);
  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    if (!activeRoute) return;
    if (routeIndex < activeRoute.points.length - 1) {
      timer.current = window.setTimeout(() => setRouteIndex(i => i + 1), fast ? 145 : 360);
      return clearTimer;
    }
    timer.current = window.setTimeout(() => {
      setRouteId(null); setRouteIndex(0);
      if (demoStep >= 0 && demoStep < demoSequence.length - 1) setDemoStep(i => i + 1);
      else if (demoStep === demoSequence.length - 1) setDemoStep(demoSequence.length);
    }, fast ? 250 : 650);
    return clearTimer;
  }, [activeRoute, clearTimer, demoStep, fast, routeIndex]);

  useEffect(() => {
    if (demoStep < 0 || demoStep >= demoSequence.length || routeId) return;
    const item = demoSequence[demoStep];
    if (item.routeId) {
      setRouteIndex(0); setRouteId(item.routeId);
    } else {
      timer.current = window.setTimeout(() => setDemoStep(i => i + 1), fast ? 600 : 1500);
      return clearTimer;
    }
  }, [clearTimer, demoStep, fast, routeId]);

  const runRoute = (id: string) => { clearTimer(); setDemoStep(-1); setRouteIndex(0); setRouteId(id); };
  const startDemo = () => { clearTimer(); setRouteId(null); setRouteIndex(0); setDemoStep(0); };
  const selected = officeAgents.find(agent => agent.id === selectedId) ?? officeAgents[0];
  const progress = demoStep < 0 ? 0 : Math.min(100, Math.round((demoStep / demoSequence.length) * 100));
  const stepSpeech = demoStep >= 0 && demoStep < demoSequence.length ? demoSequence[demoStep].speech : demoStep === demoSequence.length ? "提案準備が完了しました" : "";
  const movingPoint: V2Point | undefined = activeRoute?.points[routeIndex];
  const agentMap = useMemo(() => new Map(officeAgents.map(agent => [agent.id, agent])), []);

  return <div className={s.page}>
    <header className={s.header}>
      <div className={s.brand}><span><Sparkles size={18} /></span><div><strong>SES AI Office</strong><small>ISOMETRIC VISUAL PROTOTYPE</small></div><em>V2</em></div>
      <div className={s.headerActions}><span className={s.live}><i />AI社員 11名 稼働中</span><Link href="/dashboard"><BarChart3 size={14} />Dashboard</Link><Link href="/"><ArrowLeft size={14} />現行版へ</Link></div>
    </header>

    <main>
      <section className={s.intro}>
        <div><span className={s.eyebrow}>ONE FLOOR · CONNECTED INTELLIGENCE</span><h1>仕事の流れが見える、ひとつながりのAIオフィス</h1><p>営業・人材・顧客・管理の11名が、中央指令席を起点に連携しています。</p></div>
        <div className={s.metrics}><span><b>11</b>AI社員</span><span><b>5</b>ワークゾーン</span><span><b>3</b>固定経路</span></div>
      </section>

      <section className={s.controlBar} aria-label="V2デモ操作">
        <div className={s.demoCopy}><span className={demoStep >= 0 ? s.runningDot : s.readyDot} /><div><strong>{demoStep === demoSequence.length ? "提案準備が完了しました" : demoStep >= 0 ? demoSequence[demoStep].title : "新着案件から提案準備まで"}</strong><small>{demoStep >= 0 ? `STEP ${Math.min(demoStep + 1, demoSequence.length)} / ${demoSequence.length}` : "受付 → 分析 → マッチング → 会議 → 推薦文"}</small></div></div>
        <div className={s.progress}><i style={{ width: `${progress}%` }} /></div>
        <div className={s.routeButtons}>{Object.values(v2Routes).filter(r => r.id !== "managerReception").map(route => <button key={route.id} onClick={() => runRoute(route.id)} disabled={Boolean(routeId) || demoStep >= 0}>{route.label}<ChevronRight size={12} /></button>)}</div>
        <button className={s.speed} onClick={() => setFast(v => !v)} aria-pressed={fast}><FastForward size={14} />{fast ? "高速" : "標準"}</button>
        {demoStep >= 0 ? <button className={s.stop} onClick={stop}><CircleStop size={15} />停止</button> : <button className={s.start} onClick={startDemo}><Play size={15} />デモ開始</button>}
      </section>

      <nav className={s.mobileAreas} aria-label="表示エリア切替">{(["all", "north", "center", "south"] as const).map(area => <button key={area} onClick={() => setMobileArea(area)} className={mobileArea === area ? s.mobileActive : ""}>{area === "all" ? "全体" : area === "north" ? "北側" : area === "center" ? "中央" : "南側"}</button>)}</nav>

      <section className={s.officeShell}>
        <div className={`${s.viewport} ${s[`view_${mobileArea}`]}`}>
          <div className={s.stage} aria-label="アイソメトリック型 SES AI Office">
            <div className={s.city}><i /><i /><i /><i /><i /><i /></div>
            <div className={s.floorBase} />
            <div className={s.backWall}><span>SES AI OFFICE · TOKYO</span><i /><i /><i /><i /></div>
            {v2Zones.map(zone => <ZoneTile key={zone.id} zone={zone} />)}
            <PathNetwork />
            {v2Furniture.filter(f => f.layer !== "front").map(item => <IsometricFurniture key={item.id} item={item} />)}
            {v2Agents.map(layout => {
              const agent = agentMap.get(layout.agentId); if (!agent) return null;
              const isMoving = activeRoute?.agentId === agent.id;
              const isTarget = activeRoute?.targetId === agent.id && routeIndex >= Math.floor((activeRoute?.points.length ?? 1) / 2) - 1;
              const speech = isMoving ? activeRoute?.speech : isTarget ? (agent.id === "analytics" ? "類似実績を分析中" : "受け取りました") : demoStep >= 4 && agent.id === "proposal" ? stepSpeech : undefined;
              return <IsometricAgent key={agent.id} agent={agent} layout={layout} point={isMoving ? movingPoint : undefined} speech={speech} active={isMoving || isTarget || (demoStep >= 4 && agent.id === "proposal")} selected={selectedId === agent.id} onSelect={() => setSelectedId(agent.id)} />;
            })}
            {activeRoute?.handoff && routeIndex >= Math.floor(activeRoute.points.length / 2) - 1 && routeIndex <= Math.floor(activeRoute.points.length / 2) + 1 && <div className={s.handoff} style={{ left: `${isoProject(movingPoint ?? activeRoute.points[0]).left + 2}%`, top: `${isoProject(movingPoint ?? activeRoute.points[0]).top + 3}%` }}><Sparkles size={10} />{activeRoute.handoff}</div>}
            {v2Furniture.filter(f => f.layer === "front").map(item => <IsometricFurniture key={item.id} item={item} />)}
          </div>
        </div>

        <aside className={s.agentPanel}>
          <header><span><UsersRound size={15} /></span><div><strong>{selected.name}</strong><small>{selected.room}</small></div><b>{selected.status}</b></header>
          <p>{selected.role}</p>
          <div className={s.currentTask}><span>現在の作業</span><strong>{selected.currentTask}</strong><i><b style={{ width: `${selected.progress}%` }} /></i></div>
          <div className={s.agentStats}><span>本日の成果<b>{selected.result}</b></span><span>未処理<b>{selected.pending}件</b></span></div>
          <button onClick={() => setSelectedId("manager")}><RotateCcw size={13} />中央指令席を表示</button>
        </aside>
      </section>
      <div className={s.legend}><span><i className={s.legendPath} />歩行可能な通路</span><span><i className={s.legendActive} />連携中</span><span><Check size={12} />人物を選択して業務を確認</span></div>
    </main>
  </div>;
}
