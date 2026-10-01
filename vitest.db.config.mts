import path from "node:path";
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["tests/db/**/*.db.test.ts"], fileParallelism: false, testTimeout: 15000, hookTimeout: 15000 },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
});
