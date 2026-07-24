"use client";

import { Sparkles } from "lucide-react";
import type { OfficeAgent } from "@/types/office";
import type { V2AgentLayout, V2Point } from "@/types/officeV2";
import { isoProject } from "@/data/officeV2Layout";
import s from "./IsometricOffice.module.css";

const shortLabels: Record<string, string> = {
  manager: "営業Mgr", analytics: "分析", newbiz: "新規開拓", bp: "BP開拓",
  matching: "マッチング", recruit: "採用", follow: "フォロー",
  relation: "顧客管理", proposal: "面談支援", contract: "契約管理", knowledge: "ナレッジ",
};

export default function IsometricAgent({ agent, layout, point, speech, active, selected, onSelect }: {
  agent: OfficeAgent; layout: V2AgentLayout; point?: V2Point; speech?: string; active: boolean; selected: boolean; onSelect: () => void;
}) {
  const at = point ?? layout;
  const pos = isoProject(at);
  return <button className={`${s.agent} ${s[`speech_${layout.speechSide ?? "center"}`]} ${active ? s.agentActive : ""} ${selected ? s.agentSelected : ""}`} style={{ left: `${pos.left}%`, top: `${pos.top}%`, zIndex: 300 + Math.round((at.x + at.y) * 2), "--hair": layout.hair, "--outfit": layout.outfit, "--skin": layout.skin, "--label-x": `${layout.labelDx ?? 0}px`, "--label-y": `${layout.labelDy ?? 0}px` } as React.CSSProperties} onClick={onSelect} aria-label={`${agent.name}、${agent.role}、状態 ${agent.status}`}>
    {(speech || active) && <span className={s.speech}><Sparkles size={9} />{speech ?? agent.speech}</span>}
    <span className={s.person} aria-hidden="true">
      <i className={s.shadow} /><i className={s.legLeft} /><i className={s.legRight} /><i className={s.body}><b>AI</b></i>
      <i className={s.armLeft} /><i className={s.armRight} /><i className={s.head}><b className={s.hair} /></i>
      {layout.accessory !== "none" && <i className={`${s.accessory} ${s[`a_${layout.accessory}`]}`} />}
    </span>
    <span className={s.nameplate}><strong>{shortLabels[agent.id] ?? agent.shortName}</strong><small>{active ? "移動・連携中" : agent.status}</small></span>
  </button>;
}
