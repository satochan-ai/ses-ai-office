import type {
  V3AgentPlacement,
  V3Cell,
  V3Corridor,
  V3Furniture,
  V3Rect,
  V3Zone,
} from "@/types/officeV3Claude";

/* ------------------------------------------------------------------ */
/* アイソメトリック投影                                                  */
/* ------------------------------------------------------------------ */

/** 1マスの画面上の半幅／半高（2:1 の等尺投影）。 */
export const ISO_HALF_W = 30;
export const ISO_HALF_H = 15;

/** フロアグリッドの広さ（0 – 30 マス角）。 */
export const GRID_SIZE = 30;

export const isoX = (gx: number, gy: number) => (gx - gy) * ISO_HALF_W;
export const isoY = (gx: number, gy: number, lift = 0) => (gx + gy) * ISO_HALF_H - lift;

export const isoPoint = (gx: number, gy: number, lift = 0) => ({
  x: isoX(gx, gy),
  y: isoY(gx, gy, lift),
});

/** ペインターズアルゴリズム用の奥行きキー。小さいほど奥。 */
export const isoDepth = (gx: number, gy: number) => gx + gy;

/** 矩形をアイソメトリックのポリゴン文字列へ変換。 */
export const rectPolygon = ({ gx0, gy0, gx1, gy1 }: V3Rect, lift = 0) =>
  [
    [gx0, gy0],
    [gx1, gy0],
    [gx1, gy1],
    [gx0, gy1],
  ]
    .map(([gx, gy]) => `${isoX(gx, gy)},${isoY(gx, gy, lift)}`)
    .join(" ");

export const rectCenter = ({ gx0, gy0, gx1, gy1 }: V3Rect): V3Cell => ({
  gx: (gx0 + gx1) / 2,
  gy: (gy0 + gy1) / 2,
});

/** 画面全体のビューボックス。床ダイヤ 1800×900 に壁と余白を足した値。 */
export const VIEWBOX = { x: -980, y: -330, w: 1960, h: 1270 } as const;

/* ------------------------------------------------------------------ */
/* フォーカス（PC のエリアズーム／モバイルのエリア切替で共有）             */
/* ------------------------------------------------------------------ */

/** ズーム倍率と中心は、そのエリアの人物が全員収まるよう個別調整している。 */
export const v3Areas = [
  { id: "all", label: "全体", caption: "オフィス全景", scale: 1, cx: 0, cy: 303 },
  { id: "north", label: "北側", caption: "受付・顧客・分析", scale: 1.8, cx: 0, cy: 250 },
  { id: "center", label: "中央", caption: "指令席・会議・ラウンジ", scale: 1.55, cx: 0, cy: 455 },
  { id: "south", label: "南側", caption: "開拓・人材・提案", scale: 1.62, cx: 42, cy: 618 },
] as const;

/* ------------------------------------------------------------------ */
/* ゾーン（3×3 バンド構成 / A:2-9 B:11.5-18.5 C:21-28）                  */
/* ------------------------------------------------------------------ */

