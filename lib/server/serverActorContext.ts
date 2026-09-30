import type { ActorRef } from "@/types/workItem";

// 認証済みServer contextから構成する将来契約。認証・tenant権限の実装ではない。
// 現TransportはHuman Commandのみ。agent/systemをhumanとして再解釈しない。
export type ServerActorContext = { actorId: string; actorType: "human"; tenantId: string };
export function toDomainActorRef(context: ServerActorContext): ActorRef {
  return { type: context.actorType, id: context.actorId };
}
