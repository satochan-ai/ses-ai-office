import type {
  ConflictInfo,
  MissingInfo,
  NextAction,
  ProposalDecision,
  WorkItem,
  WorkItemExecution,
  WorkItemRelations,
  WorkItemStatus,
} from "@/types/workItem";

/**
 * Work Itemの状態遷移を担う純粋関数群。
 * React・window・sessionStorage・localStorage・Date.now()には依存しない。
 * 時刻は必ずtriggerの`at`で受け取り、入力のWork Itemは変更しない。
 * 保存・承認・実行ログなどの副作用は`DomainEffect`として宣言するだけで、ここでは実行しない。
 */

type StatusRole = "agent" | "system" | "approval" | "blocked" | "recovery" | "terminal";

const STATUS_ROLE: Record<WorkItemStatus, StatusRole> = {
  intake_received: "agent",
  structuring: "agent",
  candidate_search: "agent",
  condition_match: "agent",
  info_gap_check: "agent",
  draft_generation: "agent",
  quality_check: "agent",
  returned_for_rework: "agent",
  awaiting_approval: "approval",
  preparation_recorded: "system",
  blocked_missing_info: "blocked",
  blocked_no_candidate: "blocked",
  blocked_conflict: "blocked",
  needs_human_input: "blocked",
  approval_expired: "recovery",
  approval_invalidated: "recovery",
  failed_intake: "recovery",
  failed_execution: "recovery",
  closed: "terminal",
  cancelled: "terminal",
  superseded: "terminal",
};

export const WORK_ITEM_STATUSES = Object.keys(STATUS_ROLE) as WorkItemStatus[];

export type ParkStatus =
  | "blocked_missing_info"
  | "blocked_no_candidate"
  | "blocked_conflict"
  | "needs_human_input";

/** agent-completed / human-input-provided と一緒に適用するWork Itemへの更新。配列は全置換する。 */
export type WorkItemPatch = {
  relations?: Partial<WorkItemRelations>;
  missingInfo?: MissingInfo[];
  conflicts?: ConflictInfo[];
  evidenceIds?: string[];
  proposalDecisions?: ProposalDecision[];
  currentDeliverableId?: string | null;
};

export type AgentCompletedTrigger = {
  type: "agent-completed";
  at: string;
  agentId?: string;
  output?: WorkItemPatch;
  /** condition_matchで情報不足確認が不要なとき、info_gap_checkを飛ばしてdraft_generationのguardを直接評価する。 */
  skipInfoGapCheck?: boolean;
};
export type AgentFailedTrigger = {
  type: "agent-failed";
  at: string;
  agentId?: string;
  error: { code: string; message: string };
};
export type HumanApprovedTrigger = { type: "human-approved"; at: string; humanId: string; approvalId: string; approvalState?: "pending" | "approved" | "rejected" | "on_hold" | "expired" | "invalidated" | "withdrawn" };
export type HumanRejectedTrigger = {
  type: "human-rejected";
  at: string;
  humanId: string;
  approvalId: string;
  reason?: string;
};
export type HumanInputProvidedTrigger = {
  type: "human-input-provided";
  at: string;
  humanId: string;
  input?: WorkItemPatch;
};
export type ApprovalExpiredTrigger = { type: "approval-expired"; at: string };
export type DeliverableChangedTrigger = { type: "deliverable-changed"; at: string; deliverableId: string };
export type RetryTrigger = { type: "retry"; at: string };
export type CancelTrigger = { type: "cancel"; at: string; reason?: string };
export type SupersedeTrigger = { type: "supersede"; at: string; supersededByWorkItemId: string };

export type TransitionTrigger =
  | AgentCompletedTrigger
  | AgentFailedTrigger
  | HumanApprovedTrigger
  | HumanRejectedTrigger
  | HumanInputProvidedTrigger
  | ApprovalExpiredTrigger
  | DeliverableChangedTrigger
  | RetryTrigger
  | CancelTrigger
  | SupersedeTrigger;