export const v3Zones: V3Zone[] = [
  {
    id: "reception", name: "受付・エントランス", caption: "ENTRANCE", area: "north",
    bounds: { gx0: 2, gy0: 2, gx1: 9, gy1: 9 },
    floorStyle: "stone", tone: "steel", labelPosition: { gx: 6.2, gy: 6.2 },
  },
  {
    id: "client", name: "顧客・契約", caption: "CLIENT & CONTRACT", area: "north",
    bounds: { gx0: 11.5, gy0: 2, gx1: 18.5, gy1: 9 },
    floorStyle: "carpet", tone: "indigo", labelPosition: { gx: 15.2, gy: 5.6 },
  },
  {
    id: "meeting", name: "会議スペース", caption: "MEETING", area: "center",
    bounds: { gx0: 21, gy0: 2, gx1: 28, gy1: 9 },
    floorStyle: "rug", tone: "slate", labelPosition: { gx: 24.4, gy: 8.0 },
  },
  {
    id: "insight", name: "分析・ナレッジ", caption: "INSIGHT & KNOWLEDGE", area: "north",
    bounds: { gx0: 2, gy0: 11.5, gx1: 9, gy1: 18.5 },
    floorStyle: "carpet", tone: "moss", labelPosition: { gx: 5.0, gy: 14.8 },
  },
  {
    id: "command", name: "中央指令席", caption: "COMMAND HUB", area: "center",
    bounds: { gx0: 11.5, gy0: 11.5, gx1: 18.5, gy1: 18.5 },
    floorStyle: "wood", tone: "amber", labelPosition: { gx: 13.6, gy: 16.6 },
  },
  {
    id: "talent", name: "人材・稼働", caption: "TALENT & CARE", area: "south",
    bounds: { gx0: 21, gy0: 11.5, gx1: 28, gy1: 18.5 },
    floorStyle: "carpet", tone: "plum", labelPosition: { gx: 24.6, gy: 12.2 },
  },
  {
    id: "lounge", name: "グリーンラウンジ", caption: "GREEN LOUNGE", area: "center",
    bounds: { gx0: 2, gy0: 21, gx1: 9, gy1: 28 },
    floorStyle: "grass", tone: "moss", labelPosition: { gx: 4.0, gy: 27.0 },
  },
  {
    id: "growth", name: "新規開拓・BP", caption: "GROWTH & PARTNERS", area: "south",
    bounds: { gx0: 11.5, gy0: 21, gx1: 18.5, gy1: 28 },
    floorStyle: "carpet", tone: "clay", labelPosition: { gx: 14.0, gy: 24.4 },
  },
  {
    id: "proposal", name: "提案・面談支援", caption: "PROPOSAL LAB", area: "south",
    bounds: { gx0: 21, gy0: 21, gx1: 28, gy1: 28 },
    floorStyle: "wood", tone: "slate", labelPosition: { gx: 22.4, gy: 27.4 },
  },
];

/* ------------------------------------------------------------------ */
/* 通路（ゾーンの隙間がそのまま歩行帯になる）                             */
/* ------------------------------------------------------------------ */

export const v3Corridors: V3Corridor[] = [
  { id: "aisle-west", kind: "main", bounds: { gx0: 9, gy0: 2, gx1: 11.5, gy1: 28 }, label: "MAIN AISLE" },
  { id: "aisle-east", kind: "main", bounds: { gx0: 18.5, gy0: 2, gx1: 21, gy1: 28 }, label: "MAIN AISLE" },
  { id: "aisle-north", kind: "main", bounds: { gx0: 2, gy0: 9, gx1: 28, gy1: 11.5 } },
  { id: "aisle-south", kind: "main", bounds: { gx0: 2, gy0: 18.5, gx1: 28, gy1: 21 } },
  { id: "spur-reception", kind: "branch", bounds: { gx0: 5.2, gy0: 5.2, gx1: 6.6, gy1: 9 } },
  { id: "spur-command-n", kind: "branch", bounds: { gx0: 14.4, gy0: 11.5, gx1: 15.8, gy1: 13.2 } },
  { id: "spur-command-s", kind: "branch", bounds: { gx0: 14.4, gy0: 17.4, gx1: 15.8, gy1: 18.5 } },
  { id: "spur-proposal", kind: "branch", bounds: { gx0: 21, gy0: 23.6, gx1: 22.4, gy1: 25.0 } },
];

