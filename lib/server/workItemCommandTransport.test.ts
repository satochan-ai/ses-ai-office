import { describe, expect, it, vi } from "vitest";
import type { WorkItemCommandDto } from "@/types/workItemTransport";
import { toDomainActorRef } from "./serverActorContext";
import { parseWorkItemCommandDto, toDomainWorkItemCommand } from "./workItemCommandTransport";

const commands: WorkItemCommandDto[] = [
  { type: "approve-work-item", workItemId: "w", approvalId: "a" },
  { type: "reject-work-item", workItemId: "w", approvalId: "a", reason: "再確認" },
  { type: "return-for-rework", workItemId: "w", reason: "再作業" },
  { type: "provide-missing-info", workItemId: "w", missingInfoId: "m", resolution: { field: "personIntent", status: "confirmed" } },
];
describe("Command Transport parser", () => {
  it.each(commands)("accepts $type", dto => { expect(parseWorkItemCommandDto(dto)).toEqual({ ok: true, dto }); });
  it.each(["actorId", "issuedAt", "commandId", "tenantId", "role", "status", "currentApprovalId", "approvalSnapshots", "permissions", "approver", "bindingHash", "evidence", "expectedRevision", "idempotencyKey", "unknown"])("rejects extra %s in every command", key => {
    for (const dto of commands) expect(parseWorkItemCommandDto({ ...dto, [key]: "injected" })).toEqual({ ok: false, code: "validation_error" });
  });
  it.each([null, undefined, [], "text", 42, {}, { type: "unknown", workItemId: "w" }])("rejects invalid JSON shape/type %j", input => {
    expect(parseWorkItemCommandDto(input)).toEqual({ ok: false, code: "validation_error" });
  });
  it("requires trimmed identifiers and reasons without accepting coercion", () => {
    for (const reason of ["", "  ", null, 123]) {
      for (const dto of commands.slice(1, 3)) expect(parseWorkItemCommandDto({ ...dto, reason }).ok).toBe(false);
    }
    for (const dto of commands) {
      for (const workItemId of [" ", null, 123]) expect(parseWorkItemCommandDto({ ...dto, workItemId }).ok).toBe(false);
    }
    expect(parseWorkItemCommandDto({ ...commands[0], approvalId: " " }).ok).toBe(false);
    expect(parseWorkItemCommandDto({ ...commands[3], missingInfoId: " " }).ok).toBe(false);
    expect(parseWorkItemCommandDto({ ...commands[1], reason: "  再確認  " })).toMatchObject({ ok: true, dto: { reason: "再確認" } });
  });
  it.each([
    { field: "proposalRoute", status: "clear", note: "確認済み" },
    { field: "personIntent", status: "declined" },
    { field: "availabilityStart", status: "matched", date: "2026-10-01" },
    { field: "duplicateProposal", status: "possible" },
    { field: "disclosureScope", status: "restricted" },
    { field: "informationFreshness", note: "確認済み" },
    { field: "informationFreshness" },
  ])("accepts resolution $field", resolution => {
    expect(parseWorkItemCommandDto({ ...commands[3], resolution })).toMatchObject({ ok: true, dto: { resolution } });
  });
  it.each([null, [], {}, { field: "unknown" }, { field: "personIntent", status: "clear" }, { field: "personIntent", status: "confirmed", note: 42 }, { field: "availabilityStart", status: "matched" }, { field: "availabilityStart", status: "matched", date: " " }, { field: "informationFreshness", status: "confirmed" }, { field: "personIntent", status: "confirmed", actorId: "injected" }])("rejects malformed resolution %j", resolution => {
    expect(parseWorkItemCommandDto({ ...commands[3], resolution })).toEqual({ ok: false, code: "validation_error" });
  });
  it("returns independent DTO data instead of casting the input", () => {
    const input = { type: "provide-missing-info", workItemId: "w", missingInfoId: "m", resolution: { field: "personIntent", status: "confirmed" } };
    const result = parseWorkItemCommandDto(input);
    input.resolution.status = "declined";
    expect(result).toMatchObject({ ok: true, dto: { resolution: { status: "confirmed" } } });
  });
});
describe("Server-only command mapping", () => {
  const actor = { actorId: "authenticated-human", actorType: "human" as const, tenantId: "tenant-1" };
  it.each(commands)("maps $type using Server identity and injected time/id", dto => {
    const clock = vi.fn(() => "2026-10-01T01:00:00.000Z");
    const mapped = toDomainWorkItemCommand(dto, actor, { commandId: "server-command", clock });
    expect(mapped).toMatchObject({ type: dto.type, workItemId: "w", commandId: "server-command", actorId: actor.actorId, issuedAt: "2026-10-01T01:00:00.000Z" });
    expect(clock).toHaveBeenCalledTimes(1);
    if (dto.type === "provide-missing-info") expect(mapped).toEqual({ type: dto.type, workItemId: "w", commandId: "server-command", actorId: actor.actorId, issuedAt: "2026-10-01T01:00:00.000Z", missingInfoId: "m", value: dto.resolution });
    else expect(mapped).toEqual({ ...dto, commandId: "server-command", actorId: actor.actorId, issuedAt: "2026-10-01T01:00:00.000Z" });
    expect(mapped).not.toHaveProperty("tenantId");
    expect(mapped).not.toHaveProperty("approvalSnapshots");
  });
  it("maps ActorRef from Server context", () => { expect(toDomainActorRef(actor)).toEqual({ type: "human", id: "authenticated-human" }); });
});
