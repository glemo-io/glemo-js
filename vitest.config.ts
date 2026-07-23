import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  resolve: {
    // Resolve the workspace SDK from source so tests never need a prior build.
    alias: { "@glemo/sdk": resolve(import.meta.dirname, "packages/sdk/src/index.ts") },
  },
});
