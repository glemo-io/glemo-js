import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const r = (p: string) => resolve(root, p);

describe("versioning is governed by Changesets with a written policy", () => {
  test("Changesets is configured for public, GitHub-linked changelogs", () => {
    expect(existsSync(r(".changeset/config.json")), "missing .changeset/config.json").toBe(true);
    const cfg = JSON.parse(readFileSync(r(".changeset/config.json"), "utf8")) as {
      access?: string;
      baseBranch?: string;
      changelog?: unknown;
    };
    expect(cfg.access).toBe("public");
    expect(cfg.baseBranch).toBe("main");
    expect(JSON.stringify(cfg.changelog)).toMatch(/changelog-github/);
    expect(JSON.stringify(cfg.changelog)).toMatch(/glemo-io\/glemo-js/);
  });

  test("VERSIONING.md is the written policy and covers the essentials", () => {
    expect(existsSync(r("VERSIONING.md")), "missing VERSIONING.md").toBe(true);
    const v = readFileSync(r("VERSIONING.md"), "utf8");
    for (const section of [
      /semantic versioning/i,
      /major/i,
      /minor/i,
      /patch/i,
      /pre-?release/i,
      /deprecat/i,
      /@glemo\/sdk/,
      /@glemo\/verify-widget/,
    ]) {
      expect(v).toMatch(section);
    }
  });

  test("the release scripts exist", () => {
    const pkg = JSON.parse(readFileSync(r("package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.changeset).toBeTruthy();
    expect(pkg.scripts.version).toMatch(/changeset version/);
    expect(pkg.scripts.release).toMatch(/changeset publish/);
  });
});
