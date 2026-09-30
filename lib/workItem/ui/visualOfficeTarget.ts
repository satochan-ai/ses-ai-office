import { officeAgents } from "@/data/office";
import { v3ClaudeOnlyAgents } from "@/data/officeV3ClaudeAgents";
import { v3AgentPlacements, v3CentralTeamPlacements } from "@/data/officeV3ClaudeLayout";
import { projectAgentWorkload, type AgentWorkload } from "@/lib/workItem/projection/agentWorkload";
import type { WorkItem } from "@/types/workItem";

const profiles = new Set([...officeAgents, ...v3ClaudeOnlyAgents].map(agent => agent.id));
const agents = new Set([...v3AgentPlacements, ...v3CentralTeamPlacements].filter(placement => profiles.has(placement.agentId)).map(placement => placement.agentId));
export const isVisualOfficeAgent = (id: string | null): boolean => id !== null && agents.has(id);

export function buildVisualOfficeWorkItemHref(workItemId: string) {
  return { pathname: "/office-v3-claude", query: { workItemId } };
}

export function resolveVisualOfficeTarget(items: WorkItem[], workItemId: string) {
  const item = items.find(current => current.id === workItemId);
  if (!item) return { ok: false, message: "対象のWorkItemが見つかりません" } as const;
  // AgentWorkloadと同じDemo限定fallback。kind等から担当を推測しない。
  const agentId = item.assignedAgentId ?? (item.mode === "demo" && ["preparation_recorded", "returned_for_rework"].includes(item.status) ? item.execution.lastAgentId : null);
  if (!agentId || !isVisualOfficeAgent(agentId)) return { ok: false, message: "このWorkItemの担当AI社員を表示できません" } as const;
  return { ok: true, agentId, workItemId: item.id } as const;
}

export function buildFocusedAgentWorkload(workload: AgentWorkload, items: WorkItem[], focusedId: string | null, now: string): AgentWorkload {
  if (!focusedId) return workload;
  const target = items.find(item => item.id === focusedId);
  if (!target) return workload;
  const card = projectAgentWorkload([target], workload.agentId, now).items[0];
  if (!card) return workload;
  return { ...workload, items: [card, ...workload.items.filter(item => item.id !== focusedId)].slice(0, 3) };
}
