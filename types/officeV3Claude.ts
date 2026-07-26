/** V3 (Claude Opus 5) 専用の型定義。V1/V2 の型とは共有しない。 */

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

export type V3Appearance = {
  skin: string;
  hair: string;
  hairStyle: V3HairStyle;
  /** トップス／ボトムスの色。 */
  outfit: string;
  outfitAlt: string;
  build: "slim" | "regular" | "broad";
  /** 頭身の微調整倍率（0.94–1.06 程度）。 */
  stature: number;
  glasses: boolean;
  headset: boolean;
  prop: V3Prop;
  pose: V3Pose;
};

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
