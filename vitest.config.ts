import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    env: {
      // Isolated in-memory DB per test file instead of the real data/hub.sqlite —
      // see the isTest branch in src/lib/db.ts.
      HUB_DB_PATH: ":memory:",
    },
  },
});
