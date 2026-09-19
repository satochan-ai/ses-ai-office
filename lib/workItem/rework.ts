import type { DomainEffect, TransitionResult } from "./stateMachine";
import { transition } from "./stateMachine";
import type { WorkItem } from "@/types/workItem";

export type ReturnForReworkInput = { workItem: WorkItem; actorId: string; returnedAt: string; reason: string };
export type ReturnForReworkResult =
  | { ok: true; workItem: WorkItem; effects: DomainEffect[] }
  | { ok: false; code: "missing-reason" | "invalid-state" | "actor-not-authorized" | "domain-rejected"; message: string };

export function returnWorkItemForRework(input: ReturnForReworkInput): ReturnForReworkResult {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, code: "missing-reason", message: "Rework reason is required." };
  if (input.workItem.assignedHumanId !== null && input.workItem.assignedHumanId !== input.actorId) return { ok: false, code: "actor-not-authorized", message: "Actor is not authorized for this Work Item." };
  const result: TransitionResult = transition(input.workItem, { type: "human-returned-for-rework", at: input.returnedAt, humanId: input.actorId, reason });
  if (!result.ok) return { ok: false, code: result.error.code === "invalid_transition" ? "invalid-state" : "domain-rejected", message: result.error.message };
  return { ok: true, workItem: result.item, effects: result.effects };
}
