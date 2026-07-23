import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

// vitest runs from the repo root (root vitest.config.ts).
const pkgDir = resolve(process.cwd(), "packages/sdk");
const pkg = JSON.parse(readFileSync(`${pkgDir}/package.json`, "utf8")) as Record<string, unknown>;

describe("@glemo/sdk is publish-ready", () => {
  test("is publishable under a public scope", () => {
    expect(pkg.private).not.toBe(true);
    expect((pkg.publishConfig as { access?: string } | undefined)?.access).toBe("public");
  });

  test("carries the metadata npm and consumers expect", () => {
    expect(pkg.license).toBeTruthy();
    expect((pkg.engines as { node?: string } | undefined)?.node).toBeTruthy();
    expect(pkg.repository).toBeTruthy();
    expect(pkg.description).toBeTruthy();
    expect(Array.isArray(pkg.keywords) && (pkg.keywords as string[]).length > 0).toBe(true);
  });

  test("resolves its entry points", () => {
    expect(pkg.main).toBeTruthy();
    expect(pkg.module).toBeTruthy();
    expect(pkg.types).toBeTruthy();
    expect((pkg.exports as Record<string, unknown>)?.["."]).toBeTruthy();
  });

  test("ships dist + docs + license and rebuilds on prepack", () => {
    for (const f of ["dist", "CHANGELOG.md", "README.md", "LICENSE"]) {
      expect(pkg.files as string[]).toContain(f);
    }
    expect((pkg.scripts as Record<string, string>)?.prepack).toMatch(/build/);
  });

  test("the LICENSE file exists on disk", () => {
    expect(existsSync(`${pkgDir}/LICENSE`)).toBe(true);
  });
});
