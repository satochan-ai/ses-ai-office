/** V3 (Claude Opus 5) 専用の型定義。V1/V2 の型とは共有しない。 */

import type { V3FloorId } from "./officeV3ClaudeOrg";

/** フロアグリッド座標。gx/gy は等尺グリッドのマス目、h は床からの高さ(px)。 */
export type V3Cell = { gx: number; gy: number };

/** グリッド上の矩形領域 [gx0, gy0] – [gx1, gy1]。 */
export type V3Rect = { gx0: number; gy0: number; gx1: number; gy1: number };

export type V3ZoneTone = "slate" | "indigo" | "clay" | "moss" | "amber" | "plum" | "steel";

export type V3FloorStyle = "carpet" | "wood" | "stone" | "rug" | "grass";

export type V3Zone = {
  id: string;
  name: string;
  /** 床・設備側に置く英字キャプション。 */
  caption: string;
  bounds: V3Rect;
  floorStyle: V3FloorStyle;
  tone: V3ZoneTone;
  /** ゾーン名を床のどのあたりに置くか（グリッド座標）。 */
  labelPosition: V3Cell;
  /** モバイル／フォーカス切替時に属するエリア。 */
  area: V3AreaId;
};

export type V3AreaId = "all" | "north" | "center" | "south";

/**
 * 組織上の「階」の表示切り替え（Step3で導入）。
 * "all" = 13名全員 ／ "1f"|"2f"|"3f" = その階の所属AIのみ。
 * 既存の V3AreaId（1枚の物理フロア内をズームする下位概念）とは別の state で管理する。
 */
export type V3FloorView = "all" | V3FloorId;

export type V3Corridor = {
  id: string;
  kind: "main" | "branch";
  bounds: V3Rect;
  label?: string;
};

export type V3FurnitureType =
  | "desk"
  | "commandDesk"
  | "chair"
  | "monitorBank"
  | "wallScreen"
  | "whiteboard"
  | "shelf"
  | "cabinet"
  | "sofa"
  | "roundTable"
  | "counter"
  | "terminal"
  | "partition"
  | "plant"
  | "paperStack"
  | "lamp";

export type V3Furniture = {
  id: string;
  type: V3FurnitureType;
  zoneId: string;
  gx: number;
  gy: number;
  /** グリッド単位の占有幅・奥行（描画スケールにも使う）。 */
  width: number;
  height: number;
  facing: V3Facing;
  /** 同一セル内の描画順微調整。 */
  zIndex?: number;
  label?: string;
  accent?: string;
};

export type V3Facing = "ne" | "nw" | "se" | "sw";

export type V3HairStyle =
  | "crop"
  | "sidepart"
  | "bob"
  | "ponytail"
  | "bun"
  | "wavy"
  | "long"
  | "braid"
  | "curly"
  | "tiedback"
  | "undercut";

export type V3Prop =
  | "tablet"
  | "documents"
  | "notebook"
  | "cards"
  | "folder"
  | "marker"
  | "businessCard"
  | "resume"
  | "none";

export type V3Pose = "typing" | "standing" | "pointing" | "reading" | "phone" | "presenting" | "reviewing";

/* --- 以下は V3 Claude版の「社員らしい人物表現」(WorkerFigure) 専用。--- */
/* 共通の OfficeAgent 型には一切追加しない。data/officeV3ClaudeLayout.ts でのみ使う。 */

/** 立位2種＋座位3種。姿勢そのものが「何をしているか」を伝える。 */
export type V3WorkerPose = "standDirect" | "standReview" | "sitKeyboard" | "sitDesk" | "sitCall";

/** 色ではなく輪郭で見分ける衣服。 */
export type V3ClothingType =
  | "jacket"
  | "shirt"
  | "knit"
  | "cardigan"
  | "blouse"
  | "polo"
  | "knitVest"
  | "longSkirt";

/** 手・机上に置く小物（各人2点以内）。必ず手／机／膝のいずれかへ接触させる。 */
export type V3DeskItem =
  | "keyboard"
  | "mouse"
  | "memoPad"
  | "papers"
  | "fileStack"
  | "businessCards"
  | "notebook"
  | "waterBottle"
  | "smartphone"
  | "tablet"
  | "openBook"
  | "clipboard";