export type DomainEffect =
  | { type: "assign-agent"; workItemId: string; forStatus: WorkItemStatus }
  | { type: "request-approval"; workItemId: string; deliverableId: string; approvalId: string }
  | {
      type: "invalidate-approval";
      workItemId: string;
      approvalId: string;
      reason: "deliverable_changed" | "expired" | "cancelled" | "superseded";
    }
  | { type: "request-human-input"; workItemId: string; status: ParkStatus }
  | {
      type: "record-execution";
      workItemId: string;
      from: WorkItemStatus;
      to: WorkItemStatus;
      trigger: TransitionTrigger["type"];
      at: string;
      actorId: string | null;
      detail: string | null;
    };

export type GuardFailureCode =
  | "verdict_unfit"
  | "readiness_not_recommended"
  | "readiness_blocked"
  | "intent_declined"
  | "duplicate_confirmed"
  | "route_conflict"
  | "start_date_mismatched"
  | "conflict_blocker_open"
  | "disclosure_not_defined"
  | "missing_info_blocker_open"
  | "evidence_missing"
  | "fit_without_evidence"
  | "no_decisions"
  | "no_candidates"
  | "deliverable_missing"
  | "resume_status_missing";

export type GuardFailureCategory =
  | "rejecting"
  | "conflict"
  | "missing_info"
  | "unclassified"
  | "no_candidate"
  | "invariant";

const FAILURE_CATEGORY: Record<GuardFailureCode, GuardFailureCategory> = {
  verdict_unfit: "rejecting",
  readiness_not_recommended: "rejecting",
  intent_declined: "rejecting",
  duplicate_confirmed: "rejecting",
  route_conflict: "conflict",
  start_date_mismatched: "conflict",
  conflict_blocker_open: "conflict",
  disclosure_not_defined: "missing_info",
  missing_info_blocker_open: "missing_info",
  evidence_missing: "missing_info",
  readiness_blocked: "unclassified",
  no_decisions: "no_candidate",
  no_candidates: "no_candidate",
  fit_without_evidence: "invariant",
  deliverable_missing: "invariant",
  resume_status_missing: "invariant",
};

export type GuardFailure = {
  code: GuardFailureCode;
  category: GuardFailureCategory;
  opportunityId: string | null;
  personId: string | null;
  /** blockerとして残っているMissingInfo / ConflictInfoのid。 */
  refIds: string[];
};

export type TransitionSuccess = {
  ok: true;
  item: WorkItem;
  from: WorkItemStatus;
  to: WorkItemStatus;
  effects: DomainEffect[];
  /** blocked / needs_human_input へ止めた場合の理由。通常の遷移では空。 */
  guardFailures: GuardFailure[];
};

export type TransitionError = {
  code: "invalid_transition" | "guard_failed" | "invalid_trigger";
  message: string;
  from: WorkItemStatus;
  trigger: TransitionTrigger["type"];
  failures: GuardFailure[];
};

export type TransitionFailure = { ok: false; error: TransitionError };
export type TransitionResult = TransitionSuccess | TransitionFailure;

function failure(
  code: GuardFailureCode,
  extras: Partial<Pick<GuardFailure, "opportunityId" | "personId" | "refIds">> = {},
): GuardFailure {
  return { code, category: FAILURE_CATEGORY[code], opportunityId: null, personId: null, refIds: [], ...extras };
}

function isOpen(info: { status: string } | undefined): boolean {
  // 参照先が存在しないblockerは、解消を確認できないので残っているものとして扱う。
  return info === undefined || info.status === "open";
}

