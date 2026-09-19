/**
 * SES AI Office 次期MVP: Work Item（業務単位）のドメイン型。
 * 案件情報の取り込みから「提案準備完了」までを1つのWork Itemとして扱う。
 * UI・永続化・LLM・外部送信には依存しない、純粋な型定義のみ。
 */

export type WorkItemSchemaVersion = 1;

/** MVPで扱う業務種別。将来の種別追加はこのunionを拡張する。 */
export type WorkItemKind =
  | "opportunity_proposal"
  | "matching-proposal"
  | "new-client-outreach"
  | "candidate-screening"
  | "bp-alliance"
  | "engineer-follow";

/** Runtimeのデータ源。実行権限（prepare-only）はApproval側で管理する。 */
export type WorkItemMode = "demo" | "real";

export type WorkItemStatus =
  | "intake_received"
  | "structuring"
  | "candidate_search"
  | "condition_match"
  | "info_gap_check"
  | "draft_generation"
  | "quality_check"
  | "awaiting_approval"
  | "preparation_recorded"
  | "closed"
  | "blocked_missing_info"
  | "blocked_no_candidate"
  | "blocked_conflict"
  | "needs_human_input"
  | "returned_for_rework"
  | "approval_expired"
  | "approval_invalidated"
  | "failed_intake"
  | "failed_execution"
  | "cancelled"
  | "superseded";

export type ActorRef = {
  type: "agent" | "human" | "system";
  id: string;
};

export type WorkItemSourceType = "email" | "chat" | "document" | "manual" | "demo-seed";

export type WorkItemSource = {
  type: WorkItemSourceType;
  /** 原文を指す参照（メッセージID・ファイルパス等）。 */
  ref: string;
};

export type WorkItemRelations = {
  opportunityIds: string[];
  /** 候補人材。candidate_search完了時にここが空だとblocked_no_candidateになる。 */
  personIds: string[];
  partnerIds: string[];
  clientIds: string[];
  companyIds: string[];
  parentWorkItemId: string | null;
  supersededByWorkItemId: string | null;
};

export type NextActionKind =
  | "run_agent"
  | "provide_human_input"
  | "approve_or_reject"
  | "retry"
  | "close";

export type NextAction = {
  kind: NextActionKind;
  ownerType: "agent" | "human" | "system";
  /** Adapter/UI表示用の決定論的な補足。既存Domainのkind/ownerTypeは維持する。 */
  actor?: "ai" | "human";
  label?: string;
  agentId?: string;
  dueAt?: string | null;
};

export type ExecutionError = {
  code: string;
  message: string;
  at: string;
};

/** ExecutionLog本体は別Stepで実装する。ここは再開・再試行に必要な最小の実行状態だけを持つ。 */
export type WorkItemExecution = {
  attempt: number;
  lastAgentId: string | null;
  lastError: ExecutionError | null;
  /** blocked / needs_human_input / failed_* から復帰するときの戻り先。 */
  resumeStatus: WorkItemStatus | null;
};

export type EvidenceKind =
  | "source_excerpt"
  | "person_statement"
  | "system_record"
  | "agent_inference"
  | "human_confirmation";

export type Evidence = {
  id: string;
  workItemId: string;
  kind: EvidenceKind;
  claim: string;
  sourceRef: string;
  sourceVersion: string;
  excerpt: string;
  producedBy: ActorRef;
  /** このEvidenceレコードを作成した時刻。 */
  producedAt: string;
  /** 情報そのものが取得・観測された時刻。不明ならnull。 */
  observedAt: string | null;
  /** 人間または信頼できる手段で内容が確認された時刻。未確認ならnull。 */
  verifiedAt: string | null;
  /** この根拠が有効とみなせる期限。期限がなければnull。 */
  validUntil: string | null;
};

export type KnownMissingInfoField =
  | "proposalRoute"
  | "personIntent"
  | "availabilityStart"
  | "informationFreshness"
  | "duplicateProposal"
  | "disclosureScope";

/** 正式語彙以外は`ext:`接頭辞を付けて拡張する（例: `ext:workLocation`）。 */
export type MissingInfoField = KnownMissingInfoField | `ext:${string}`;

export type InfoStatus = "open" | "resolved" | "waived";

export type MissingInfo = {
  id: string;
  workItemId: string;
  field: MissingInfoField;
  subjectPersonId: string | null;
  question: string;
  status: InfoStatus;
  raisedAt: string;
  resolvedAt: string | null;
};

export type KnownConflictKind =
  | "start_date_mismatch"
  | "route_contradiction"
  | "duplicate_proposal"
  | "rate_mismatch"
  | "intent_contradiction"
  | "source_structure_mismatch";

export type ConflictKind = KnownConflictKind | `ext:${string}`;

export type ConflictInfo = {
  id: string;
  workItemId: string;
  kind: ConflictKind;
  description: string;
  subjectPersonId: string | null;
  evidenceIds: string[];
  status: InfoStatus;
  detectedAt: string;
  resolvedAt: string | null;
};

export type ProposalVerdict = "fit" | "unfit" | "unknown";
export type ProposalReadiness = "ready_for_human_review" | "blocked" | "not_recommended";
export type RouteStatus = "clear" | "unknown" | "conflict";
export type IntentStatus = "confirmed" | "declined" | "unknown" | "stale";
export type DuplicateStatus = "none" | "possible" | "confirmed" | "unknown";
export type StartDateStatus = "matched" | "mismatched" | "unknown";
export type DisclosureStatus = "defined" | "restricted" | "unknown";

/**
 * 案件×人材単位の「この人材を、この案件に、今、提案準備へ進めてよいか」の判断。
 * スコアではなく、進めてよいかの判断とその根拠・阻害要因を表す。
 */
export type ProposalDecision = {
  opportunityId: string;
  personId: string;
  verdict: ProposalVerdict;
  readiness: ProposalReadiness;
  routeStatus: RouteStatus;
  intentStatus: IntentStatus;
  duplicateStatus: DuplicateStatus;
  startDateStatus: StartDateStatus;
  disclosureStatus: DisclosureStatus;
  assessedAt: string;
  evidenceIds: string[];
  blockerMissingInfoIds: string[];
  blockerConflictIds: string[];
};

export type WorkItem = {
  id: string;
  kind: WorkItemKind;
  source: WorkItemSource;
  /** 取り込み時点の原文のバージョン（ハッシュ・リビジョン等）。原文更新の検知に使う。 */
  sourceVersion: string;
  createdAt: string;
  updatedAt: string;
  assignedAgentId: string | null;
  assignedHumanId: string | null;
  relations: WorkItemRelations;
  status: WorkItemStatus;
  nextAction: NextAction | null;
  dueAt: string | null;
  missingInfo: MissingInfo[];
  conflicts: ConflictInfo[];
  evidenceIds: string[];
  proposalDecisions: ProposalDecision[];
  currentDeliverableId: string | null;
  /** MVPでは常にtrue（人間承認を省略する経路は設計しない）。 */
  approvalRequired: true;
  currentApprovalId: string | null;
  execution: WorkItemExecution;
  mode: WorkItemMode;
  schemaVersion: WorkItemSchemaVersion;
};
