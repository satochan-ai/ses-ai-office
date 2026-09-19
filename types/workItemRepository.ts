import type { Approval } from "@/types/approval";
import type { Evidence, WorkItem } from "@/types/workItem";

export type WorkItemRepository = {
  getWorkItem(id: WorkItem["id"]): Promise<WorkItem | null>;
  saveWorkItem(workItem: WorkItem): Promise<void>;
  listWorkItems(): Promise<WorkItem[]>;
  getApproval(id: Approval["id"]): Promise<Approval | null>;
  saveApproval(approval: Approval): Promise<void>;
  listApprovalsByWorkItem(workItemId: WorkItem["id"]): Promise<Approval[]>;
  getEvidence(id: Evidence["id"]): Promise<Evidence | null>;
  saveEvidence(evidence: Evidence): Promise<void>;
  listEvidenceByWorkItem(workItemId: WorkItem["id"]): Promise<Evidence[]>;
};