/** 1つのProposalDecisionが提案準備（draft_generation）へ進めない理由。空なら進めてよい。 */
export function evaluateProposalDecision(item: WorkItem, decision: ProposalDecision): GuardFailure[] {
  const failures: GuardFailure[] = [];
  const add = (code: GuardFailureCode, refIds: string[] = []) =>
    failures.push(failure(code, { opportunityId: decision.opportunityId, personId: decision.personId, refIds }));

  if (decision.verdict === "unfit") add("verdict_unfit");
  if (decision.readiness === "not_recommended") add("readiness_not_recommended");
  if (decision.readiness === "blocked") add("readiness_blocked");
  if (decision.intentStatus === "declined") add("intent_declined");
  if (decision.duplicateStatus === "confirmed") add("duplicate_confirmed");
  if (decision.routeStatus === "conflict") add("route_conflict");
  if (decision.startDateStatus === "mismatched") add("start_date_mismatched");
  if (decision.disclosureStatus !== "defined") add("disclosure_not_defined");

  const openMissingInfo = decision.blockerMissingInfoIds.filter(id =>
    isOpen(item.missingInfo.find(info => info.id === id)),
  );
  if (openMissingInfo.length > 0) add("missing_info_blocker_open", openMissingInfo);

  const openConflicts = decision.blockerConflictIds.filter(id =>
    isOpen(item.conflicts.find(conflict => conflict.id === id)),
  );
  if (openConflicts.length > 0) add("conflict_blocker_open", openConflicts);

  if (decision.evidenceIds.length === 0) add(decision.verdict === "fit" ? "fit_without_evidence" : "evidence_missing");

  return failures;
}

/** 根拠のないfitのように、データとして存在してはいけない状態。 */
export function findInvariantViolations(item: WorkItem): GuardFailure[] {
  return item.proposalDecisions
    .filter(decision => decision.verdict === "fit" && decision.evidenceIds.length === 0)
    .map(decision =>
      failure("fit_without_evidence", { opportunityId: decision.opportunityId, personId: decision.personId }),
    );
}

export type DraftGenerationGuardResult =
  | { outcome: "proceed"; eligibleDecisions: ProposalDecision[]; failures: GuardFailure[] }
  | { outcome: "invariant_violation"; failures: GuardFailure[] }
  | { outcome: "blocked"; parkStatus: ParkStatus; failures: GuardFailure[] };

type DecisionEvaluation = { decision: ProposalDecision; failures: GuardFailure[] };

function evaluateAll(item: WorkItem): DecisionEvaluation[] {
  return item.proposalDecisions.map(decision => ({ decision, failures: evaluateProposalDecision(item, decision) }));
}

/** 提案候補として見込みが残っている（人材側の理由で却下されていない）判断だけを残す。 */
function liveEvaluations(evaluations: DecisionEvaluation[]): DecisionEvaluation[] {
  return evaluations.filter(entry => !entry.failures.some(f => f.category === "rejecting"));
}

function collectFailures(item: WorkItem, evaluations: DecisionEvaluation[]): GuardFailure[] {
  const failures = evaluations.flatMap(entry => entry.failures);
  return item.proposalDecisions.length === 0 ? [failure("no_decisions")] : failures;
}

function resolveParkStatus(evaluations: DecisionEvaluation[]): ParkStatus {
  const live = liveEvaluations(evaluations);
  if (live.length === 0) return "blocked_no_candidate";
  const liveFailures = live.flatMap(entry => entry.failures);
  if (liveFailures.some(f => f.category === "conflict")) return "blocked_conflict";
  if (liveFailures.some(f => f.category === "missing_info")) return "blocked_missing_info";
  return "needs_human_input";
}

/**
 * condition_match / info_gap_check から draft_generation へ進んでよいかを判定する。
 * 1件でもすべての条件を満たすProposalDecisionがあれば進める。unknownは、それだけではunfit扱いにしない。
 */
export function checkDraftGenerationGuard(item: WorkItem): DraftGenerationGuardResult {
  const invariantViolations = findInvariantViolations(item);
  if (invariantViolations.length > 0) return { outcome: "invariant_violation", failures: invariantViolations };

  const evaluations = evaluateAll(item);
  const failures = collectFailures(item, evaluations);
  const eligibleDecisions = evaluations.filter(entry => entry.failures.length === 0).map(entry => entry.decision);
  if (eligibleDecisions.length > 0) return { outcome: "proceed", eligibleDecisions, failures };

  return { outcome: "blocked", parkStatus: resolveParkStatus(evaluations), failures };
}

