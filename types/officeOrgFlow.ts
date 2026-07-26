/**
 * SES AI Office の組織フロー定義（将来のデモ用データ）。
 * 現時点ではどの画面・コンポーネントからも参照しない。
 * 実務AI→品質管理→経営参謀→営業Mgrという検査・集約構造を、
 * 具体的なagentId間の有向グラフとして表現する。
 */

/** エージェントID、または人間・Dashboardを表す特殊値。 */
export type OfficeOrgFlowParty =
  | "human"
  | "dashboard"
  | "input"
  | (string & {});

export type OfficeOrgFlowStep = {
  id: string;
  /** 基本フロー（1〜10）内での並び順。例外系は0または枝番で管理する。 */
  order: number;
  fromAgentId: OfficeOrgFlowParty;
  toAgentId: OfficeOrgFlowParty;
  /** この受け渡しが発生する条件・きっかけ。 */
  trigger: string;
  /** 受け渡される成果物・情報。 */
  deliverable: string;
  /** この受け渡しの結果、何が起こるか。 */
  result: string;
  /** 不合格・不成立時に差し戻す先。正常終端の場合は undefined。 */
  failureDestination?: OfficeOrgFlowParty;
  /** 人間の確認が必須かどうか。 */
  humanReviewRequired: boolean;
  /** 正常系かどうか。false の場合は例外系フローとして扱う。 */
  isExceptionPath?: boolean;
};