/** 将来の人物移動用ノード（通路中心線の交点・ゾーン入口）。 */
export const v3WalkNodes: { id: string; gx: number; gy: number; zoneId?: string }[] = [
  { id: "n-plaza-nw", gx: 10.25, gy: 10.25 },
  { id: "n-plaza-ne", gx: 19.75, gy: 10.25 },
  { id: "n-plaza-sw", gx: 10.25, gy: 19.75 },
  { id: "n-plaza-se", gx: 19.75, gy: 19.75 },
  { id: "n-reception", gx: 10.25, gy: 5.5, zoneId: "reception" },
  { id: "n-client", gx: 15.0, gy: 10.25, zoneId: "client" },
  { id: "n-meeting", gx: 24.5, gy: 10.25, zoneId: "meeting" },
  { id: "n-insight", gx: 10.25, gy: 15.0, zoneId: "insight" },
  { id: "n-command-n", gx: 15.0, gy: 11.5, zoneId: "command" },
  { id: "n-command-s", gx: 15.0, gy: 18.5, zoneId: "command" },
  { id: "n-talent", gx: 19.75, gy: 15.0, zoneId: "talent" },
  { id: "n-lounge", gx: 10.25, gy: 24.5, zoneId: "lounge" },
  { id: "n-growth", gx: 15.0, gy: 19.75, zoneId: "growth" },
  { id: "n-proposal", gx: 24.5, gy: 19.75, zoneId: "proposal" },
  { id: "n-east-hall", gx: 19.75, gy: 5.5 },
  { id: "n-south-hall", gx: 24.5, gy: 19.75 },
];

/* ------------------------------------------------------------------ */
/* 家具・設備                                                           */
/* ------------------------------------------------------------------ */

