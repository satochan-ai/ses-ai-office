"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, LayoutDashboard, MousePointerClick, Sparkles } from "lucide-react";
import { officeAgents } from "@/data/office";
import { v3AgentPlacements, v3Areas, v3Zones } from "@/data/officeV3ClaudeLayout";
import type { V3AgentView, V3AreaId } from "@/types/officeV3Claude";
import AgentDetailPanel from "./AgentDetailPanel";
import OfficeScene from "./OfficeScene";
import s from "./OfficeV3.module.css";

export default function ClaudeOfficeV3() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [area, setArea] = useState<V3AreaId>("all");
  const [compact, setCompact] = useState(false);

  // ビューポートが正方形寄り（モバイル）かどうかだけを見る。リスナーは1つ。
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const views = useMemo<V3AgentView[]>(() => {
    const agentMap = new Map(officeAgents.map(agent => [agent.id, agent]));
    const zoneMap = new Map(v3Zones.map(zone => [zone.id, zone]));
    return v3AgentPlacements.flatMap(placement => {
      const agent = agentMap.get(placement.agentId);
      if (!agent) return [];
      return [{
        placement,
        name: agent.name,
        role: agent.role,
        zoneName: zoneMap.get(placement.zoneId)?.name ?? "",
        currentTask: agent.currentTask,
        duties: agent.duties,
        history: agent.history,
      }];
    });
  }, []);

  const selected = views.find(view => view.placement.agentId === selectedId) ?? null;
  const close = useCallback(() => setSelectedId(null), []);
  const select = useCallback((agentId: string) => setSelectedId(current => (current === agentId ? null : agentId)), []);

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
            ひとつのフロアで、11名のAI社員が中央指令席を囲んで働いています。
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
        <div className={s.viewport}>
          <OfficeScene views={views} selectedId={selectedId} area={area} compact={compact} onSelect={select} />
        </div>
        {selected ? <AgentDetailPanel view={selected} onClose={close} /> : null}
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
