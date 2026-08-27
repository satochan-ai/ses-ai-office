# SES AI Office プロジェクト固有ルール

## 1. プロジェクトの目的と概要
SES営業・採用・BP開拓・案件マッチング・稼働フォローを、複数の架空「AI社員」が分担して支援する仮想オフィスのフロントエンドMVP / デモ画面です。
UI上の「AI社員」「実行」「連携」は画面表現およびシナリオシミュレーションであり、実業務システムや自動エージェント実行基盤ではありません。

---

## 2. フロントエンドMVP / モック境界
1. **未実装機能の前提禁止**:
   - 以下のバックエンド・外部連携機能は存在しません。実装済みと誤認・推測してコードを追加しないでください。
     - 実LLM連携（OpenAI, Anthropic, Gemini API等）
     - CRM / メール / カレンダー / Slack連携
     - リアルタイム同期（WebSocket, Socket.io, Pusher）
     - データベース（Supabase, Firebase, PostgreSQL等）
     - 認証・権限管理（NextAuth, Supabase Auth等）
     - サーバーサイド自動業務実行基盤
2. **モックデータの扱い**:
   - 業務データ（企業・案件・要員・タスク・KPI・活動ログ等）は `data/*.ts` を中心とする完全なモックデータです。
3. **実データの混入厳禁**:
   - 実社員名、実顧客名、実案件、実要員情報、実単価、実連絡先等を、mock data、fixture、ソースコード、README、Git、ログ、AI完了報告に転記・記載しないでください。テスト・デモには架空データを使用します。

---

## 3. 正式ルートと画面構成の保護
1. **正式ルート（標準画面）**:
   - **`/`** (`app/page.tsx` → `VisualOffice`): ビジュアルAIオフィス
   - **`/dashboard`** (`app/dashboard/page.tsx` → `Dashboard`): 管理Dashboard
2. **ルート変更の禁止**:
   - READMEおよび現行ナビゲーションに基づく上記2系統を正式ルートとして保護してください。
   - 実験・比較用ルート（`/office-v2`, `/office-v3-claude`, `/office-v3-codex`）を勝手にトップページ（`/`）や標準画面へ昇格・置換しないでください。

---

## 4. Office世代（Version）の分離管理
本リポジトリには複数のOffice世代が存在します。

- **V1 (`/`)**: 正式VisualOffice（部屋分割型、7名のAI社員、デモ連携）
- **V2 (`/office-v2`)**: 1フロア統合型アイソメトリックプロトタイプ
- **V3 Claude (`/office-v3-claude`)**: Claude生成ラインによるV3比較実装
- **V3 Codex (`/office-v3-codex`)**: Codex生成ラインによる未追跡WIP

### 世代間の厳格な規律
- 世代間の無断マージ、CSS一括共通化、型の無断統合、レイアウトデータの混在を禁止します。
- 「コードが重複している」という理由で他世代を削除したり、一方の実装を他方へコピーして比較性を壊さないでください。
- 変更指示があった世代のみを対象に作業してください。

---

## 5. `office-v3-codex` WIPの保護（一時的状態）
現在、以下の9ファイルは未コミットのWIP（Work In Progress）です：
- `app/office-v3-codex/page.tsx`
- `components/office-v3-codex/AgentDetailPanel.tsx`
- `components/office-v3-codex/CodexOfficeV3.tsx`
- `components/office-v3-codex/OfficeAgent.tsx`
- `components/office-v3-codex/OfficeFurniture.tsx`
- `components/office-v3-codex/OfficeScene.tsx`
- `components/office-v3-codex/OfficeV3.module.css`
- `data/officeV3CodexLayout.ts`
- `types/officeV3Codex.ts`

- これらを指示なく編集、削除、リネーム、stage、commit、reset、restore、cleanしないでください。
- ※本一覧は現在のGit状態に基づく一時的な保護指定であり、将来正式commitされた際に見直し対象となります。

---

## 6. メンバーStatusとデモシナリオの保護
1. **Statusの意味**:
   - `idle`, `working`, `communicating`, `completed` などの状態値は、アバター色、アニメーションCSS、吹き出し、デモシナリオ進行、Dashboard活動ログと強く連動しています。
   - UIの見た目都合だけでstatus名を変更・削除・統合したり、業務状態の意味を変更しないでください。
