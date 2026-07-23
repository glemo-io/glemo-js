import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

// The standalone browser bundle for a `<script>` embed (dist is gitignored, so
// build it on demand if a clean checkout hasn't yet).
const bundle = resolve(process.cwd(), "packages/verify-widget/dist/index.global.js");

beforeAll(() => {
  if (!existsSync(bundle)) {
    execFileSync("pnpm", ["--filter", "@glemo/verify-widget", "build"], { stdio: "ignore" });
  }
});

describe("the IIFE browser bundle is embeddable", () => {
  test("exposes the GlemoVerify global and self-registers <glemo-verify>", () => {
    const src = readFileSync(bundle, "utf8");
    expect(src).toContain("var GlemoVerify");
    expect(src).toContain('customElements.define("glemo-verify"');
  });

  test("inlines the SDK so no external dependency is needed at runtime", () => {
    const src = readFileSync(bundle, "utf8");
    // A bare import would mean the SDK is external; the IIFE must be self-contained.
    expect(src).not.toMatch(/\bfrom"@glemo\/sdk"/);
    expect(src).not.toMatch(/require\("@glemo\/sdk"\)/);
  });
});
