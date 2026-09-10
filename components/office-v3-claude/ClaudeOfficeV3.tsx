"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, LayoutDashboard, MousePointerClick, Sparkles } from "lucide-react";
import { officeAgents } from "@/data/office";
import { v3ClaudeOnlyAgents } from "@/data/officeV3ClaudeAgents";
import { HUMAN_SEAT_ID, v3AgentPlacements, v3CentralTeamPlacements, v3Areas, v3HumanSeat, v3Zones } from "@/data/officeV3ClaudeLayout";
import { v3Layout1f } from "@/data/officeV3ClaudeLayout.1f";
import { v3Layout2f } from "@/data/officeV3ClaudeLayout.2f";
import { v3Layout3f } from "@/data/officeV3ClaudeLayout.3f";
import { v3Floors } from "@/data/officeV3ClaudeOrg";
import { useOfficeV3ClaudeDemo } from "@/hooks/useOfficeV3ClaudeDemo";
import type { V3AgentPlacement, V3AgentView, V3AreaId, V3FloorView } from "@/types/officeV3Claude";
import AgentDetailPanel from "./AgentDetailPanel";
import BuildingOverview from "./BuildingOverview";
import DemoWorkspacePanel from "./DemoWorkspacePanel";
import HumanSeatPanel from "./HumanSeatPanel";
import OfficeScene from "./OfficeScene";
import s from "./OfficeV3.module.css";

/**
 * 組織フロアの切替タブ（上位概念）。"building" + "all" + v3Floors(order順) から生成する。
 * Step4: 1F/2F/3F はフロア別レイアウト（V3FloorLayout）を選択。
 * Step13-A: 先頭に「建物全体」（BUILDING OVERVIEW）を追加。"全体" は従来どおり all/base の意味。
 */
const FLOOR_TABS: { id: V3FloorView; label: string; sub: string }[] = [
  // Step13-B: sub で「建物全体（3階構造の理解）」と「全体（13名の同一シーン＝デモの舞台）」を読み分けられるようにする。
  { id: "building", label: "建物全体", sub: "3階構造" },
  { id: "all", label: "全体", sub: "13名全景" },
  ...[...v3Floors]
    .sort((a, b) => a.order - b.order)
    .map(floor => ({ id: floor.id, label: floor.id.toUpperCase(), sub: floor.name.replace(/フロア$/u, "") })),
];

