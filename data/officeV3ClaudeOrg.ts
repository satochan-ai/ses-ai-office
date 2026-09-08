import type { V3AgentProfile, V3Department, V3Floor } from "@/types/officeV3ClaudeOrg";

/**
 * V3 Claude版の組織データ（フロア／部署／AI社員プロフィール）。
 *
 * 目的：現行13名を「将来の3層・複数人部署」構造へ写像し、拡張の土台にする。
 * 今回は UI・レイアウト・人数・配置・カメラ・officeOrgFlow・デモへ一切接続しない。
 *
 * 文言の出所（このファイルは転記。原本を変更したら手動で同期すること）：
 *   - 実務11名（manager〜knowledge）: data/office.ts の officeAgents
 *   - quality / strategist: data/officeV3ClaudeAgents.ts の v3ClaudeOnlyAgents
 *   - V3Department.completesHere: data/officeOrgFlow.ts の FIELD_AGENT_DELIVERABLES
 *     ／ quality・strategist は上記2名の finalDeliverables
 *
 * 人間責任者席（data/officeV3ClaudeLayout.ts の v3HumanSeat / 型 V3HumanSeat）は
 * AI社員ではないため、v3Floors の所属にも v3Departments にも v3AgentProfiles にも含めない。
 * AI社員数の集計対象にもしない。
 */

/* ------------------------------------------------------------------ */
/* フロア（3層）                                                        */
/* ------------------------------------------------------------------ */

export const v3Floors: V3Floor[] = [
  {
    id: "1f",
    name: "実務フロア",
    caption: "FIELD OPERATIONS",
    role: "外部への一次アクションと実務処理",
    order: 1,
  },
  {
    id: "2f",
    name: "支援・管理フロア",
    caption: "SUPPORT & CONTROL",
    role: "分析・品質・管理・支援",
    order: 2,
  },
  {
    id: "3f",
    name: "経営・統括フロア",
    caption: "EXECUTIVE",
    role: "集約・優先順位・最終判断",
    order: 3,
  },
];

/* ------------------------------------------------------------------ */
/* 部署（現行13名を3層へ割り当て。各部署の所属は現在1名）                 */
/* ------------------------------------------------------------------ */

