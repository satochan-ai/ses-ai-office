/**
 * V3 (Claude Opus 5) 専用の組織データモデル。
 * 将来の 3層化・複数人部署・新設部署追加の土台として用意する。
 *
 * - 現時点では現行13名の写像のみ。UI・レイアウト・カメラ・officeOrgFlow・デモとは未接続。
 * - V3AgentPlacement には組織モデル接続用の deptId / floorId を保持する（Step2 で追加済み）。
 *   UI・レイアウト構造との本格接続は後工程。OfficeAgent 型 / V3Appearance / V3HumanSeat は変更しない。
 * - 人間責任者席は AI社員とは別カテゴリのため、この組織モデル
 *   （フロア／部署／プロフィール）には所属させない。従来どおり V3HumanSeat を単独で維持する。
 */

/** 3層のフロアID。下(実務)→上(経営)。 */
export type V3FloorId = "1f" | "2f" | "3f";

/** フロア（層）の定義。 */
export type V3Floor = {
  id: V3FloorId;
  /** 日本語のフロア名。 */
  name: string;
  /** 床・見出しに置く英字キャプション。 */
  caption: string;
  /** その階の役割の1行説明。 */
  role: string;
  /** 下(1)から上(3)への並び順。 */
  order: number;
};

/**
 * 部署の定義。現在は各部署1名だが、将来の複数人化を前提に「部署」を単位にする。
 * purpose / completesHere / sendsUp / sendsDown は 3層フローの将来定義用のメタデータで、
 * 既存の role・deliverable データおよび data/officeOrgFlow.ts の流れから転記・要約している。
 */
export type V3Department = {
  id: string;
  /** 日本語の部署名。 */
  name: string;
  /** 所属フロア。 */
  floorId: V3FloorId;
  /** 部署の目的（現状は所属AIの role と一致）。 */
  purpose: string;
  /** 部署のリードAIの id。複数人化時も1名を指す。現状は唯一の所属AI。 */
  leadAgentId?: string;
  /** この部署内で完結する成果物・処理。 */
  completesHere: string[];
  /** 上階へ渡す情報。今回は未接続。 */
  sendsUp: string[];
  /** 下階へ戻す情報。今回は未接続。 */
  sendsDown: string[];
};

/**
 * AI社員1名分のプロフィール。
 * V3 Claude だけで完結させるため、data/office.ts（11名）と
 * data/officeV3ClaudeAgents.ts（2名）の内容をここへ転記する。
 * appearance（見た目）は従来どおり V3AgentPlacement 側に残す。
 */
export type V3AgentProfile = {
  id: string;
  /** 所属部署（V3Department.id）。 */
  deptId: string;
  name: string;
  role: string;
  /** 部署内でのリードかどうか。現状は各部署1名のため全員 true。 */
  isLead: boolean;
  currentTask: string;
  duties: string[];
  history: string[];
  /** 中央統括2名(quality/strategist)のみ保持。実務11名は未設定。 */
  finalDeliverables?: string[];
};
