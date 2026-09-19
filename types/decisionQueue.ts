import type { NextAction, ProposalDecision, WorkItem, WorkItemKind, WorkItemStatus } from "@/types/workItem";

export type DecisionQueueBucket = "needs_decision_today" | "awaiting_approval" | "missing_info" | "overdue" | "execution_failed" | "awaiting_human";
export type ProposalDecisionSummary = Pick<ProposalDecision, "verdict" | "readiness" | "routeStatus" | "intentStatus" | "duplicateStatus" | "startDateStatus" | "disclosureStatus">;

export type DecisionCard = {
  workItemId: WorkItem["id"];
  kind: WorkItemKind;
  title: string;
  bucket: DecisionQueueBucket;
  status: WorkItemStatus;
  statusLabel: string;
  assignedAgentId: string | null;
  assignedHumanId: string | null;
  nextAction: NextAction | null;
  dueAt: string | null;
  severity: "critical" | "warning" | "normal";
  proposalDecision: ProposalDecisionSummary | null;
  missingInfoCount: number;
  blockerMissingInfoCount: number;
  conflictCount: number;
  blockerConflictCount: number;
  evidenceCount: number;
  reasonSummary: string[];
  requiredHumanAction: string | null;
  isDemo: boolean;
  needsDecisionToday: boolean;
};

export type DecisionQueue = {
  cards: DecisionCard[];
  buckets: Record<DecisionQueueBucket, number>;
  needsDecisionTodayCount: number;
};