function nextActionFor(status: WorkItemStatus): NextAction | null {
  switch (STATUS_ROLE[status]) {
    case "agent":
      return { kind: "run_agent", ownerType: "agent" };
    case "approval":
      return { kind: "approve_or_reject", ownerType: "human" };
    case "system":
      return { kind: "close", ownerType: "system" };
    case "blocked":
      return { kind: "provide_human_input", ownerType: "human" };
    case "recovery":
      return { kind: "retry", ownerType: "system" };
    case "terminal":
      return null;
  }
}

function isTerminalStatus(status: WorkItemStatus): boolean {
  return STATUS_ROLE[status] === "terminal";
}

/** 復帰先にできるのは、担当が処理を再実行できる状態だけ。 */
function isResumableStatus(status: WorkItemStatus | null): status is WorkItemStatus {
  return status !== null && (STATUS_ROLE[status] === "agent" || status === "preparation_recorded");
}

/** 提案準備が記録された後・終端状態からの取り消しは受け付けない。 */
function isTerminable(status: WorkItemStatus): boolean {
  return !isTerminalStatus(status) && status !== "preparation_recorded";
}

function applyPatch(item: WorkItem, patch: WorkItemPatch | undefined): WorkItem {
  if (!patch) return item;
  return {
    ...item,
    relations: patch.relations ? { ...item.relations, ...patch.relations } : item.relations,
    missingInfo: patch.missingInfo ?? item.missingInfo,
    conflicts: patch.conflicts ?? item.conflicts,
    evidenceIds: patch.evidenceIds ?? item.evidenceIds,
    proposalDecisions: patch.proposalDecisions ?? item.proposalDecisions,
    currentDeliverableId:
      patch.currentDeliverableId !== undefined ? patch.currentDeliverableId : item.currentDeliverableId,
  };
}

function actorOf(trigger: TransitionTrigger): string | null {
  switch (trigger.type) {
    case "human-approved":
    case "human-rejected":
    case "human-input-provided":
      return trigger.humanId;
    case "agent-completed":
    case "agent-failed":
      return trigger.agentId ?? null;
    default:
      return null;
  }
}

type CommitOptions = {
  to: WorkItemStatus;
  set?: Partial<WorkItem>;
  execution?: Partial<WorkItemExecution>;
  effects?: DomainEffect[];
  detail?: string;
  guardFailures?: GuardFailure[];
  /** 同じ状態のまま担当AIを割り当て直す（成果物が変わってQCをやり直す場合など）。 */
  reassign?: boolean;
};

function commit(base: WorkItem, trigger: TransitionTrigger, options: CommitOptions): TransitionSuccess {
  const from = base.status;
  const { to } = options;
  const reassign = to !== from || options.reassign === true;

  const item: WorkItem = {
    ...base,
    ...options.set,
    status: to,
    updatedAt: trigger.at,
    assignedAgentId: reassign ? null : base.assignedAgentId,
    nextAction: nextActionFor(to),
    execution: { ...base.execution, resumeStatus: null, ...options.execution },
  };

  const effects: DomainEffect[] = [
    {
      type: "record-execution",
      workItemId: base.id,
      from,
      to,
      trigger: trigger.type,
      at: trigger.at,
      actorId: actorOf(trigger),
      detail: options.detail ?? null,
    },
  ];
  if (reassign && STATUS_ROLE[to] === "agent") {
    effects.push({ type: "assign-agent", workItemId: base.id, forStatus: to });
  }
  effects.push(...(options.effects ?? []));

  return { ok: true, item, from, to, effects, guardFailures: options.guardFailures ?? [] };
}

function park(
  base: WorkItem,
  trigger: TransitionTrigger,
  to: ParkStatus,
  failures: GuardFailure[],
  execution: Partial<WorkItemExecution>,
  resumeStatus: WorkItemStatus,
): TransitionSuccess {
  return commit(base, trigger, {
    to,
    execution: { ...execution, resumeStatus },
    guardFailures: failures,
    effects: [{ type: "request-human-input", workItemId: base.id, status: to }],
  });
}

function fail(
  item: WorkItem,
  trigger: TransitionTrigger,
  code: TransitionError["code"],
  message: string,
  failures: GuardFailure[] = [],
): TransitionFailure {
  return { ok: false, error: { code, message, from: item.status, trigger: trigger.type, failures } };
}

