"use client";
import type { projectShowcaseStep } from "@/lib/visual-office/showcaseGuide";
import s from "./OfficeV3.module.css";

export default function ShowcaseGuide({ progress, playing, paused, hasHistory, onPause, onExit, onScenario }: {
  progress: ReturnType<typeof projectShowcaseStep>; playing: boolean; paused: boolean; hasHistory: boolean;
  onPause: () => void; onExit: () => void; onScenario: (id: string) => void;
}) {
  return <div className={s.showcaseGuide} aria-label="案件マッチングのガイド">
    <div role="status" aria-live="polite">
      <strong aria-label={`6工程中${progress.step}工程目 ${progress.title}`}>{progress.step} / 6 {progress.title}</strong>
      <p>{progress.description}</p>
      {progress.rework ? <p>修正が必要です。</p> : null}
      {!hasHistory ? <p>保存済みの現在の状態を表示しています。過去の工程の演出は残っていません。</p> : playing ? <p>保存済み工程の表示演出です。{paused ? "演出は停止中です。" : ""}</p> : null}
    </div>
    <p>AI営業Mgr：案件整理 ／ AIマッチング担当：候補比較・条件確認 ／ AI提案・面談支援担当：提案準備</p>
    {progress.completed ? <>
      <strong>ガイド完了</strong>
      <p>不足情報への回答と、準備内容の確認をHumanが担当しました。</p>
      <div className={s.showcaseSummary}><div><strong>AI社員が担当</strong><p>案件整理・候補比較・条件確認・提案準備</p></div><div><strong>Humanが担当</strong><p>不足情報の回答・準備内容の確認</p></div></div>
      <div className={s.showcaseActions}><button type="button" onClick={onExit}>別のDemoを見る</button><button type="button" onClick={onExit}>通常表示へ戻る</button></div>
      <div className={s.showcaseActions}>
        <button type="button" onClick={() => onScenario("outreach")}>新規顧客アプローチ：AIが準備した未送信文案をHumanが確認</button>
        <button type="button" onClick={() => onScenario("bp")}>BP協業：協業テーマと面談準備メモをHumanが確認</button>
        <button type="button" onClick={() => onScenario("candidate")}>候補者：本人意向をHumanが確認し、AIが整理を再開</button>
      </div>
    </> : <div className={s.showcaseActions}>
      {playing ? <button type="button" onClick={onPause}>{paused ? "続ける" : "演出を止める"}</button> : null}
      <button type="button" onClick={onExit}>ガイドを終了</button>
    </div>}
  </div>;
}
