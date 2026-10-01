"use client";
import type { WorkItem } from "@/types/workItem";
import type { Approval } from "@/types/approval";
import { projectAgentActivity, type ActivityFrame } from "@/lib/visual-office/agentActivity";
import s from "./OfficeV3.module.css";
import { NEW_CLIENT_DRAFT, BP_PREPARATION_MEMO, CANDIDATE_MEMO, VISUAL_DEMO_SCENARIOS } from "@/lib/application/visualOfficeHumanLoopDemo";
const LABELS = { idle: "待機", working: "作業中", handoff: "引き継ぎ", waiting_human: "Human待ち", reviewing: "確認中", completed: "完了" };
export default function HumanLoopDemoPanel({ scenarioId, onScenarioChange, item, approval, frame, playing, busy, error, frames, names, onStart, onOpen, onReplay }: { scenarioId: string; onScenarioChange: (id: string) => void; item?: WorkItem; approval?: Approval; frame?: ActivityFrame; playing: boolean; busy: boolean; error: string | null; frames: ActivityFrame[]; names: Record<string, string>; onStart: () => void; onOpen: () => void; onReplay: () => void }) {
  const live = projectAgentActivity(item, approval), shown = playing && frame ? frame : live;
  const open = item?.missingInfo.filter(info => info.status === "open") ?? [];
  return <section className={s.humanLoopDemo} aria-label="AI引き継ぎ・Human質問デモ">
    <div className={s.humanLoopDemoHeading}><strong>AI業務デモ</strong><small>架空データ・外部送信なし</small></div>
    <label>業務シナリオ <select value={scenarioId} disabled={busy} onChange={event => onScenarioChange(event.target.value)}>{VISUAL_DEMO_SCENARIOS.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.title}</option>)}</select></label>
    <p>{VISUAL_DEMO_SCENARIOS.find(scenario => scenario.id === scenarioId)?.description}</p>
    <p>{scenarioId === "candidate" ? "候補者整理 → 本人意向をHumanへ確認 → 面談確認メモ → Human確認" : scenarioId === "bp" ? "BP情報整理 → 営業Mgrへ引き継ぎ → 面談準備 → Human確認" : scenarioId === "outreach" ? "企業整理 → 接点確認 → 文案準備 → Human確認" : "案件整理 → 候補者比較 → Human回答 → 提案準備 → Human確認"}</p>
    {!item ? <button type="button" disabled={busy} onClick={onStart}>AI業務デモを開始</button> : <>
      <div className={s.humanLoopActivity} role="status" aria-live="polite"><b>{LABELS[shown.activity]}</b><strong>{shown.agentId ? names[shown.agentId] : "Human"}</strong><span>{shown.text}</span></div>
      {playing ? <small>Demo工程を再生中。保存済み状態：{live.text}</small> : null}
      {playing && frame?.handoff ? <p className={s.humanLoopHandoff}>{names[frame.handoff.from]} → {names[frame.handoff.to]}</p> : null}
      {!playing && open.length ? <div className={s.humanLoopQuestion}><strong>{live.agentId ? names[live.agentId] : "AIマッチング担当"}からHumanへ確認</strong><p>{open[0].question}</p><button type="button" disabled={busy} onClick={onOpen}>確認・回答する</button></div> : null}
      {item.id === "wi-demo-visual-candidate" ? <div className={s.humanLoopQuestion}>
        <strong>{CANDIDATE_MEMO.name}（架空候補者・固定Demo）</strong>
        <p>主なスキル：{CANDIDATE_MEMO.skills}</p><p>経験：{CANDIDATE_MEMO.experience}</p>
        <p>希望条件：{CANDIDATE_MEMO.preference}</p><p>稼働開始：{CANDIDATE_MEMO.availability}</p><p>常駐可否：{CANDIDATE_MEMO.onsite}</p>
        <strong>本人意向：{item.candidateContext?.personIntent.status === "confirmed" ? "参画意向あり（Human回答保存済み）" : item.candidateContext?.personIntent.status === "declined" ? "辞退" : "未確認"}</strong>
        {item.candidateContext?.personIntent.status === "declined" ? <p>このDemoでは準備を進めません。</p> : null}
        <details><summary>確認済み情報・未確認情報</summary>
          <strong>確認済み情報（架空設定）</strong><ul>{CANDIDATE_MEMO.confirmed.map(value => <li key={value}>{value}</li>)}</ul>
          <strong>未確認情報</strong><ul>{CANDIDATE_MEMO.unknown.map(value => <li key={value}>{value}</li>)}</ul>
          {item.candidateContext?.personIntent.status === "unknown" ? <p>本人意向は未確認です。AIは推測せずHumanへ確認します。</p> : null}
        </details>
        {item.currentDeliverableId ? <details><summary>面談確認メモ（準備のみ）</summary>
          <strong>確認済み情報（架空設定）</strong><ul>{CANDIDATE_MEMO.confirmed.map(value => <li key={value}>{value}</li>)}</ul>
          <strong>未確認情報</strong><ul>{CANDIDATE_MEMO.unknown.map(value => <li key={value}>{value}</li>)}</ul>
          <p>本人意向：参画意向あり（Human回答）</p>
          <strong>面談で確認する質問</strong><ul>{CANDIDATE_MEMO.questions.map(value => <li key={value}>{value}</li>)}</ul>
          <strong>提案前のHuman確認事項</strong><ul>{CANDIDATE_MEMO.checks.map(value => <li key={value}>{value}</li>)}</ul>
        </details> : null}
        <p>Approveは面談確認メモの内容をHuman確認済みにする操作です。採用承認・面談確定・案件提案・外部連絡の許可ではありません。Rejectはメモの修正が必要という意味です。</p>
      </div> : null}
      {item.kind === "new-client-outreach" ? <div className={s.humanLoopQuestion}>
        <strong>未送信・準備のみ（固定Demo文案）</strong>
        <p>{NEW_CLIENT_DRAFT.company}／{NEW_CLIENT_DRAFT.industry}</p><p>想定ニーズ：{NEW_CLIENT_DRAFT.need}</p><p>確認した接点：{NEW_CLIENT_DRAFT.contact}</p>
        <strong>件名：{NEW_CLIENT_DRAFT.subject}</strong>
        <p>{NEW_CLIENT_DRAFT.body.map(line => <span key={line}>{line}<br /></span>)}</p>
        <strong>確認事項・注意</strong><ul>{NEW_CLIENT_DRAFT.checks.map(check => <li key={check}>{check}</li>)}</ul>
        <p>この確認は送信許可ではありません。準備した文案の内容確認です。Rejectは修正・再作業を意味します。</p>
      </div> : null}
      {item.kind === "bp-alliance" ? <div className={s.humanLoopQuestion}>
        <strong>面談準備のみ・未予約・未送信（固定Demo）</strong>
        <p>{BP_PREPARATION_MEMO.company}</p><p>得意領域：{BP_PREPARATION_MEMO.specialty}</p>
        <p>要員傾向：{BP_PREPARATION_MEMO.people}</p><p>案件傾向：{BP_PREPARATION_MEMO.projects}</p><p>過去接点・関係：{BP_PREPARATION_MEMO.history}</p>
        <details><summary>協業候補として整理した理由・面談準備メモ</summary>
          <strong>整理した理由</strong><ul>{BP_PREPARATION_MEMO.reasons.map(value => <li key={value}>{value}</li>)}</ul>
          <strong>協業テーマ</strong><ul>{BP_PREPARATION_MEMO.themes.map(value => <li key={value}>{value}</li>)}</ul>
          <strong>当日確認したい質問</strong><ul>{BP_PREPARATION_MEMO.questions.map(value => <li key={value}>{value}</li>)}</ul>
          <strong>相手に伝える内容案</strong><ul>{BP_PREPARATION_MEMO.share.map(value => <li key={value}>{value}</li>)}</ul>
          <strong>開示を避ける情報</strong><ul>{BP_PREPARATION_MEMO.avoid.map(value => <li key={value}>{value}</li>)}</ul>
        </details>
        <p>準備メモの内容確認です。面談予約・紹介・外部送信の許可ではありません。Rejectはメモの修正・再作業を意味します。</p>
      </div> : null}
      {!playing && !open.length ? <button type="button" disabled={busy} onClick={onOpen}>{approval?.state === "pending" ? "Human確認を開く" : "保存済みの仕事を確認"}</button> : null}
      {!playing && frames.length ? <button type="button" disabled={busy} onClick={onReplay}>工程をもう一度見る</button> : null}
      {frames.some(f => f.handoff) ? <details><summary>今回の引き継ぎ履歴</summary><ul>{frames.filter(f => f.handoff).map((f, i) => <li key={i}>{names[f.handoff!.from]} → {names[f.handoff!.to]}：引き継ぎ済み</li>)}</ul></details> : null}
    </>}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
