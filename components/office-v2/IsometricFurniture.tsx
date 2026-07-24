import { BookOpen, ChartNoAxesCombined, FileText, Headphones, Network, Sparkles, UsersRound } from "lucide-react";
import type { V2Furniture } from "@/types/officeV2";
import { isoProject } from "@/data/officeV2Layout";
import s from "./IsometricOffice.module.css";

const icons = {
  desk: FileText, command: Sparkles, screens: ChartNoAxesCombined, shelf: BookOpen,
  phone: Headphones, network: Network, cards: UsersRound, sofa: UsersRound,
  board: FileText, meeting: UsersRound, reception: Sparkles, plant: Sparkles,
};

export default function IsometricFurniture({ item }: { item: V2Furniture }) {
  const Icon = icons[item.kind];
  const pos = isoProject(item);
  return <div className={`${s.furniture} ${s[`f_${item.kind}`]}`} style={{ left: `${pos.left}%`, top: `${pos.top}%`, zIndex: Math.round((item.x + item.y) * 2), "--accent": item.accent ?? "#66877a" } as React.CSSProperties} aria-label={item.label}>
    {item.kind === "plant" ? <><i /><i /><b /></> : <><span className={s.furnitureTop}><Icon size={13} /><b>{item.label}</b></span><span className={s.furnitureFace} /></>}
  </div>;
}