export type V3Appearance = {
  skin: string;
  hair: string;
  hairStyle: V3HairStyle;
  /** トップス／ボトムスの色。 */
  outfit: string;
  outfitAlt: string;
  build: "slim" | "regular" | "broad";
  /** 頭身の微調整倍率（0.94–1.06 程度）。旧表現専用。WorkerFigure では未使用。 */
  stature: number;
  glasses: boolean;
  headset: boolean;
  prop: V3Prop;
  pose: V3Pose;
  /* --- V3 Claude版 WorkerFigure 用（任意）。未指定なら旧表現へフォールバック。 --- */
  /** 骨格・着座・視線・家具接触を切り替える姿勢タイプ。 */
  workerPose?: V3WorkerPose;
  /** 衣服の輪郭タイプ。未指定は "knit" 相当。 */
  clothingType?: V3ClothingType;
  /** 伏し目の強さ(度)。未指定は姿勢ごとの既定値。 */
  gazeTilt?: number;
  /** 眼鏡を角型にする（既定は丸型）。 */
  squareGlasses?: boolean;
  /** 座位 occluder(机エッジ)の描画オフセット。席の向き・机位置に合わせて微調整する。 */
  deskAdjust?: { dx?: number; dy?: number };
  /** フィギュア全体の内部オフセット/内部scale。家具との重なり回避に使う（gx/gy は不変）。 */
  figureNudge?: { x?: number; y?: number; scale?: number };
  /** 手・机上の小物（先頭が主役、2点以内目安）。 */
  deskItems?: V3DeskItem[];
};

/**
 * 3層組織構造のうち、AI社員側の2層。
 * "management" = 経営・統括層（AI営業Mgr／AI品質管理／AI経営参謀の3名のみ）。
 * "field" = 部署・実務層（既存10名）。未設定の場合は "field" として扱う。
 */
export type V3HierarchyLevel = "management" | "field";

export type V3AgentPlacement = {
  id: string;
  /** data/office.ts の officeAgents.id を参照（読み取り専用）。 */
  agentId: string;
  zoneId: string;
  gx: number;
  gy: number;
  zIndex?: number;
  facing: V3Facing;
  scale: number;
  labelPosition: "top" | "bottom" | "left" | "right";
  /** 着席している机の座標（将来の移動実装用）。 */
  deskPosition: V3Cell;
  equipment: string[];
  currentStatus: string;
  shortRole: string;
  appearance: V3Appearance;
  /** 未指定の場合は "field"（部署・実務層）として扱う。 */
  hierarchyLevel?: V3HierarchyLevel;
  /** 報告先のagentId、または人間責任者席のID。未指定時はコード側でフォールバックする。 */
  reportsTo?: string;
  /** 所属部署（data/officeV3ClaudeOrg.ts の V3Department.id）。組織モデル接続用。今回は画面ロジック未使用。 */
  deptId: string;
  /** 所属フロア（3層化の接続用）。今回は画面ロジック未使用。 */
  floorId: V3FloorId;
};

/**
 * 人間責任者席。AI社員ではないため、V3AgentPlacement / officeAgents とは
 * 別の型・別データとして管理する（AI社員数の集計対象に含めないため）。
 * 人物イラストは持たず、席・デスク・表示パネルのみで存在を表現する。
 */
export type V3HumanSeat = {
  id: string;
  actorType: "human";
  gx: number;
  gy: number;
  label: string;
  subLabel: string;
  /** この人物（経営・統括層）から報告・エスカレーションを受ける。 */
  escalationSources: string[];
  pendingApprovals: number;
  needsReview: number;
  todayKeyDecision: string;
};

/** 詳細パネルへ渡す統合ビュー。officeAgents と V3 配置データの合成結果。 */
export type V3AgentView = {
  placement: V3AgentPlacement;
  name: string;
  role: string;
  zoneName: string;
  currentTask: string;
  duties: string[];
  history: string[];
  /** 中央統括チーム（品質管理・経営参謀）のみ使用。存在する場合だけ詳細パネルに表示する。 */
  finalDeliverables?: string[];
};

/**
 * Claude版V3専用に追加する中央統括チームのプロフィール。
 * data/office.ts（V1〜V3共通・11名）とは別に、data/officeV3ClaudeAgents.ts で管理する。
 * 既存の OfficeAgent 型・data/office.ts には一切手を加えない。
 */
export type V3ClaudeOnlyAgentProfile = {
  /** V3AgentPlacement.agentId と一致させるID。 */
  id: string;
  name: string;
  role: string;
  currentTask: string;
  duties: string[];
  /** 「今日の処理例」に表示する配列。 */
  history: string[];
  /** 「最終成果物」に表示する配列。 */
  finalDeliverables: string[];
};

/**
 * Step4: フロア別の物理レイアウトデータの集約型（V3 Claude専用の単純な集約型）。
 * 現在は 1F=現行フロアそのまま、2F/3F=現行レイアウトの複製ベース（仮）。
 * 2F/3F 専用の家具・ゾーン設計、本格3F移設は後工程。既存型は作り直さない。
 */
export type V3FloorLayout = {
  floorId: V3FloorId;
  zones: V3Zone[];
  corridors: V3Corridor[];
  furniture: V3Furniture[];
  placements: V3AgentPlacement[];
  /** 3F のみ「3F相当」として人間責任者席を参照で保持する（V3HumanSeat 型・データは不変）。 */
  humanSeat?: V3HumanSeat;
  /** 将来フロア別に VIEWBOX を持てる構造。今回は3フロアとも現行 VIEWBOX を共有する。 */
  viewBox: { x: number; y: number; w: number; h: number };
};