export const v3Furniture: V3Furniture[] = [
  /* 受付・エントランス */
  { id: "rec-feed", type: "wallScreen", zoneId: "reception", gx: 3.0, gy: 2.4, width: 2.6, height: 0.5, facing: "se", label: "外部データ", accent: "#5b8bb5" },
  { id: "rec-counter", type: "counter", zoneId: "reception", gx: 4.8, gy: 4.6, width: 4.0, height: 1.5, facing: "se", label: "受付" },
  { id: "rec-terminal-job", type: "terminal", zoneId: "reception", gx: 8.2, gy: 3.2, width: 1.0, height: 1.0, facing: "sw", label: "新着案件" },
  { id: "rec-terminal-talent", type: "terminal", zoneId: "reception", gx: 3.2, gy: 8.2, width: 1.0, height: 1.0, facing: "ne", label: "新着要員" },
  { id: "rec-sofa", type: "sofa", zoneId: "reception", gx: 7.4, gy: 7.0, width: 2.4, height: 1.3, facing: "nw", label: "来客" },
  { id: "rec-plant-a", type: "plant", zoneId: "reception", gx: 8.7, gy: 5.6, width: 1, height: 1, facing: "se" },
  { id: "rec-plant-b", type: "plant", zoneId: "reception", gx: 5.6, gy: 8.7, width: 1, height: 1, facing: "se" },
  { id: "rec-lamp", type: "lamp", zoneId: "reception", gx: 2.4, gy: 6.0, width: 1, height: 1, facing: "se" },

  /* 顧客・契約 */
  { id: "cli-monitors", type: "monitorBank", zoneId: "client", gx: 12.0, gy: 2.5, width: 2.4, height: 0.6, facing: "se", label: "顧客履歴", accent: "#5f8fbe" },
  { id: "cli-desk-a", type: "desk", zoneId: "client", gx: 12.0, gy: 3.0, width: 3.0, height: 1.7, facing: "se", label: "顧客リレーション席" },
  { id: "cli-cards", type: "paperStack", zoneId: "client", gx: 15.6, gy: 2.6, width: 1.2, height: 1.0, facing: "se", label: "顧客企業カード" },
  { id: "cli-board", type: "wallScreen", zoneId: "client", gx: 18.1, gy: 3.2, width: 2.4, height: 0.5, facing: "sw", label: "更新期限ボード", accent: "#c08a52" },
  { id: "cli-shelf", type: "shelf", zoneId: "client", gx: 18.2, gy: 6.2, width: 2.6, height: 1.0, facing: "sw", label: "契約書棚" },
  { id: "cli-desk-b", type: "desk", zoneId: "client", gx: 16.4, gy: 7.0, width: 2.8, height: 1.7, facing: "nw", label: "請求管理端末" },
  { id: "cli-cabinet", type: "cabinet", zoneId: "client", gx: 12.4, gy: 7.8, width: 1.6, height: 1.2, facing: "se", label: "書類キャビネット" },
  { id: "cli-plant", type: "plant", zoneId: "client", gx: 11.8, gy: 5.6, width: 1, height: 1, facing: "se" },

  /* 会議スペース */
  { id: "mtg-screen", type: "wallScreen", zoneId: "meeting", gx: 21.6, gy: 2.6, width: 3.0, height: 0.5, facing: "se", label: "MEETING", accent: "#6f93a8" },
  { id: "mtg-table", type: "roundTable", zoneId: "meeting", gx: 24.4, gy: 5.2, width: 3.2, height: 3.2, facing: "se" },
  { id: "mtg-chair-a", type: "chair", zoneId: "meeting", gx: 22.7, gy: 5.2, width: 1, height: 1, facing: "se" },
  { id: "mtg-chair-b", type: "chair", zoneId: "meeting", gx: 26.1, gy: 5.2, width: 1, height: 1, facing: "nw" },
  { id: "mtg-chair-c", type: "chair", zoneId: "meeting", gx: 24.4, gy: 3.5, width: 1, height: 1, facing: "se" },
  { id: "mtg-chair-d", type: "chair", zoneId: "meeting", gx: 24.4, gy: 6.9, width: 1, height: 1, facing: "nw" },
  { id: "mtg-partition", type: "partition", zoneId: "meeting", gx: 27.4, gy: 7.4, width: 3.0, height: 1.0, facing: "nw" },
  { id: "mtg-plant", type: "plant", zoneId: "meeting", gx: 27.2, gy: 3.0, width: 1, height: 1, facing: "se" },
  { id: "mtg-plant-b", type: "plant", zoneId: "meeting", gx: 21.4, gy: 8.4, width: 1, height: 1, facing: "se" },

  /* 分析・ナレッジ */
  { id: "ins-monitors", type: "monitorBank", zoneId: "insight", gx: 2.6, gy: 11.7, width: 2.8, height: 0.6, facing: "se", label: "複数モニター", accent: "#5f9a86" },
  { id: "ins-desk-a", type: "desk", zoneId: "insight", gx: 2.6, gy: 12.2, width: 3.0, height: 1.7, facing: "se", label: "分析席" },
  { id: "ins-board", type: "whiteboard", zoneId: "insight", gx: 8.4, gy: 12.0, width: 2.8, height: 0.6, facing: "sw", label: "ホワイトボード" },
  { id: "ins-shelf", type: "shelf", zoneId: "insight", gx: 2.3, gy: 16.4, width: 2.8, height: 1.0, facing: "ne", label: "ナレッジ棚" },
  { id: "ins-papers", type: "paperStack", zoneId: "insight", gx: 6.4, gy: 15.6, width: 1.2, height: 1.0, facing: "se", label: "分析資料" },
  { id: "ins-desk-b", type: "desk", zoneId: "insight", gx: 6.6, gy: 16.6, width: 2.8, height: 1.7, facing: "se", label: "教育・ナレッジ席" },
  { id: "ins-plant", type: "plant", zoneId: "insight", gx: 8.6, gy: 14.8, width: 1, height: 1, facing: "se" },

  /* 中央指令席 */
  { id: "cmd-wall-a", type: "wallScreen", zoneId: "command", gx: 12.6, gy: 11.8, width: 3.2, height: 0.6, facing: "se", label: "全体状況モニター", accent: "#c9a063" },
  { id: "cmd-wall-b", type: "wallScreen", zoneId: "command", gx: 17.6, gy: 11.8, width: 3.2, height: 0.6, facing: "sw", label: "案件・提案状況", accent: "#c9a063" },
  { id: "cmd-monitors", type: "monitorBank", zoneId: "command", gx: 14.8, gy: 13.0, width: 3.2, height: 0.6, facing: "se", label: "統括モニター", accent: "#d5b478" },
  { id: "cmd-desk", type: "commandDesk", zoneId: "command", gx: 14.8, gy: 13.7, width: 5.0, height: 2.6, facing: "se", label: "AI COMMAND" },
  // 指令席まわりの余白を確保するため、小物のランプは削減（改善2）
  { id: "cmd-sync", type: "roundTable", zoneId: "command", gx: 16.9, gy: 17.2, width: 2.3, height: 2.3, facing: "se", label: "SYNC" },
  { id: "cmd-chair-a", type: "chair", zoneId: "command", gx: 15.8, gy: 17.2, width: 1, height: 1, facing: "se" },
  { id: "cmd-chair-b", type: "chair", zoneId: "command", gx: 18.0, gy: 17.2, width: 1, height: 1, facing: "nw" },
  { id: "cmd-plant", type: "plant", zoneId: "command", gx: 12.2, gy: 17.8, width: 1, height: 1, facing: "se" },

  /* 人材・稼働 */
  { id: "tal-monitors", type: "monitorBank", zoneId: "talent", gx: 21.8, gy: 11.8, width: 2.8, height: 0.6, facing: "se", label: "案件×要員比較", accent: "#9a7bb0" },
  { id: "tal-desk-a", type: "desk", zoneId: "talent", gx: 21.8, gy: 12.3, width: 3.0, height: 1.7, facing: "se", label: "マッチング席" },
  { id: "tal-cards", type: "paperStack", zoneId: "talent", gx: 25.2, gy: 11.9, width: 1.2, height: 1.0, facing: "se", label: "候補者カード" },
  { id: "tal-desk-b", type: "desk", zoneId: "talent", gx: 26.4, gy: 13.6, width: 2.8, height: 1.7, facing: "sw", label: "履歴書・面談席" },
  { id: "tal-sofa", type: "sofa", zoneId: "talent", gx: 22.4, gy: 17.6, width: 2.4, height: 1.3, facing: "ne", label: "相談ソファ" },
  { id: "tal-chair", type: "chair", zoneId: "talent", gx: 24.8, gy: 16.4, width: 1, height: 1, facing: "nw" },
  { id: "tal-terminal", type: "terminal", zoneId: "talent", gx: 27.4, gy: 17.6, width: 1.0, height: 1.0, facing: "nw", label: "週報・契約更新" },
  { id: "tal-plant", type: "plant", zoneId: "talent", gx: 21.3, gy: 15.4, width: 1, height: 1, facing: "se" },

  /* グリーンラウンジ */
  { id: "lou-sofa", type: "sofa", zoneId: "lounge", gx: 5.0, gy: 23.4, width: 2.4, height: 1.3, facing: "se", label: "リフレッシュ" },
  { id: "lou-table", type: "roundTable", zoneId: "lounge", gx: 6.6, gy: 25.2, width: 1.8, height: 1.8, facing: "se" },
  { id: "lou-plant-a", type: "plant", zoneId: "lounge", gx: 3.0, gy: 22.2, width: 1, height: 1, facing: "se" },
  { id: "lou-plant-b", type: "plant", zoneId: "lounge", gx: 4.2, gy: 26.8, width: 1, height: 1, facing: "se" },
  { id: "lou-plant-c", type: "plant", zoneId: "lounge", gx: 8.0, gy: 23.2, width: 1, height: 1, facing: "se" },
  { id: "lou-lamp", type: "lamp", zoneId: "lounge", gx: 2.6, gy: 25.8, width: 1, height: 1, facing: "se" },

  /* 新規開拓・BP */
  { id: "gro-monitor", type: "monitorBank", zoneId: "growth", gx: 12.2, gy: 21.2, width: 2.6, height: 0.6, facing: "se", label: "メール端末", accent: "#c07a6a" },
  { id: "gro-desk-a", type: "desk", zoneId: "growth", gx: 12.2, gy: 21.7, width: 3.0, height: 1.7, facing: "se", label: "新規開拓席" },
  { id: "gro-booth", type: "partition", zoneId: "growth", gx: 11.7, gy: 24.6, width: 2.6, height: 1.0, facing: "se", label: "電話席" },
  { id: "gro-terminal", type: "terminal", zoneId: "growth", gx: 15.6, gy: 21.4, width: 1.0, height: 1.0, facing: "se", label: "企業リスト" },
  { id: "gro-cards", type: "paperStack", zoneId: "growth", gx: 18.0, gy: 22.8, width: 1.2, height: 1.0, facing: "se", label: "名刺" },
  { id: "gro-network", type: "whiteboard", zoneId: "growth", gx: 18.2, gy: 25.6, width: 2.8, height: 0.6, facing: "sw", label: "BPネットワーク図" },
  { id: "gro-desk-b", type: "desk", zoneId: "growth", gx: 15.6, gy: 25.8, width: 2.8, height: 1.7, facing: "se", label: "BP開拓席" },
  { id: "gro-plant", type: "plant", zoneId: "growth", gx: 12.6, gy: 27.4, width: 1, height: 1, facing: "se" },

  /* 提案・面談支援 */
  { id: "pro-screen", type: "wallScreen", zoneId: "proposal", gx: 21.6, gy: 21.6, width: 3.0, height: 0.5, facing: "se", label: "推薦文モニター", accent: "#7c9bb8" },
  { id: "pro-monitors", type: "monitorBank", zoneId: "proposal", gx: 23.2, gy: 22.7, width: 2.6, height: 0.6, facing: "se", label: "面談資料", accent: "#7c9bb8" },
  { id: "pro-desk", type: "desk", zoneId: "proposal", gx: 23.2, gy: 23.2, width: 3.2, height: 1.8, facing: "se", label: "提案・面談支援席" },
  { id: "pro-board", type: "whiteboard", zoneId: "proposal", gx: 27.2, gy: 22.6, width: 2.8, height: 0.6, facing: "sw", label: "面談対策ボード" },
  { id: "pro-docs", type: "paperStack", zoneId: "proposal", gx: 21.8, gy: 25.6, width: 1.2, height: 1.0, facing: "se", label: "企業分析資料" },
  { id: "pro-table", type: "roundTable", zoneId: "proposal", gx: 25.6, gy: 26.4, width: 2.2, height: 2.2, facing: "se", label: "小会議席" },
  { id: "pro-chair-a", type: "chair", zoneId: "proposal", gx: 24.5, gy: 26.4, width: 1, height: 1, facing: "se" },
  { id: "pro-chair-b", type: "chair", zoneId: "proposal", gx: 26.7, gy: 26.4, width: 1, height: 1, facing: "nw" },
  { id: "pro-plant", type: "plant", zoneId: "proposal", gx: 27.6, gy: 27.0, width: 1, height: 1, facing: "se" },
];

