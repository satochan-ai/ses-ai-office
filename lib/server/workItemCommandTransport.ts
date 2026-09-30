import type { WorkItemCommand } from "@/types/workItemCommand";
import type { MissingInfoResolutionValue } from "@/types/workItemResolution";
import type { WorkItemCommandDto } from "@/types/workItemTransport";
import type { ServerActorContext } from "./serverActorContext";

export type CommandDtoParseResult = { ok: true; dto: WorkItemCommandDto } | { ok: false; code: "validation_error" };
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const onlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
function resolution(value: unknown): MissingInfoResolutionValue | null {
  if (!isObject(value)) return null;
  if (value.field === "availabilityStart") {
    if (!onlyKeys(value, ["field", "status", "date"]) || (value.status !== "matched" && value.status !== "mismatched") || !text(value.date)) return null;
    return { field: value.field, status: value.status, date: value.date.trim() };
  }
  if (!onlyKeys(value, ["field", "status", "note"]) || ("note" in value && typeof value.note !== "string")) return null;
  const note = typeof value.note === "string" ? { note: value.note } : {};
  switch (value.field) {
    case "proposalRoute": return value.status === "clear" || value.status === "conflict" ? { field: value.field, status: value.status, ...note } : null;
    case "personIntent": return value.status === "confirmed" || value.status === "declined" ? { field: value.field, status: value.status, ...note } : null;
    case "duplicateProposal": return value.status === "none" || value.status === "possible" || value.status === "confirmed" ? { field: value.field, status: value.status, ...note } : null;
    case "disclosureScope": return value.status === "defined" || value.status === "restricted" ? { field: value.field, status: value.status, ...note } : null;
    case "informationFreshness": return onlyKeys(value, ["field", "note"]) ? { field: value.field, ...note } : null;
    default: return null;
  }
}
export function parseWorkItemCommandDto(input: unknown): CommandDtoParseResult {
  const invalid: CommandDtoParseResult = { ok: false, code: "validation_error" };
  if (!isObject(input) || !text(input.workItemId)) return invalid;
  const workItemId = input.workItemId.trim();
  switch (input.type) {
    case "approve-work-item":
      return onlyKeys(input, ["type", "workItemId", "approvalId"]) && text(input.approvalId)
        ? { ok: true, dto: { type: input.type, workItemId, approvalId: input.approvalId.trim() } } : invalid;
    case "reject-work-item":
      return onlyKeys(input, ["type", "workItemId", "approvalId", "reason"]) && text(input.approvalId) && text(input.reason)
        ? { ok: true, dto: { type: input.type, workItemId, approvalId: input.approvalId.trim(), reason: input.reason.trim() } } : invalid;
    case "return-for-rework":
      return onlyKeys(input, ["type", "workItemId", "reason"]) && text(input.reason)
        ? { ok: true, dto: { type: input.type, workItemId, reason: input.reason.trim() } } : invalid;
    case "provide-missing-info": {
      if (!onlyKeys(input, ["type", "workItemId", "missingInfoId", "resolution"]) || !text(input.missingInfoId)) return invalid;
      const parsed = resolution(input.resolution);
      return parsed ? { ok: true, dto: { type: input.type, workItemId, missingInfoId: input.missingInfoId.trim(), resolution: parsed } } : invalid;
    }
    default: return invalid;
  }
}
// 呼出元が検証済みDTOと認証済みcontextを渡す。tenantはDomain Commandへ混入させない。
export function toDomainWorkItemCommand(dto: WorkItemCommandDto, actor: ServerActorContext, options: { commandId: string; clock: () => string }): WorkItemCommand {
  const base = { commandId: options.commandId, workItemId: dto.workItemId, actorId: actor.actorId, issuedAt: options.clock() };
  switch (dto.type) {
    case "approve-work-item": return { ...base, type: dto.type, approvalId: dto.approvalId };
    case "reject-work-item": return { ...base, type: dto.type, approvalId: dto.approvalId, reason: dto.reason };
    case "return-for-rework": return { ...base, type: dto.type, reason: dto.reason };
    case "provide-missing-info": return { ...base, type: dto.type, missingInfoId: dto.missingInfoId, value: { ...dto.resolution } };
  }
}
