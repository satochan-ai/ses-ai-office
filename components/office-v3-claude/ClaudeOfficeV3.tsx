"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, LayoutDashboard, MousePointerClick, Sparkles } from "lucide-react";
import { officeAgents } from "@/data/office";
import { v3ClaudeOnlyAgents } from "@/data/officeV3ClaudeAgents";
import { HUMAN_SEAT_ID, v3AgentPlacements, v3CentralTeamPlacements, v3Areas, v3HumanSeat, v3Zones } from "@/data/officeV3ClaudeLayout";
import { useOfficeV3ClaudeDemo } from "@/hooks/useOfficeV3ClaudeDemo";
import type { V3AgentView, V3AreaId } from "@/types/officeV3Claude";
import AgentDetailPanel from "./AgentDetailPanel";
import DemoWorkspacePanel from "./DemoWorkspacePanel";
import HumanSeatPanel from "./HumanSeatPanel";
import OfficeScene from "./OfficeScene";
import s from "./OfficeV3.module.css";

export default function ClaudeOfficeV3() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [area, setArea] = useState<V3AreaId>("all");
  const [compact, setCompact] = useState(false);
  const demo = useOfficeV3ClaudeDemo();

  // ビューポートが正方形寄り（モバイル）かどうかだけを見る。リスナーは1つ。
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const views = useMemo<V3AgentView[]>(() => {
    // 既存11名は data/office.ts（V1〜V3共通）からそのまま読み取る。
    const agentMap = new Map(officeAgents.map(agent => [agent.id, agent]));
    // 品質管理・経営参謀の2名だけは Claude版V3専用データから読み取る。
    const claudeOnlyMap = new Map(v3ClaudeOnlyAgents.map(agent => [agent.id, agent]));
    const zoneMap = new Map(v3Zones.map(zone => [zone.id, zone]));

    // 既存11名の配置＋中央統括チーム2名の配置を合わせて13名分にする。
    const allPlacements = [...v3AgentPlacements, ...v3CentralTeamPlacements];

    return allPlacements.flatMap(placement => {
      const fieldAgent = agentMap.get(placement.agentId);
      if (fieldAgent) {
        return [{
          placement,
          name: fieldAgent.name,
          role: fieldAgent.role,
          zoneName: zoneMap.get(placement.zoneId)?.name ?? "",
          currentTask: fieldAgent.currentTask,
          duties: fieldAgent.duties,
          history: fieldAgent.history,
        }];
      }
      const centralAgent = claudeOnlyMap.get(placement.agentId);
      if (centralAgent) {
        return [{
          placement,
          name: centralAgent.name,
          role: centralAgent.role,
          // 中央統括チームは「所属」欄にゾーン名ではなくチーム名を表示する。
          zoneName: "中央統括チーム",
          currentTask: centralAgent.currentTask,
          duties: centralAgent.duties,
          history: centralAgent.history,
          finalDeliverables: centralAgent.finalDeliverables,
        }];
      }
      return [];
    });
  }, []);

  // デモパネルで「現在担当AI」の表示名を出すためのID→名前マップ（人間責任者席も含む）。
  const agentNames = useMemo(() => {
    const map: Record<string, string> = { [HUMAN_SEAT_ID]: v3HumanSeat.label };
    views.forEach(view => { map[view.placement.agentId] = view.name; });
    return map;
  }, [views]);

  const selected = views.find(view => view.placement.agentId === selectedId) ?? null;
  const isHumanSeatSelected = selectedId === HUMAN_SEAT_ID;
  const close = useCallback(() => setSelectedId(null), []);
  const select = useCallback((agentId: string) => setSelectedId(current => (current === agentId ? null : agentId)), []);

  // 人間責任者席の詳細パネル用に、経営・統括層3名の最新ビューを渡す（AI社員の詳細パネルとは別コンポーネント）。
  const managerView = views.find(view => view.placement.agentId === "manager");
  const qualityView = views.find(view => view.placement.agentId === "quality");
  const strategistView = views.find(view => view.placement.agentId === "strategist");

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.brand}>
          <span aria-hidden="true"><Building2 size={17} /></span>
          <div>
            <strong>SES AI Office</strong>
            <small>ISOMETRIC WORKPLACE · V3</small>
          </div>
        </div>
        <div className={s.headerActions}>
          <p className={s.headline}>
            AI社員13名が営業・採用・フォローなどの業務を分担し、人間責任者が重要判断を行うSES業務デモです。
            <br />
            シナリオを選び、「デモ開始」を押してください。
          </p>
          <Link href="/dashboard" className={s.dashboardLink}>
            <LayoutDashboard size={13} aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </header>

      <nav className={s.areaBar} aria-label="表示エリアの切り替え">
        {v3Areas.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setArea(item.id)}
            className={area === item.id ? s.areaActive : undefined}
            aria-pressed={area === item.id}
          >
            <b>{item.label}</b>
            <small>{item.caption}</small>
          </button>
        ))}
      </nav>

      <main className={s.stage}>
        <div className={s.officeColumn}>
          <div className={s.viewport}>
            <OfficeScene
              views={views}
              selectedId={selectedId}
              area={area}
              compact={compact}
              onSelect={select}
              activeAgentId={demo.activeAgentId}
              activeStatusText={demo.activeStatusText}
            />
          </div>
          {selected ? (
            <AgentDetailPanel view={selected} onClose={close} />
          ) : isHumanSeatSelected ? (
            <HumanSeatPanel
              seat={v3HumanSeat}
              managerView={managerView}
              qualityView={qualityView}
              strategistView={strategistView}
              onClose={close}
              demoStatus={demo.demoStatus}
              approvalState={demo.approvalState}
              approvalLocked={demo.approvalLocked}
              scenario={demo.selectedScenario}
              demoStepTitle={demo.currentStep?.title}
              onApprove={demo.approve}
              onReject={demo.reject}
            />
          ) : null}
        </div>

        <div className={s.demoSidebar}>
          <DemoWorkspacePanel
            scenarios={demo.scenarios}
            selectedScenarioId={demo.selectedScenarioId}
            selectedScenario={demo.selectedScenario}
            selectScenario={demo.selectScenario}
            demoStatus={demo.demoStatus}
            approvalState={demo.approvalState}
            approvalLocked={demo.approvalLocked}
            currentStep={demo.currentStep}
            currentStepIndex={demo.currentStepIndex}
            totalSteps={demo.totalSteps}
            progressPercent={demo.progressPercent}
            activeAgentId={demo.activeAgentId}
            activeStatusText={demo.activeStatusText}
            agentNames={agentNames}
            logs={demo.logs}
            startDemo={demo.startDemo}
            resetDemo={demo.resetDemo}
            approve={demo.approve}
            reject={demo.reject}
          />
        </div>
      </main>

      <p className={s.hint}>
        <MousePointerClick size={13} aria-hidden="true" />
        人物をクリック（またはTabキーで選択しEnter）すると担当業務が開きます。
        <Sparkles size={13} aria-hidden="true" />
        胸元のバッジがAI社員の目印です。
      </p>
    </div>
  );
}
