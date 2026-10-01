import { createFakeServerPersistence } from "@/lib/server/persistence/fakeServerPersistence";
import { workItemRevision } from "@/lib/server/persistence/workItemRevision";
import { coreContracts } from "./sharedContracts";
import { work } from "./fixtures";
coreContracts("shared Fake persistence contract", async () => {
  const p = createFakeServerPersistence({ workItems: ["a", "b"].map(tenantId => ({ tenantId, item: { workItem: { ...work(), assignedHumanId: `human-${tenantId}` }, revision: workItemRevision(1) } })) });
  return {
    get: (tenant, id) => p.run(tx => tx.workItems.get(tenant, id)),
    save: (tenant, item, expected) => p.run(tx => tx.workItems.save({ tenantId: tenant, workItem: item, expectedRevision: workItemRevision(expected) })),
    rollback: item => p.run(async tx => { await tx.workItems.save({ tenantId: "a", workItem: item, expectedRevision: workItemRevision(1) }); throw new Error("injected"); }),
    close: async () => {},
  };
});
