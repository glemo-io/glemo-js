import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const r = (p: string) => resolve(root, p);

describe("glemo-js is a production-grade public monorepo", () => {
  test("ships the essential open-source files", () => {
    for (const f of [
      "LICENSE",
      "README.md",
      "CONTRIBUTING.md",
      "SECURITY.md",
      ".github/CODEOWNERS",
      ".github/pull_request_template.md",
    ]) {
      expect(existsSync(r(f)), `missing ${f}`).toBe(true);
    }
  });

  test("is a pnpm workspace with a private root", () => {
    const pkg = JSON.parse(readFileSync(r("package.json"), "utf8")) as { private?: boolean };
    expect(pkg.private).toBe(true);
    expect(existsSync(r("pnpm-workspace.yaml"))).toBe(true);
  });

  test("gitignores the build artifacts", () => {
    expect(readFileSync(r(".gitignore"), "utf8")).toMatch(/packages\/\*\/dist/);
  });

  test("regenerates SDK types from a repo-local contract, not a sibling repo", () => {
    const sdk = JSON.parse(readFileSync(r("packages/sdk/package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(sdk.scripts["gen:schema"]).not.toMatch(/glemo-backend/);
    // types are generated from the curated PUBLIC subset, never the full contract
    expect(sdk.scripts["gen:schema"]).toMatch(/openapi\.public\.json/);
    expect(existsSync(r("scripts/sync-openapi.mjs"))).toBe(true);
  });

  test("holds both publishable packages", () => {
    for (const [dir, name] of [
      ["sdk", "@glemo/sdk"],
      ["verify-widget", "@glemo/verify-widget"],
    ]) {
      const pkg = JSON.parse(readFileSync(r(`packages/${dir}/package.json`), "utf8")) as {
        name: string;
        publishConfig?: { access?: string };
      };
      expect(pkg.name).toBe(name);
      expect(pkg.publishConfig?.access).toBe("public");
      expect(existsSync(r(`packages/${dir}/src/index.ts`))).toBe(true);
    }
  });
});
