import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

// The security guarantee of this package: the PUBLISHED types must not leak the
// internal API surface. We assert on the emitted artifact, not the source, so a
// change that reintroduces the internal contract fails the build.
const dts = resolve(process.cwd(), "packages/sdk/dist/index.d.ts");

beforeAll(() => {
  execFileSync("pnpm", ["--filter", "@glemo/sdk", "build"], { stdio: "ignore" });
});

describe("the published SDK types expose no internal API surface", () => {
  test("the emitted .d.ts contains no internal endpoint paths", () => {
    const d = readFileSync(dts, "utf8");
    for (const marker of [
      '"/admin',
      '"/sandbox',
      '"/orgs',
      '"/relying-parties',
      '"/status-lists',
      '"/metering',
    ]) {
      expect(d.includes(marker), `internal path leaked: ${marker}`).toBe(false);
    }
    // and the whole OpenAPI `paths` type is never exported
    expect(d).not.toMatch(/export\s+(type\s+)?\{[^}]*\bpaths\b/);
  });

  test("the emitted .d.ts still exports the public surface", () => {
    const d = readFileSync(dts, "utf8");
    for (const symbol of [
      "createGlemo",
      "VerifyResult",
      "IssueResult",
      "GlemoError",
      "GlemoConfig",
    ]) {
      expect(d.includes(symbol), `missing public export: ${symbol}`).toBe(true);
    }
  });

  // Defense in depth: the generated contract that IS committed to this public repo
  // (src/schema.d.ts) must itself be built from the public subset, never the full one.
  test("the committed schema types contain no internal endpoints", () => {
    const schema = readFileSync(resolve(process.cwd(), "packages/sdk/src/schema.d.ts"), "utf8");
    for (const marker of [
      '"/admin',
      '"/orgs',
      '"/relying-parties',
      '"/status-lists',
      '"/metering',
    ]) {
      expect(schema.includes(marker), `internal path in committed schema: ${marker}`).toBe(false);
    }
    expect(schema.includes('"/verify"'), "public /verify must remain").toBe(true);
  });
});
