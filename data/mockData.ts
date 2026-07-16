import type { Activity, Agent, PriorityTask, Prospect, Tone } from "@/types";

export const summaries: { label: string; value: number; unit: string; note: string; tone: Tone }[] = [
  { label: "新規開拓候補", value: 42, unit: "社", note: "優先対応 10社", tone: "purple" },
  { label: "商談予定", value: 12, unit: "件", note: "本日 4件", tone: "blue" },
  { label: "新着案件", value: 18, unit: "件", note: "前日比 +5", tone: "pink" },
  { label: "提案中", value: 27, unit: "件", note: "回答待ち 8件", tone: "cyan" },
  { label: "面談予定", value: 14, unit: "件", note: "要準備 3件", tone: "orange" },
];

export const tasks: PriorityTask[] = [
  { id: 1, title: "新規顧客候補10社の優先順位付け", agent: "AI新規開拓担当", priority: "高", deadline: "10:00", status: "進行中", category: "新規開拓" },
  { id: 2, title: "商談予定企業の事前分析", agent: "AI営業Mgr", priority: "高", deadline: "11:30", status: "確認待ち", category: "顧客" },
  { id: 3, title: "返信がない顧客への再アプローチ", agent: "AI顧客管理担当", priority: "高", deadline: "14:00", status: "未着手", category: "顧客" },
  { id: 4, title: "新規BP候補への初回メール作成", agent: "AIBP開拓担当", priority: "中", deadline: "本日中", status: "進行中", category: "BP" },
  { id: 5, title: "Java案件と要員のマッチング確認", agent: "AIマッチング担当", priority: "中", deadline: "16:00", status: "進行中", category: "提案" },
  { id: 6, title: "稼働エンジニアの契約更新確認", agent: "AIフォロー担当", priority: "低", deadline: "本日中", status: "未着手", category: "稼働" },
];

export const prospects: Prospect[] = [
  { company: "株式会社アルファシステム", type: "新規顧客候補", touch: "初回メール送付済み", field: "Java・クラウド", next: "電話フォロー", due: "本日", agent: "AI新規開拓担当" },
  { company: "株式会社ベータソリューション", type: "新規顧客候補", touch: "商談調整中", field: "インフラ・情シス", next: "候補日送付", due: "明日", agent: "AI営業Mgr" },
  { company: "株式会社キャリアパートナーズ", type: "新規BP候補", touch: "初回商談済み", field: "フリーランス・Java", next: "案件情報交換", due: "今週", agent: "AIBP開拓担当" },
  { company: "株式会社デルタテック", type: "新規BP候補", touch: "未接触", field: "インフラ・PMO", next: "初回メール作成", due: "本日", agent: "AIBP開拓担当" },
];

export const customers = [
  { name: "A社", state: "稼働中", people: 3, jobs: 4, last: "7/15", strength: "A", next: "増員ニーズ確認", chance: "クラウド案件拡大", kind: "商機" },
  { name: "B社", state: "提案中", people: 0, jobs: 2, last: "7/11", strength: "B", next: "提案結果確認", chance: "返信停滞", kind: "リスク" },
  { name: "C社", state: "休眠", people: 0, jobs: 0, last: "5/20", strength: "D", next: "情報交換打診", chance: "採用支援ニーズ", kind: "商機" },
];

export const partners = [
  { name: "Xテクノロジー", field: "Java・PHP", people: 12, jobs: 5, flow: "元請・一次請け", strength: "A", last: "7/15", next: "要員交換", potential: "高" },
  { name: "Yネットワーク", field: "インフラ・AWS", people: 8, jobs: 3, flow: "一次請け", strength: "B", last: "7/12", next: "案件ヒアリング", potential: "高" },
  { name: "Zパートナーズ", field: "フリーランス", people: 20, jobs: 1, flow: "二次請け", strength: "C", last: "7/08", next: "定期情報交換", potential: "中" },
];

