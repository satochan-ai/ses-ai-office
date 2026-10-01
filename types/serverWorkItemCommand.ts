import type { Approval, ApprovalSnapshot } from "./approval";
import type { WorkItem } from "./workItem";
import type { ServerActorContext } from "@/lib/server/serverActorContext";
import type { WorkItemPermission } from "./workItemAuthorization";
import type { ServerPersistenceUnitOfWork } from "./serverWorkItemPersistence";
import type { SafeApiErrorCode, WorkItemCommandDto, WorkItemCommandReceipt } from "./workItemTransport";

export type ServerWorkItemCommandResult =
  | { ok: true; result: WorkItemCommandReceipt }
  | { ok: false; error: { code: SafeApiErrorCode; subcode?: "stale_revision" | "idempotency_mismatch" | "command_in_progress" } };
export type ServerWorkItemCommandInput = {
  dto: WorkItemCommandDto;
  actor: ServerActorContext;
  permissions: readonly WorkItemPermission[];
  expectedRevision: number;
  idempotencyKey: string;
  requestId: string;
  commandId: string;
  clock: () => string;
  persistence: ServerPersistenceUnitOfWork;
  // Server専用resolver。再送のアクセス確認に業務状態・revisionを使わない。
  canAccess: (actor: ServerActorContext, workItem: WorkItem) => boolean;
  resolveSnapshot: (workItem: WorkItem, approval: Approval | null) => ApprovalSnapshot;
  createApprovalId: () => string;
  approvalExpiresAt: string;
  idempotencyExpiresAt: string;
};