export const v3Departments: V3Department[] = [
  /* --- 1F: 実務フロア --- */
  {
    id: "new-business", name: "AI新規開拓", floorId: "1f",
    purpose: "新しい顧客候補を調べ、最初の接点づくりを支援する",
    leadAgentId: "newbiz",
    completesHere: ["初回・再アプローチ文面・優先候補企業リスト"],
    sendsUp: ["一次成果物を支援・管理フロア(2F)へ提出する"],
    sendsDown: [],
  },
  {
    id: "bp-alliance", name: "AIBP開拓", floorId: "1f",
    purpose: "BP企業の得意領域と商流を整理し、関係構築を進める",
    leadAgentId: "bp",
    completesHere: ["BP候補選定リスト・商流整理メモ"],
    sendsUp: ["一次成果物を支援・管理フロア(2F)へ提出する"],
    sendsDown: [],
  },
  {
    id: "matching", name: "AIマッチング", floorId: "1f",
    purpose: "案件と要員を照合し、提案可能性の高い組み合わせを作る",
    leadAgentId: "matching",
    completesHere: ["提案候補リスト・推薦文下書き"],
    sendsUp: ["一次成果物を支援・管理フロア(2F)へ提出する"],
    sendsDown: [],
  },
  {
    id: "recruiting", name: "AI採用", floorId: "1f",
    purpose: "応募・スカウトから面談まで、採用活動の停滞を防ぐ",
    leadAgentId: "recruit",
    completesHere: ["スカウト文面・面談準備資料"],
    sendsUp: ["一次成果物を支援・管理フロア(2F)へ提出する"],
    sendsDown: [],
  },
  {
    id: "follow", name: "AIフォロー", floorId: "1f",
    purpose: "稼働中エンジニアの不安や契約更新リスクを早期に捉える",
    leadAgentId: "follow",
    completesHere: ["週報確認結果・要フォロー対象一覧"],
    sendsUp: ["一次成果物を支援・管理フロア(2F)へ提出する"],
    sendsDown: [],
  },
  {
    id: "client-relation", name: "AI顧客リレーション", floorId: "1f",
    purpose: "既存顧客の接点履歴から関係性・商機・次回アクションを整える",
    leadAgentId: "relation",
    completesHere: ["顧客関係性整理メモ・次回アクション案"],
    sendsUp: ["一次成果物を支援・管理フロア(2F)へ提出する"],
    sendsDown: [],
  },

  /* --- 2F: 支援・管理フロア --- */
  {
    id: "analytics", name: "AI分析", floorId: "2f",
    purpose: "営業・採用ファネルを横断し、停滞ポイントを見つける",
    leadAgentId: "analytics",
    completesHere: ["ファネル分析レポート・停滞ポイント一覧"],
    sendsUp: ["検査・整形済みの情報を経営・統括フロア(3F)へ渡す"],
    sendsDown: ["更新した基準・指摘を実務フロア(1F)へ戻す"],
  },
  {
    id: "proposal-support", name: "AI提案・面談支援", floorId: "2f",
    purpose: "推薦文・企業分析・面談質問を整え、提案と面談の質を高める",
    leadAgentId: "proposal",
    completesHere: ["推薦文・企業分析・面談質問リスト"],
    sendsUp: ["検査・整形済みの情報を経営・統括フロア(3F)へ渡す"],
    sendsDown: ["更新した基準・指摘を実務フロア(1F)へ戻す"],
  },
  {
    id: "quality", name: "AI品質管理", floorId: "2f",
    purpose: "品質検査官",
    leadAgentId: "quality",
    completesHere: ["品質チェック結果", "修正指示", "人間確認対象一覧", "品質スコア"],
    sendsUp: ["合格・人間確認対象を経営・統括フロア(3F)へ渡す"],
    sendsDown: ["差し戻し・修正指示を実務フロア(1F)へ戻す"],
  },
  {
    id: "contract", name: "AI契約・請求管理", floorId: "2f",
    purpose: "契約更新・勤務表・請求・入金を確認し、期限と差分を管理する",
    leadAgentId: "contract",
    completesHere: ["契約更新確認結果・請求照合結果"],
    sendsUp: ["検査・整形済みの情報を経営・統括フロア(3F)へ渡す"],
    sendsDown: ["更新した基準・指摘を実務フロア(1F)へ戻す"],
  },
  {
    id: "knowledge", name: "AI教育・ナレッジ", floorId: "2f",
    purpose: "成約・失注事例と判断基準を教材化し、営業チームへ共有する",
    leadAgentId: "knowledge",
    completesHere: ["教材化された事例・ナレッジ更新内容"],
    sendsUp: ["検査・整形済みの情報を経営・統括フロア(3F)へ渡す"],
    sendsDown: ["更新した基準・テンプレを実務フロア(1F)へ戻す"],
  },

  /* --- 3F: 経営・統括フロア --- */
  {
    id: "management", name: "AI営業Mgr", floorId: "3f",
    purpose: "営業全体を見渡し、今日動くべき仕事を割り振る司令塔",
    leadAgentId: "manager",
    completesHere: ["本日の優先順位方針・全体アクション一覧"],
    sendsUp: ["全体進行報告を人間責任者席へ渡す"],
    sendsDown: ["配分指示・方針を下階へ渡す"],
  },
  {
    id: "strategy", name: "AI経営参謀", floorId: "3f",
    purpose: "経営集約・戦略立案官",
    leadAgentId: "strategist",
    completesHere: ["経営サマリー", "優先アクション", "リスク一覧", "経営判断案"],
    sendsUp: ["判断案・人間確認案件を人間責任者席へ渡す"],
    sendsDown: ["重点テーマ・方針を下階へ渡す"],
  },
];

/* ------------------------------------------------------------------ */
/* AI社員プロフィール（現行13名の転記。人間責任者席は含めない）           */
/*   実務11名: data/office.ts ／ quality・strategist: data/officeV3ClaudeAgents.ts */
/* ------------------------------------------------------------------ */