/* ------------------------------------------------------------------ */
/* AI社員 11名の配置                                                    */
/* ------------------------------------------------------------------ */

export const v3AgentPlacements: V3AgentPlacement[] = [
  {
    id: "p-manager", agentId: "manager", zoneId: "command",
    gx: 15.2, gy: 15.4, facing: "se", scale: 1.12, labelPosition: "right", zIndex: 2,
    deskPosition: { gx: 14.8, gy: 13.7 },
    equipment: ["大型指令デスク", "全体状況モニター", "案件・提案状況ボード", "SYNCテーブル"],
    currentStatus: "全体指揮中", shortRole: "営業Mgr",
    appearance: {
      skin: "#e8b58f", hair: "#1f2733", hairStyle: "sidepart", outfit: "#2f4d72", outfitAlt: "#28374d",
      build: "regular", stature: 1.06, glasses: false, headset: false, prop: "tablet", pose: "pointing",
    },
  },
  {
    id: "p-analytics", agentId: "analytics", zoneId: "insight",
    gx: 3.8, gy: 13.2, facing: "se", scale: 1, labelPosition: "top",
    deskPosition: { gx: 2.6, gy: 12.2 },
    equipment: ["3面モニター", "ファネルグラフ", "分析資料"],
    currentStatus: "モニター確認", shortRole: "分析",
    appearance: {
      skin: "#f0c9a8", hair: "#3a2b26", hairStyle: "bob", outfit: "#4f8b7c", outfitAlt: "#37424f",
      build: "slim", stature: 0.97, glasses: true, headset: false, prop: "none", pose: "typing",
    },
  },
  {
    id: "p-knowledge", agentId: "knowledge", zoneId: "insight",
    // "left"に変更：南側の新規開拓担当とラベルが近接するため（改善1）
    gx: 7.8, gy: 17.6, facing: "nw", scale: 1, labelPosition: "left",
    deskPosition: { gx: 6.6, gy: 16.6 },
    equipment: ["ホワイトボード", "ナレッジ棚", "書籍", "教材ファイル"],
    currentStatus: "教材を整理", shortRole: "ナレッジ",
    appearance: {
      skin: "#d9a276", hair: "#6d4632", hairStyle: "bun", outfit: "#8f9a6a", outfitAlt: "#4a4237",
      build: "regular", stature: 1.0, glasses: true, headset: false, prop: "documents", pose: "reading",
    },
  },
  {
    id: "p-relation", agentId: "relation", zoneId: "client",
    gx: 13.2, gy: 4.0, facing: "se", scale: 1, labelPosition: "top",
    deskPosition: { gx: 12.0, gy: 3.0 },
    equipment: ["顧客履歴モニター", "顧客企業カード", "ヘッドセット"],
    currentStatus: "顧客履歴を確認", shortRole: "顧客管理",
    appearance: {
      skin: "#e5b78f", hair: "#241f22", hairStyle: "ponytail", outfit: "#5c7fa6", outfitAlt: "#333c4a",
      build: "slim", stature: 0.99, glasses: false, headset: true, prop: "none", pose: "typing",
    },
  },
  {
    id: "p-contract", agentId: "contract", zoneId: "client",
    // "left"に変更：南東のマッチング担当とラベルが近接するため（改善1）
    gx: 17.6, gy: 8.0, facing: "nw", scale: 1, labelPosition: "left",
    deskPosition: { gx: 16.4, gy: 7.0 },
    equipment: ["請求管理端末", "契約書棚", "更新期限ボード", "書類キャビネット"],
    currentStatus: "契約書を確認", shortRole: "契約管理",
    appearance: {
      skin: "#f1cbab", hair: "#4d3b32", hairStyle: "crop", outfit: "#8a6f52", outfitAlt: "#3d3a36",
      build: "broad", stature: 1.03, glasses: true, headset: false, prop: "folder", pose: "reviewing",
    },
  },
  {
    id: "p-newbiz", agentId: "newbiz", zoneId: "growth",
    gx: 13.4, gy: 22.6, facing: "se", scale: 1, labelPosition: "top",
    deskPosition: { gx: 12.2, gy: 21.7 },
    equipment: ["電話席", "ヘッドセット", "メール端末", "企業リスト"],
    currentStatus: "架電中", shortRole: "新規開拓",
    appearance: {
      skin: "#e3ab84", hair: "#33251f", hairStyle: "wavy", outfit: "#b06a62", outfitAlt: "#3a3540",
      build: "regular", stature: 1.0, glasses: false, headset: true, prop: "none", pose: "phone",
    },
  },
  {
    id: "p-bp", agentId: "bp", zoneId: "growth",
    gx: 16.8, gy: 26.8, facing: "nw", scale: 1, labelPosition: "bottom",
    deskPosition: { gx: 15.6, gy: 25.8 },
    equipment: ["BPネットワーク図", "名刺ホルダー", "商流メモ"],
    currentStatus: "商流を整理", shortRole: "BP開拓",
    appearance: {
      skin: "#c98f6b", hair: "#1c2028", hairStyle: "braid", outfit: "#8d6489", outfitAlt: "#39323d",
      build: "slim", stature: 0.96, glasses: false, headset: false, prop: "businessCard", pose: "standing",
    },
  },
  {
    id: "p-matching", agentId: "matching", zoneId: "talent",
    // "bottom"に変更：北西の契約管理担当とラベルが近接するため（改善1）
    gx: 22.6, gy: 12.9, facing: "se", scale: 1, labelPosition: "bottom",
    deskPosition: { gx: 21.8, gy: 12.3 },
    equipment: ["案件×要員比較モニター", "候補者カード", "推薦文タブレット"],
    currentStatus: "案件と要員を照合", shortRole: "マッチング",
    appearance: {
      skin: "#efc19d", hair: "#54382c", hairStyle: "undercut", outfit: "#6f5c9e", outfitAlt: "#343044",
      build: "regular", stature: 1.02, glasses: false, headset: false, prop: "tablet", pose: "reviewing",
    },
  },
  {
    id: "p-recruit", agentId: "recruit", zoneId: "talent",
    gx: 27.4, gy: 14.6, facing: "nw", scale: 1, labelPosition: "right",
    deskPosition: { gx: 26.4, gy: 13.6 },
    equipment: ["履歴書", "候補者カード", "面談席"],
    currentStatus: "候補者を確認", shortRole: "採用",
    appearance: {
      skin: "#f4cba6", hair: "#8b5b3a", hairStyle: "long", outfit: "#c08a4c", outfitAlt: "#4a3f34",
      build: "slim", stature: 0.98, glasses: false, headset: false, prop: "resume", pose: "reading",
    },
  },
  {
    id: "p-follow", agentId: "follow", zoneId: "talent",
    gx: 24.2, gy: 17.8, facing: "se", scale: 1, labelPosition: "bottom",
    deskPosition: { gx: 24.8, gy: 16.4 },
    equipment: ["相談ソファ", "週報・契約更新端末", "面談席"],
    currentStatus: "面談中", shortRole: "フォロー",
    appearance: {
      skin: "#dba47f", hair: "#26242a", hairStyle: "curly", outfit: "#4d8a80", outfitAlt: "#33413f",
      build: "broad", stature: 1.04, glasses: false, headset: true, prop: "notebook", pose: "standing",
    },
  },
  {
    id: "p-proposal", agentId: "proposal", zoneId: "proposal",
    gx: 24.4, gy: 24.2, facing: "se", scale: 1.04, labelPosition: "right",
    deskPosition: { gx: 23.2, gy: 23.2 },
    equipment: ["推薦文モニター", "面談対策ボード", "企業分析資料", "小会議席"],
    currentStatus: "推薦文を作成", shortRole: "面談支援",
    appearance: {
      skin: "#e9bb95", hair: "#5c4438", hairStyle: "tiedback", outfit: "#5f8a70", outfitAlt: "#3c4442",
      build: "regular", stature: 1.0, glasses: true, headset: false, prop: "marker", pose: "presenting",
    },
  },
];

/** 常時ラベル用の状態トーン（色だけに頼らず文言も併記する）。 */
export const v3StatusTone: Record<string, "run" | "check" | "talk"> = {
  "全体指揮中": "run", "モニター確認": "run", "教材を整理": "check", "顧客履歴を確認": "run",
  "契約書を確認": "check", "架電中": "talk", "商流を整理": "check", "案件と要員を照合": "run",
  "候補者を確認": "check", "面談中": "talk", "推薦文を作成": "run",
};
