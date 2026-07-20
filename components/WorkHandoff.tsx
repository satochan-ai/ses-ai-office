import type { DemoStep } from "@/types/demo";
import s from "./VisualOffice.module.css";

const handoffLabels: Record<number, string> = { 2: "案件データ", 3: "分析結果", 4: "候補者一覧", 5: "候補者3名", 6: "優先順位", 7: "推薦文" };

export function WorkHandoff({ step }: { step: DemoStep | null }) {
  if (!step || step.id === 1) return null;
  return <div className={s.workHandoff} aria-hidden="true"><span>{handoffLabels[step.id]}</span><i /></div>;
}