export const v3AgentProfiles: V3AgentProfile[] = [
  {
    id: "manager", deptId: "management", name: "AI営業Mgr",
    role: "営業全体を見渡し、今日動くべき仕事を割り振る司令塔",
    isLead: true,
    currentTask: "本日の最優先企業を整理中",
    duties: ["SES営業全体の優先順位管理", "顧客・案件・要員・採用の統合判断", "停滞・リスク・商機の検知"],
    history: ["全AI社員の優先順位を更新", "未設定アクション3件を検知", "本日の営業方針を作成"],
  },
  {
    id: "analytics", deptId: "analytics", name: "AI分析担当",
    role: "営業・採用ファネルを横断し、停滞ポイントを見つける",
    isLead: true,
    currentTask: "提案NG理由を集計中",
    duties: ["新規開拓ファネル分析", "提案・面談・成約率分析", "採用歩留まり・NG理由集計"],
    history: ["2回目商談化率を更新", "提案NG理由を分類", "顧客接点強度を分析"],
  },
  {
    id: "newbiz", deptId: "new-business", name: "AI新規開拓担当",
    role: "新しい顧客候補を調べ、最初の接点づくりを支援する",
    isLead: true,
    currentTask: "顧客候補42社を分析中",
    duties: ["新規顧客候補の抽出・調査", "アプローチ優先順位の判定", "初回・再アプローチ文面作成"],
    history: ["顧客候補20社を追加調査", "初回メール5件を下書き", "未返信企業を抽出"],
  },
  {
    id: "bp", deptId: "bp-alliance", name: "AIBP開拓担当",
    role: "BP企業の得意領域と商流を整理し、関係構築を進める",
    isLead: true,
    currentTask: "BP候補18社を分析中",
    duties: ["新規BP候補の抽出", "得意領域・商流・保有人材整理", "既存BPの関係性低下検知"],
    history: ["BP候補の商流を整理", "情報交換先6社を選定", "接点低下2社を検知"],
  },
  {
    id: "matching", deptId: "matching", name: "AIマッチング担当",
    role: "案件と要員を照合し、提案可能性の高い組み合わせを作る",
    isLead: true,
    currentTask: "案件18件 × 要員32名を照合中",
    duties: ["案件と要員の照合", "必須条件・不足スキル判定", "推薦文の下書き作成"],
    history: ["Java案件の候補者を比較", "不足スキルを2件検知", "推薦文3件を作成"],
  },
  {
    id: "recruit", deptId: "recruiting", name: "AI採用担当",
    role: "応募・スカウトから面談まで、採用活動の停滞を防ぐ",
    isLead: true,
    currentTask: "スカウト候補56名を整理中",
    duties: ["応募者・選考進捗管理", "スカウト候補と文面作成", "面談準備・停滞検知"],
    history: ["スカウト候補56名を整理", "面談資料4件を準備", "停滞候補者3名を検知"],
  },
  {
    id: "follow", deptId: "follow", name: "AIフォロー担当",
    role: "稼働中エンジニアの不安や契約更新リスクを早期に捉える",
    isLead: true,
    currentTask: "稼働中128名を確認",
    duties: ["週報・勤務表確認", "契約更新確認", "不満兆候・退場リスク検知"],
    history: ["週報32件を確認", "要フォロー6名を抽出", "更新対象4件を通知"],
  },
  {
    id: "relation", deptId: "client-relation", name: "AI顧客リレーション担当",
    role: "既存顧客の接点履歴から関係性・商機・次回アクションを整える",
    isLead: true,
    currentTask: "長期未接触企業8社を確認中",
    duties: ["既存顧客の関係維持", "長期未接触・関係性低下の検知", "増員商機と次回アクションの整理"],
    history: ["長期未接触企業8社を抽出", "次回打ち合わせ候補を整理", "顧客関係性グラフを更新"],
  },
  {
    id: "proposal", deptId: "proposal-support", name: "AI提案・面談支援担当",
    role: "推薦文・企業分析・面談質問を整え、提案と面談の質を高める",
    isLead: true,
    currentTask: "面談予定3件の企業分析中",
    duties: ["推薦文・提案文面のレビュー", "面談企業分析と質問作成", "面談結果・NG理由の整理"],
    history: ["推薦文3件をレビュー", "面談質問12件を作成", "面談後フォロー文を準備"],
  },
  {
    id: "contract", deptId: "contract", name: "AI契約・請求管理担当",
    role: "契約更新・勤務表・請求・入金を確認し、期限と差分を管理する",
    isLead: true,
    currentTask: "今月の更新対象12件を確認中",
    duties: ["契約終了日・更新条件の確認", "勤務表・請求書の提出確認", "入金状況と契約終了リスクの検知"],
    history: ["更新対象12件を確認", "勤務表未提出2件を検知", "入金状況18件を照合"],
  },
  {
    id: "knowledge", deptId: "knowledge", name: "AI教育・ナレッジ担当",
    role: "成約・失注事例と判断基準を教材化し、営業チームへ共有する",
    isLead: true,
    currentTask: "成約事例6件を教材化中",
    duties: ["成約・失注事例の蓄積", "営業文面・判断基準の更新", "新人教育とAI共通ナレッジ管理"],
    history: ["成約事例6件を分類", "失注NG理由を教材化", "営業文面テンプレートを更新"],
  },
  {
    id: "quality", deptId: "quality", name: "AI品質管理担当",
    role: "品質検査官",
    isLead: true,
    currentTask: "提案文と分析結果の品質を確認中",
    duties: [
      "必須項目の抜け確認",
      "数値矛盾の検出",
      "誇大・断定表現の検出",
      "契約・個人情報リスクの確認",
      "合格、差し戻し、人間確認の判定",
    ],
    history: [
      "提案文8件・求人票5件・契約更新通知3件を検査",
      "表現リスク2件を検出し担当AIへ差し戻し",
      "品質スコアの判定基準を更新",
    ],
    finalDeliverables: ["品質チェック結果", "修正指示", "人間確認対象一覧", "品質スコア"],
  },
  {
    id: "strategist", deptId: "strategy", name: "AI経営参謀",
    role: "経営集約・戦略立案官",
    isLead: true,
    currentTask: "部門横断サマリーを作成中",
    duties: [
      "各部門結果の横断集約",
      "売上、採用、稼働、契約リスクの統合分析",
      "優先アクションの提示",
      "経営判断の選択肢作成",
      "翌週重点テーマの抽出",
    ],
    history: [
      "営業・採用・稼働の結果を統合し優先課題3件を整理",
      "経営判断案2件を作成",
      "契約リスクの深刻度を再評価",
    ],
    finalDeliverables: ["経営サマリー", "優先アクション", "リスク一覧", "経営判断案"],
  },
];