export const agents: Agent[] = [
  { id: "manager", name: "AI営業Mgr", shortName: "営", role: "営業全体の優先順位と停滞を統合管理", task: "次回アクション未設定企業を確認", processed: 42, tone: "blue", duties: ["営業活動の優先順位管理", "案件・要員・提案状況の統合判断", "営業停滞の検知"] },
  { id: "newbiz", name: "AI新規開拓担当", shortName: "新", role: "新規顧客候補の発掘と初回接点を支援", task: "新規顧客候補42社の優先順位付け", processed: 68, tone: "purple", duties: ["企業情報の整理", "アプローチ優先順位の算出", "初回・再アプローチ文面作成"] },
  { id: "bp", name: "AIBP開拓担当", shortName: "BP", role: "BP候補の発掘と関係性を管理", task: "新規BP候補18社の取引可能性分析", processed: 31, tone: "orange", duties: ["新規BP候補の抽出", "得意領域・商流の整理", "既存BPの関係性低下検知"] },
  { id: "customer", name: "AI顧客管理担当", shortName: "顧", role: "既存顧客の商機とリスクを検知", task: "長期未接触顧客8社を抽出", processed: 27, tone: "cyan", duties: ["接点履歴管理", "商談後のフォロー", "増員・別案件の商機検知"] },
  { id: "matching", name: "AIマッチング担当", shortName: "M", role: "案件と要員の最適な組み合わせを提案", task: "Java案件の候補者を比較", processed: 78, tone: "green", duties: ["案件・要員マッチング", "不足条件の判定", "推薦文の下書き作成"] },
  { id: "recruit", name: "AI採用担当", shortName: "採", role: "母集団形成から選考進捗まで支援", task: "選考停滞候補者を確認", processed: 56, tone: "pink", duties: ["応募者管理", "スカウト候補抽出", "面談準備・停滞検知"] },
  { id: "follow", name: "AIフォロー担当", shortName: "F", role: "稼働中エンジニアの安定稼働を支援", task: "契約更新対象12名を確認", processed: 32, tone: "green", duties: ["週報・勤務表確認", "契約更新確認", "退場リスク検知"] },
  { id: "analytics", name: "AI分析担当", shortName: "分", role: "営業・採用の歩留まりを分析", task: "2回目商談化率を分析", processed: 61, tone: "purple", duties: ["商談・案件獲得率分析", "採用歩留まり分析", "顧客・BP接点強度分析"] },
];

export const initialActivities: Activity[] = [
  { time: "18:25", agent: "AI新規開拓担当", action: "顧客候補20社を抽出", status: "完了" },
  { time: "18:12", agent: "AIBP開拓担当", action: "BP候補の得意領域を整理", status: "完了" },
  { time: "18:05", agent: "AI顧客管理担当", action: "長期未接触顧客を抽出", status: "完了" },
  { time: "17:50", agent: "AI営業Mgr", action: "次回アクション未設定企業を検知", status: "処理中" },
  { time: "17:35", agent: "AI分析担当", action: "2回目商談化率を分析", status: "完了" },
];

export const funnels = {
  customer: [42, 28, 15, 9, 6, 3, 2, 1],
  bp: [35, 22, 14, 10, 8, 5, 4, 2],
};

export const attentionItems = [
  { label: "長期未接触", count: 8, companies: ["C社", "北斗システム"], kind: "risk" },
  { label: "返信停滞", count: 5, companies: ["B社", "オービット技研"], kind: "risk" },
  { label: "次回アクション未設定", count: 7, companies: ["東都ソリューション", "Xテクノロジー"], kind: "watch" },
  { label: "関係性低下", count: 4, companies: ["Zパートナーズ", "中央ITサービス"], kind: "watch" },
  { label: "増員商機あり", count: 6, companies: ["A社", "ベータソリューション"], kind: "chance" },
  { label: "案件獲得可能性あり", count: 9, companies: ["Yネットワーク", "アルファシステム"], kind: "chance" },
];

export const pipelineColumns = [
  { stage: "提案準備", items: [
    { title: "Java基幹刷新", candidates: 3, next: "推薦文を確認", agent: "AIマッチング担当", updated: "18:10" },
    { title: "中途採用 / Java", candidates: 5, next: "書類選考", agent: "AI採用担当", updated: "17:42" },
  ] },
  { stage: "提案中", items: [
    { title: "AWS移行支援", candidates: 4, next: "回答フォロー", agent: "AI営業Mgr", updated: "18:05" },
  ] },
  { stage: "面談調整", items: [
    { title: "PMO支援", candidates: 2, next: "候補日を送付", agent: "AI営業Mgr", updated: "17:55" },
  ] },
  { stage: "面談済み", items: [
    { title: "React開発", candidates: 2, next: "所感を回収", agent: "AI営業Mgr", updated: "17:30" },
  ] },
  { stage: "結果待ち", items: [
    { title: "情シス運用", candidates: 1, next: "結果確認", agent: "AI顧客管理担当", updated: "16:50" },
  ] },
  { stage: "成約", items: [
    { title: "クラウド設計", candidates: 1, next: "契約手続き", agent: "AIフォロー担当", updated: "16:20" },
  ] },
];
