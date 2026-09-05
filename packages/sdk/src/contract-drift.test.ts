// packages/sdk/src/contract-drift.test.ts
//
// The gate that did not exist, and whose absence let four fields sit frozen for six
// weeks. The generation chain regenerates schema.d.ts, which is NOT exported, and
// never touches VerifyResult, which is the only thing a consumer sees and is written
// by hand: running all three sync steps changed nothing in the public API.
//
// This cannot compare against the LIVE contract, because sync:openapi needs the
// private backend as a sibling directory and CI does not have it. What it CAN do is
// fail when the COMMITTED public contract declares a /verify response field that
// VerifyResult does not, which is exactly the drift that went unnoticed.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type OpenApi = {
  paths: Record<
    string,
    {
      post?: {
        responses: Record<
          string,
          { content?: Record<string, { schema?: { properties?: Record<string, unknown> } }> }
        >;
      };
    }
  >;
};

/** The keys VerifyResult declares. Read from the source rather than from the type,
 *  because a type has no runtime presence and this has to fail in CI, not in an
 *  editor. A brittle regex would be worse than the drift; this parses the one
 *  interface block by name and asserts it was found. */
/** Resolve a repo file without depending on import.meta.url being a file URL, which
 *  it is not under this transform: the first draft of this gate failed on that and
 *  looked exactly like a caught drift. Candidates cover being run from the package
 *  and from the workspace root. */
function repoFile(...candidates: string[]): string {
  for (const c of candidates) {
    const abs = resolve(process.cwd(), c);
    if (existsSync(abs)) return abs;
  }
  throw new Error(`none of these exist from ${process.cwd()}: ${candidates.join(", ")}`);
}

function verifyResultKeys(): string[] {
  const src = readFileSync(
    repoFile("src/index.ts", "packages/sdk/src/index.ts"),
    "utf8",
  );
  const start = src.indexOf("export interface VerifyResult {");
  expect(start, "VerifyResult was renamed or removed; this gate needs updating").toBeGreaterThan(
    -1,
  );
  const body = src.slice(start, src.indexOf("\n}", start));
  return [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1] as string);
}

describe("the published type keeps up with the published contract", () => {
  it("declares every field /verify returns", () => {
    const doc = JSON.parse(
      readFileSync(
        repoFile("../../openapi/openapi.public.json", "openapi/openapi.public.json"),
        "utf8",
      ),
    ) as OpenApi;
    const schema =
      doc.paths["/verify"]?.post?.responses["200"]?.content?.["application/json"]?.schema;
    const contract = Object.keys(schema?.properties ?? {});
    expect(contract.length, "the public contract lost /verify").toBeGreaterThan(0);

    const declared = new Set(verifyResultKeys());
    const missing = contract.filter((f) => !declared.has(f));
    expect(
      missing,
      `VerifyResult is missing fields the contract returns: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