2. **デモシナリオ・Interaction**:
   - AI社員間の連携デモでは、タイマー（`setTimeout`, `requestAnimationFrame`）、React state、`sessionStorage`、アニメーション、Handoff（受け渡し）が連動しています。
   - デモ進行ロジック（開始・一時停止・再開・速度変更・リセット等）を不用意に変更しないでください。

---

## 7. Web Storageの利用方針
1. **`sessionStorage`**: デモ実行状態・結果の一時保存（例: `ai_office_demo_result`）。タブを閉じると消える一時キャッシュです。
2. **`localStorage`**: 初回ガイド既読フラグ等の軽量なUI状態管理。
3. **禁止事項**:
   - `localStorage.clear()` / `sessionStorage.clear()` の無差別実行
   - Storageキーやスキーマの無断変更
   - 実業務データ・機密情報の保存
   - Web Storageを恒久的なデータベース代替として拡張すること

---

## 8. デザインシステムとスタイリング
1. **スタイリング技術**: Vanilla CSS / CSS Modules (`*.module.css`) + `app/globals.css`。
   - Tailwind CSSは導入されていません。無断追加しないでください。
2. **CSSのスコープ分離**: 各世代で独立したCSS Modulesを使用しているため、一括統合や無断のグローバル化を行わないでください。
3. **デザイントークン**: カラーや変数は `app/globals.css` のCSSカスタムプロパティを尊重してください。
4. **アセット方針**: 実社員写真や外部画像アセットには依存せず、CSS、SVG、Lucide Reactアイコンで描画します。勝手に外部画像や実人物画像を追加しないでください。

---

## 9. Next.js / アーキテクチャ境界
1. **App Router / Client Component**:
   - 状態管理、ブラウザイベント、Web Storage、アニメーションを扱うコンポーネント（`VisualOffice.tsx`, `Dashboard.tsx`, `IsometricOffice.tsx` 等）は `"use client"` を明記した Client Component です。
   - 一般論のみで `"use client"` を削除しないでください。
2. **Server機能の勝手な追加禁止**:
   - 現状 Route Handler (`app/api/*`) や Server Action は存在しません。指示なくServer機能を追加しないでください。

---

## 10. 開発・検証コマンド
`package.json` に定義されている実在スクリプトのみを使用してください：
- **開発サーバー起動**: `npm run dev`（ポート `3003` 固定で起動）
- **リント検証**: `npm run lint`
- **ビルド検証**: `npm run build`
- **本番プレビュー**: `npm run start`（ポート `3003`）

※ `test` スクリプトは存在しません。`npm test` や存在しないコマンドを推測実行しないでください。
※ コード変更時は `npm run lint` および `npm run build` で検証を行ってください。

---

## 11. Git運用規律
1. **ブランチ・履歴保護**:
   - 現在の `main` ブランチのローカル先行コミット（`ahead 1`）を勝手に `reset`, `rebase`, `amend`, `squash`, `drop` しないでください。
2. **無差別操作の禁止**:
   - 未追跡のWIPが存在するため、`git add .`, `git add -A`, `git clean -fd`, `git reset --hard`, `git restore .`, `git checkout .` は実行厳禁です。
   - 変更ファイルの指定は常に個別パスを明示してください。
3. **リモート操作**:
   - ユーザーの明示的な指示がない限り、`git push`, `git fetch`, `git pull` 等のリモート通信コマンドを実行しないでください。

---

## 12. 正本管理と陳腐化防止（ルールに固定しすぎないもの）
以下の個別データ・座標値は各コード・型・データファイルを正本とし、本ルールに数値を固定しません：
- 各世代のAI社員の人数・個別プロパティ詳細
- 家具・デスク・座席の座標データ（`data/officeLayout.ts`, `data/officeV2Layout.ts`, `data/officeV3ClaudeLayout.ts` 等）
- デモシナリオの個別秒数や詳細文言
- 個別コンポーネントのCSSプロパティ数値

以下の変更があった場合に本ルールファイルを見直します：
- 正式ルートやナビゲーションの変更
- Office世代の正式採用・統廃合
- 外部API / 実DB / 認証機能の正式導入
- Web Storageの役割・スキーマ変更
