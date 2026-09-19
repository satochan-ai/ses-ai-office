import { AlertTriangle, CheckCircle2, Clock3, FileQuestion, ShieldAlert, UserRound } from "lucide-react";
import type { DecisionCard, DecisionQueue, DecisionQueueBucket } from "@/types/decisionQueue";

const bucketLabels: Record<DecisionQueueBucket, string> = { needs_decision_today: "今日の判断", execution_failed: "実行失敗", overdue: "期限超過", awaiting_approval: "承認待ち", missing_info: "情報不足・条件確認", awaiting_human: "人間対応待ち" };
const verdictLabels = { fit: "適合", unfit: "不適合", unknown: "要確認" } as const;
const intentLabels = { confirmed: "確認済み", declined: "見送り", unknown: "未確認", stale: "再確認必要" } as const;
const duplicateLabels = { none: "重複なし", possible: "重複可能性あり", confirmed: "重複あり", unknown: "未確認" } as const;
const routeLabels = { clear: "経路確認済み", unknown: "経路未確認", conflict: "経路矛盾" } as const;
const startLabels = { matched: "開始日一致", mismatched: "開始日不一致", unknown: "開始日未確認" } as const;
const disclosureLabels = { defined: "開示範囲確認済み", restricted: "開示範囲制限", unknown: "開示範囲未確認" } as const;
const severityLabels = { critical: "緊急", warning: "要確認", normal: "通常" } as const;
const bucketIcon = { execution_failed: ShieldAlert, overdue: Clock3, awaiting_approval: AlertTriangle, missing_info: FileQuestion, awaiting_human: UserRound } as const;

function ProposalSummary({ card }: { card: DecisionCard }) {
  const d = card.proposalDecision; if (!d) return null;
  return <div className="decision-proposal"><span className={`decision-verdict verdict-${d.verdict}`}>{verdictLabels[d.verdict]}</span><span>本人意向：{intentLabels[d.intentStatus]}</span><span>{duplicateLabels[d.duplicateStatus]}</span><span>{routeLabels[d.routeStatus]}</span><span>{startLabels[d.startDateStatus]}</span><span>{disclosureLabels[d.disclosureStatus]}</span></div>;
}
function DecisionCardView({ card }: { card: DecisionCard }) {
  const Icon = bucketIcon[card.bucket as keyof typeof bucketIcon] ?? UserRound;
  return <article className={`decision-card decision-${card.severity}`}><header><div className="decision-card-title"><Icon size={15} aria-hidden="true" /><strong>{card.title}</strong></div><div className="decision-card-badges"><span className={`decision-severity severity-${card.severity}`}>{severityLabels[card.severity]}</span>{card.isDemo && <span className="decision-demo-badge">Demo</span>}</div></header><div className="decision-card-meta"><span>{bucketLabels[card.bucket]}</span><span>{card.statusLabel}</span>{card.dueAt && <span><Clock3 size={11} />期限 {card.dueAt.slice(0, 10)}</span>}</div>{card.requiredHumanAction && <p className="decision-action"><b>次の対応：</b>{card.requiredHumanAction}</p>}<ProposalSummary card={card} />{card.reasonSummary.length > 0 && <ul className="decision-reasons">{card.reasonSummary.slice(0, 3).map(reason => <li key={reason}>{reason}</li>)}{card.reasonSummary.length > 3 && <li>ほか{card.reasonSummary.length - 3}件</li>}</ul>}</article>;
}
export default function DecisionQueuePanel({ queue }: { queue: DecisionQueue }) {
  return <section className="panel decision-queue-panel" aria-labelledby="decision-queue-title"><div className="panel-head"><div><h2 id="decision-queue-title">あなたの判断が必要な項目</h2><p>案件と人材の提案準備に関する人間タスク</p></div><span className="decision-today-count">今日の判断 {queue.needsDecisionTodayCount}件</span></div>{queue.cards.length === 0 ? <div className="decision-empty"><CheckCircle2 size={18} />現在、確認が必要な項目はありません</div> : <div className="decision-card-grid">{queue.cards.map(card => <DecisionCardView key={card.workItemId} card={card} />)}</div>}</section>;
}