export default function ClaudeOfficeV3() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [area, setArea] = useState<V3AreaId>("all");
  // floor（組織上の階）と area（1枚の物理フロア内のズーム）は完全に別state。統合しない。
  const [floorView, setFloorView] = useState<V3FloorView>("all");
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

  // --- Step4: フロア別レイアウトデータの選択。
  //   1f/2f/3f はそれぞれ独立した V3FloorLayout（現状は 2F/3F=現行複製ベース）。
  //   all は互換表示。全体スタック図は後工程。 ---
  const floorLayout =
    floorView === "1f" ? v3Layout1f
    : floorView === "2f" ? v3Layout2f
    : floorView === "3f" ? v3Layout3f
    : null;

  // フロア表示では base の人物プロフィールを保ったまま、その階専用の配置だけを上書きする。
  // all は従来どおり base views をそのまま使う。
  const floorViews = useMemo(() => {
    if (!floorLayout) return views;
    const baseViews = new Map(views.map(view => [view.placement.agentId, view]));

    return floorLayout.placements.flatMap(floorPlacement => {
      const baseView = baseViews.get(floorPlacement.agentId);
      if (!baseView) return [];

      // optional な配置値は undefined で base 側を消さない。
      const definedPlacement = Object.fromEntries(
        Object.entries(floorPlacement).filter(([, value]) => value !== undefined),
      );
      const definedAppearance = Object.fromEntries(
        Object.entries(floorPlacement.appearance).filter(([, value]) => value !== undefined),
      );
      const placement: V3AgentPlacement = {
        ...baseView.placement,
        ...definedPlacement,
        appearance: {
          ...baseView.placement.appearance,
          ...definedAppearance,
        },
      } as V3AgentPlacement;

      return [{ ...baseView, placement }];
    });
  }, [views, floorLayout]);
  const aiCount = floorViews.length;
  // 人間責任者席は AI社員とは別カテゴリ。表示は "all" と "3f"（human seat は 3F 相当）のときだけ。
  const showHumanSeat = floorView === "all" || floorView === "3f";
  const activeFloor = floorView === "all" ? null : v3Floors.find(floor => floor.id === floorView) ?? null;
  // B-2: 専用レイアウトを持つフロアでは area バーの表示文言もそのフロアの areas を使う。
  //   all（floorLayout=null）は従来どおり base の v3Areas。カメラ値・切替ロジックは変更しない。
  const areaTabs = floorLayout?.areas ?? v3Areas;
  // デモ進行中はフロア切替を止める（全13名前提のため）。切替時は area を初期値へ、選択も解除。
  const demoBusy = demo.demoStatus === "running" || demo.demoStatus === "awaiting-approval";
  const changeFloor = useCallback((next: V3FloorView) => {
    setFloorView(next);
    setArea("all");
    setSelectedId(null);
  }, []);
  // デモは既存5シナリオが全13名前提のため、開始時は floorView を "all" へ戻す（デモ本体は変更しない）。
  const handleStartDemo = useCallback(() => {
    setFloorView("all");
    setSelectedId(null);
    demo.startDemo();
  }, [demo]);

  // 人間責任者席の詳細パネル用に、経営・統括層3名の最新ビューを渡す（AI社員の詳細パネルとは別コンポーネント）。
  const managerView = views.find(view => view.placement.agentId === "manager");
  const qualityView = views.find(view => view.placement.agentId === "quality");
  const strategistView = views.find(view => view.placement.agentId === "strategist");

  const demoSidebar = (
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
        startDemo={handleStartDemo}
        resetDemo={demo.resetDemo}
        approve={demo.approve}
        reject={demo.reject}
      />
    </div>
  );

  const officeColumn = (
    <div className={s.officeColumn}>
      {floorView === "building" ? (
        <BuildingOverview onOpenFloor={changeFloor} />
      ) : (
        <>
          <div className={s.viewport}>
            <OfficeScene
              views={floorViews}
              selectedId={selectedId}
              area={area}
              compact={compact}
              onSelect={select}
              activeAgentId={demo.activeAgentId}
              activeStatusText={demo.activeStatusText}
              previousAgentId={demo.previousAgentId}
              handoffStepId={demo.currentStep?.id}
              demoStatus={demo.demoStatus}
              showHumanSeat={showHumanSeat}
              humanSeatVariant={floorView === "3f" ? "executive" : "default"}
              zones={floorLayout?.zones}
              corridors={floorLayout?.corridors}
              furniture={floorLayout?.furniture}
              viewBox={floorLayout?.viewBox}
              humanSeat={floorLayout?.humanSeat}
              areas={floorLayout?.areas}
              floorTint={floorLayout?.floorTint}
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
        </>
      )}
    </div>
  );

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
            AI社員が営業・採用・フォローなどの業務を分担し、人間責任者が重要判断を行うSES業務デモです。
            <br />
            シナリオを選び、「デモ開始」を押してください。
          </p>
          <Link href="/dashboard" className={s.dashboardLink}>
            <LayoutDashboard size={13} aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </header>

      {/* 組織フロアの切り替え（上位概念）。下の「表示エリア」とは別state・別概念。 */}
      <nav className={s.floorBar} aria-label="組織フロアの切り替え">
        {FLOOR_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => changeFloor(tab.id)}
            disabled={demoBusy}
            className={floorView === tab.id ? s.floorActive : undefined}
            aria-pressed={floorView === tab.id}
            aria-current={floorView === tab.id ? "true" : undefined}
          >
            <b>{tab.label}</b>
            <small>{tab.sub}</small>
          </button>
        ))}
      </nav>
      <p className={s.floorMeta}>
        {floorView === "building" ? (
          <>
            <b>BUILDING OVERVIEW</b>　3階建て AI組織　／　AI社員 {aiCount}名　＋　人間責任者席
          </>
        ) : activeFloor ? (
          <>
            <b>{activeFloor.caption}</b>　{activeFloor.name}　／　AI社員 {aiCount}名
            {floorView === "3f" ? "　＋　人間責任者" : ""}
          </>
        ) : (
          <>
            <b>SES AI OFFICE</b>　／　AI社員 {aiCount}名
          </>
        )}
      </p>

      {/* 表示エリアの切り替え（下位概念：1枚の物理フロア内をズーム）。
          Step13-A: 建物全体オーバービューには north/center/south の概念がないため非表示。 */}
      {floorView !== "building" ? (
        <nav className={s.areaBar} aria-label="表示エリアの切り替え">
          {areaTabs.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setArea(item.id)}
              className={area === item.id ? s.areaActive : undefined}
              aria-pressed={area === item.id}
            >
              <b>{item.id === "all" ? "全景" : item.label}</b>
              <small>{item.caption}</small>
            </button>
          ))}
        </nav>
      ) : null}

      <main className={`${s.stage} ${floorView === "building" ? s.stageBuilding : ""}`}>
        {floorView === "building" ? (
          <>
            {officeColumn}
            {demoSidebar}
          </>
        ) : (
          <>
            {demoSidebar}
            {officeColumn}
          </>
        )}
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