function invalidTransition(item: WorkItem, trigger: TransitionTrigger): TransitionFailure {
  return fail(item, trigger, "invalid_transition", `Trigger "${trigger.type}" is not allowed in status "${item.status}".`);
}

function deliverableMissing(item: WorkItem, trigger: TransitionTrigger): TransitionFailure {
  return fail(
    item,
    trigger,
    "guard_failed",
    `Status "${item.status}" requires a current deliverable.`,
    [failure("deliverable_missing")],
  );
}

function invariantViolation(item: WorkItem, trigger: TransitionTrigger, failures: GuardFailure[]): TransitionFailure {
  return fail(item, trigger, "guard_failed", "A fit decision must be backed by at least one evidence.", failures);
}

function advanceFromGate(
  base: WorkItem,
  trigger: TransitionTrigger,
  execution: Partial<WorkItemExecution>,
): TransitionResult {
  const guard = checkDraftGenerationGuard(base);
  switch (guard.outcome) {
    case "proceed":
      return commit(base, trigger, { to: "draft_generation", execution });
    case "invariant_violation":
      return invariantViolation(base, trigger, guard.failures);
    case "blocked":
      return park(
        base,
        trigger,
        guard.parkStatus,
        guard.failures,
        execution,
        guard.parkStatus === "blocked_no_candidate" ? "candidate_search" : "info_gap_check",
      );
  }
}

function onAgentCompleted(item: WorkItem, trigger: AgentCompletedTrigger): TransitionResult {
  const base = applyPatch(item, trigger.output);
  const execution: Partial<WorkItemExecution> = { lastAgentId: trigger.agentId ?? item.assignedAgentId, lastError: null };

  if (STATUS_ROLE[item.status] === "agent" && trigger.output?.proposalDecisions) {
    const violations = findInvariantViolations(base);
    if (violations.length > 0) return invariantViolation(item, trigger, violations);
  }

  switch (item.status) {
    case "intake_received":
      return commit(base, trigger, { to: "structuring", execution });
    case "structuring":
      return commit(base, trigger, { to: "candidate_search", execution });
    case "candidate_search":
      if (base.relations.personIds.length === 0) {
        return park(base, trigger, "blocked_no_candidate", [failure("no_candidates")], execution, "candidate_search");
      }
      return commit(base, trigger, { to: "condition_match", execution });
    case "condition_match": {
      const evaluations = evaluateAll(base);
      if (liveEvaluations(evaluations).length === 0) {
        return park(
          base,
          trigger,
          "blocked_no_candidate",
          collectFailures(base, evaluations),
          execution,
          "candidate_search",
        );
      }
      if (trigger.skipInfoGapCheck) return advanceFromGate(base, trigger, execution);
      return commit(base, trigger, { to: "info_gap_check", execution });
    }
    case "info_gap_check":
      return advanceFromGate(base, trigger, execution);
    case "draft_generation":
    case "returned_for_rework":
      if (base.currentDeliverableId === null) return deliverableMissing(item, trigger);
      return commit(base, trigger, { to: "quality_check", execution });
    case "quality_check":
      if (base.currentDeliverableId === null) return deliverableMissing(item, trigger);
      {
        const approvalId = `approval:${base.id}:${trigger.at}`;
      return commit(base, trigger, {
        to: "awaiting_approval",
        execution,
        set: { currentApprovalId: approvalId },
        effects: [{ type: "request-approval", workItemId: base.id, deliverableId: base.currentDeliverableId, approvalId }],
      });
      }
    case "preparation_recorded":
      return commit(base, trigger, { to: "closed", execution });
    default:
      return invalidTransition(item, trigger);
  }
}

