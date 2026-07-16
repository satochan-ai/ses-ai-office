import type { OfficeAction, OfficeAgent, OfficeAlert } from "@/types/office";

export const officeAgents: OfficeAgent[] = [
  {
    id: "manager", name: "AI営業Mgr", shortName: "Mgr", room: "営業戦略室", floor: "upper", accent: "navy", status: "稼働中",
    role: "営業全体を見渡し、今日動くべき仕事を割り振る司令塔", currentTask: "本日の最優先企業を整理中", speech: "A社への増員確認を最優先にしましょう",
    progress: 82, result: "対応優先5件を整理", pending: 3, metrics: ["対応優先 5件", "要確認 3件"],
    duties: ["SES営業全体の優先順位管理", "顧客・案件・要員・採用の統合判断", "停滞・リスク・商機の検知"],
    history: ["全AI社員の優先順位を更新", "未設定アクション3件を検知", "本日の営業方針を作成"], decoration: "strategy",
  },
  {
    id: "analytics", name: "AI分析担当", shortName: "分析", room: "営業分析室", floor: "upper", accent: "teal", status: "分析中",
    role: "営業・採用ファネルを横断し、停滞ポイントを見つける", currentTask: "提案NG理由を集計中", speech: "商談化率は22%。返信後に停滞しています",
    progress: 68, result: "停滞ポイント3件を特定", pending: 2, metrics: ["商談化率 22%", "停滞 3件"],
    duties: ["新規開拓ファネル分析", "提案・面談・成約率分析", "採用歩留まり・NG理由集計"],
    history: ["2回目商談化率を更新", "提案NG理由を分類", "顧客接点強度を分析"], decoration: "analytics",
  },
  {
    id: "newbiz", name: "AI新規開拓担当", shortName: "新規", room: "新規顧客開拓室", floor: "lower", accent: "pink", status: "分析中",
    role: "新しい顧客候補を調べ、最初の接点づくりを支援する", currentTask: "顧客候補42社を分析中", speech: "未返信企業を5社検知しました",
    progress: 70, result: "優先候補8社を抽出", pending: 5, metrics: ["優先候補 8社", "送信予定 5件"],
    duties: ["新規顧客候補の抽出・調査", "アプローチ優先順位の判定", "初回・再アプローチ文面作成"],
    history: ["顧客候補20社を追加調査", "初回メール5件を下書き", "未返信企業を抽出"], decoration: "search",
  },
  {
    id: "bp", name: "AIBP開拓担当", shortName: "BP", room: "BPアライアンス室", floor: "lower", accent: "green", status: "稼働中",
    role: "BP企業の得意領域と商流を整理し、関係構築を進める", currentTask: "BP候補18社を分析中", speech: "情報交換を提案したいBPが6社あります",
    progress: 61, result: "有望BP6社を選定", pending: 2, metrics: ["交換候補 6社", "接点低下 2社"],
    duties: ["新規BP候補の抽出", "得意領域・商流・保有人材整理", "既存BPの関係性低下検知"],
    history: ["BP候補の商流を整理", "情報交換先6社を選定", "接点低下2社を検知"], decoration: "network",
  },
  {
    id: "matching", name: "AIマッチング担当", shortName: "Match", room: "マッチング室", floor: "lower", accent: "purple", status: "分析中",
    role: "案件と要員を照合し、提案可能性の高い組み合わせを作る", currentTask: "案件18件 × 要員32名を照合中", speech: "提案候補を7件抽出しました",
    progress: 76, result: "提案候補7件を抽出", pending: 2, metrics: ["提案候補 7件", "要確認 2件"],
    duties: ["案件と要員の照合", "必須条件・不足スキル判定", "推薦文の下書き作成"],
    history: ["Java案件の候補者を比較", "不足スキルを2件検知", "推薦文3件を作成"], decoration: "matching",
  },
  {
    id: "recruit", name: "AI採用担当", shortName: "採用", room: "採用室", floor: "lower", accent: "orange", status: "確認待ち",
    role: "応募・スカウトから面談まで、採用活動の停滞を防ぐ", currentTask: "スカウト候補56名を整理中", speech: "選考停滞者が3名います",
    progress: 58, result: "面談準備4件を完了", pending: 3, metrics: ["本日面談 4件", "停滞 3名"],
    duties: ["応募者・選考進捗管理", "スカウト候補と文面作成", "面談準備・停滞検知"],
    history: ["スカウト候補56名を整理", "面談資料4件を準備", "停滞候補者3名を検知"], decoration: "recruit",
  },
  {
    id: "follow", name: "AIフォロー担当", shortName: "Follow", room: "稼働フォロー室", floor: "lower", accent: "cyan", status: "要対応",
    role: "稼働中エンジニアの不安や契約更新リスクを早期に捉える", currentTask: "稼働中128名を確認", speech: "契約更新の確認が4件あります",
    progress: 64, result: "要フォロー6名を抽出", pending: 4, metrics: ["要フォロー 6名", "更新確認 4件"],
    duties: ["週報・勤務表確認", "契約更新確認", "不満兆候・退場リスク検知"],
    history: ["週報32件を確認", "要フォロー6名を抽出", "更新対象4件を通知"], decoration: "follow",
  },
];

export const officeActions: OfficeAction[] = [
  { id: 1, title: "A社へ増員ニーズを確認", owner: "AI営業Mgr" },
  { id: 2, title: "B社へ提案結果を確認", owner: "AI営業Mgr" },
  { id: 3, title: "新規BP候補3社へ情報交換を打診", owner: "AIBP開拓担当" },
];

export const officeAlerts: OfficeAlert[] = [
  { label: "返信停滞", value: "4社", severity: "warning" },
  { label: "次回アクション未設定", value: "3社", severity: "critical" },
  { label: "契約更新確認", value: "4件", severity: "warning" },
  { label: "稼働フォロー必要", value: "6名", severity: "warning" },
];

export const officeStatusBadges = ["新規顧客候補 42", "提案候補 7", "面談予定 14", "採用選考中 36", "要フォロー 6"];
