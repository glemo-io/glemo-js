import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

// vitest runs from the repo root (root vitest.config.ts).
const pkgDir = resolve(process.cwd(), "packages/verify-widget");
const pkg = JSON.parse(readFileSync(`${pkgDir}/package.json`, "utf8")) as Record<string, unknown>;

describe("@glemo/verify-widget is publish-ready", () => {
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

  test("exposes the module entry and a CDN entry for the browser bundle", () => {
    const exp = pkg.exports as Record<string, unknown>;
    expect(exp?.["."]).toBeTruthy();
    expect(exp?.["./global"]).toBe("./dist/index.global.js");
    // unpkg/jsdelivr resolve the IIFE bundle so `<script src="https://unpkg.com/@glemo/verify-widget">` works
    expect(pkg.unpkg).toBe("dist/index.global.js");
    expect(pkg.jsdelivr).toBe("dist/index.global.js");
  });

  test("ships dist + docs + license and rebuilds on prepack", () => {
    for (const f of ["dist", "CHANGELOG.md", "README.md", "LICENSE"]) {
      expect(pkg.files as string[]).toContain(f);
    }
    expect((pkg.scripts as Record<string, string>)?.prepack).toMatch(/build/);
  });

  test("the LICENSE, README and CHANGELOG files exist on disk", () => {
    expect(existsSync(`${pkgDir}/LICENSE`)).toBe(true);
    expect(existsSync(`${pkgDir}/README.md`)).toBe(true);
    expect(existsSync(`${pkgDir}/CHANGELOG.md`)).toBe(true);
  });
});