function onAgentFailed(item: WorkItem, trigger: AgentFailedTrigger): TransitionResult {
  const execution: Partial<WorkItemExecution> = {
    attempt: Math.max(1, item.execution.attempt),
    lastAgentId: trigger.agentId ?? item.assignedAgentId,
    lastError: { ...trigger.error, at: trigger.at },
    resumeStatus: item.status,
  };

  switch (item.status) {
    case "intake_received":
    case "structuring":
      return commit(item, trigger, { to: "failed_intake", execution, detail: trigger.error.code });
    case "candidate_search":
    case "condition_match":
    case "info_gap_check":
    case "draft_generation":
    case "quality_check":
    case "returned_for_rework":
    case "preparation_recorded":
      return commit(item, trigger, { to: "failed_execution", execution, detail: trigger.error.code });
    default:
      return invalidTransition(item, trigger);
  }
}

function onHumanApproved(item: WorkItem, trigger: HumanApprovedTrigger): TransitionResult {
  if (item.status !== "awaiting_approval") return invalidTransition(item, trigger);
  if (item.currentDeliverableId === null) return deliverableMissing(item, trigger);
  if (item.currentApprovalId === null || item.currentApprovalId !== trigger.approvalId) {
    return fail(item, trigger, "invalid_trigger", "The approval does not match the current approval request.");
  }
  if (trigger.approvalState !== undefined && trigger.approvalState !== "pending") {
    return fail(item, trigger, "invalid_trigger", "Only a pending approval can be approved.");
  }
  if (item.assignedHumanId === null || item.assignedHumanId !== trigger.humanId) {
    return fail(item, trigger, "invalid_trigger", "The approver does not match the assigned human.");
  }
  // 外部送信・CRM更新は行わず、「提案準備を記録した」ところで止める。
  return commit(item, trigger, { to: "preparation_recorded", set: { currentApprovalId: trigger.approvalId } });
}

function onHumanRejected(item: WorkItem, trigger: HumanRejectedTrigger): TransitionResult {
  if (item.status !== "awaiting_approval") return invalidTransition(item, trigger);
  if (item.currentApprovalId === null || item.currentApprovalId !== trigger.approvalId) {
    return fail(item, trigger, "invalid_trigger", "The approval does not match the current approval request.");
  }
  if (item.assignedHumanId === null || item.assignedHumanId !== trigger.humanId) {
    return fail(item, trigger, "invalid_trigger", "The rejecter does not match the assigned human.");
  }
  return commit(item, trigger, { to: "returned_for_rework", set: { currentApprovalId: null }, detail: trigger.reason });
}

const DEFAULT_RESUME_STATUS: Partial<Record<WorkItemStatus, WorkItemStatus>> = {
  blocked_missing_info: "info_gap_check",
  blocked_conflict: "info_gap_check",
  needs_human_input: "info_gap_check",
  blocked_no_candidate: "candidate_search",
};

function onHumanInputProvided(item: WorkItem, trigger: HumanInputProvidedTrigger): TransitionResult {
  const fallback = DEFAULT_RESUME_STATUS[item.status];
  if (fallback === undefined) return invalidTransition(item, trigger);

  const base = applyPatch(item, trigger.input);
  if (trigger.input?.proposalDecisions) {
    const violations = findInvariantViolations(base);
    if (violations.length > 0) return invariantViolation(item, trigger, violations);
  }

  const stored = item.execution.resumeStatus;
  const resume = isResumableStatus(stored) && STATUS_ROLE[stored] === "agent" ? stored : fallback;
  return commit(base, trigger, { to: resume });
}

function onApprovalExpired(item: WorkItem, trigger: ApprovalExpiredTrigger): TransitionResult {
  if (item.status !== "awaiting_approval") return invalidTransition(item, trigger);
  const effects: DomainEffect[] =
    item.currentApprovalId === null
      ? []
      : [{ type: "invalidate-approval", workItemId: item.id, approvalId: item.currentApprovalId, reason: "expired" }];
  return commit(item, trigger, { to: "approval_expired", set: { currentApprovalId: null }, effects });
}

function onDeliverableChanged(item: WorkItem, trigger: DeliverableChangedTrigger): TransitionResult {
  const set: Partial<WorkItem> = { currentDeliverableId: trigger.deliverableId };

  switch (item.status) {
    case "draft_generation":
    case "returned_for_rework":
      return commit(item, trigger, { to: item.status, set });
    case "quality_check":
      return commit(item, trigger, { to: "quality_check", set, reassign: true });
    case "awaiting_approval":
      return commit(item, trigger, {
        to: "approval_invalidated",
        set: { ...set, currentApprovalId: null },
        effects:
          item.currentApprovalId === null
            ? []
            : [
                {
                  type: "invalidate-approval",
                  workItemId: item.id,
                  approvalId: item.currentApprovalId,
                  reason: "deliverable_changed",
                },
              ],
      });
    default:
      return invalidTransition(item, trigger);
  }
}

function onRetry(item: WorkItem, trigger: RetryTrigger): TransitionResult {
  if (item.execution.attempt >= 3) {
    if (item.status === "failed_execution") {
      return commit(item, trigger, {
        to: "needs_human_input",
        execution: { attempt: item.execution.attempt, resumeStatus: item.execution.resumeStatus },
        guardFailures: [failure("resume_status_missing")],
        effects: [{ type: "request-human-input", workItemId: item.id, status: "needs_human_input" }],
      });
    }
    return fail(item, trigger, "guard_failed", "Automatic retry limit exceeded.");
  }
  const attempt = item.execution.attempt + 1;
  const stored = item.execution.resumeStatus;

  switch (item.status) {
    case "failed_intake": {
      const resume = stored === "structuring" ? "structuring" : "intake_received";
      return commit(item, trigger, { to: resume, execution: { attempt } });
    }
    case "failed_execution":
      if (!isResumableStatus(stored)) {
        return fail(item, trigger, "guard_failed", "No status to resume from.", [failure("resume_status_missing")]);
      }
      return commit(item, trigger, { to: stored, execution: { attempt } });
    case "approval_expired":
      if (item.currentDeliverableId === null) return deliverableMissing(item, trigger);
      const approvalId = `approval:${item.id}:${trigger.at}`;
      return commit(item, trigger, {
        to: "awaiting_approval",
        set: { currentApprovalId: approvalId },
        effects: [{ type: "request-approval", workItemId: item.id, deliverableId: item.currentDeliverableId, approvalId }],
      });
    case "approval_invalidated":
      return commit(item, trigger, { to: "quality_check" });
    default:
      return invalidTransition(item, trigger);
  }
}

function terminate(
  item: WorkItem,
  trigger: CancelTrigger | SupersedeTrigger,
): TransitionResult {
  if (!isTerminable(item.status)) return invalidTransition(item, trigger);

  const isCancel = trigger.type === "cancel";
  const effects: DomainEffect[] =
    item.currentApprovalId === null
      ? []
      : [
          {
            type: "invalidate-approval",
            workItemId: item.id,
            approvalId: item.currentApprovalId,
            reason: isCancel ? "cancelled" : "superseded",
          },
        ];

  if (trigger.type === "cancel") {
    return commit(item, trigger, {
      to: "cancelled",
      set: { currentApprovalId: null },
      effects,
      detail: trigger.reason,
    });
  }
  return commit(item, trigger, {
    to: "superseded",
    set: {
      currentApprovalId: null,
      relations: { ...item.relations, supersededByWorkItemId: trigger.supersededByWorkItemId },
    },
    effects,
  });
}

/**
 * Work Itemの状態を変える唯一の入口。UIやhookからstatusを直接書き換えず、必ずここを通す。
 * 許可されない遷移・guard違反は`ok: false`を返し、入力のWork Itemは変更しない。
 */
export function transition(item: WorkItem, trigger: TransitionTrigger): TransitionResult {
  switch (trigger.type) {
    case "agent-completed":
      return onAgentCompleted(item, trigger);
    case "agent-failed":
      return onAgentFailed(item, trigger);
    case "human-approved":
      return onHumanApproved(item, trigger);
    case "human-rejected":
      return onHumanRejected(item, trigger);
    case "human-input-provided":
      return onHumanInputProvided(item, trigger);
    case "approval-expired":
      return onApprovalExpired(item, trigger);
    case "deliverable-changed":
      return onDeliverableChanged(item, trigger);
    case "retry":
      return onRetry(item, trigger);
    case "cancel":
    case "supersede":
      return terminate(item, trigger);
  }
}
