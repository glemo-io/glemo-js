#!/usr/bin/env node
// Produces the PUBLIC subset of the Glemo OpenAPI contract: only the endpoints the
// SDK and widget consume, plus exactly the component schemas those endpoints reach.
// Allowlist by design (default-deny): a new internal endpoint is excluded unless
// explicitly added here, so the public repo never leaks the internal API surface.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(process.cwd(), "openapi/openapi.json");
const dest = resolve(process.cwd(), "openapi/openapi.public.json");

// The public developer API. Everything else (admin, orgs, relying-parties, metering,
// status-lists, sandbox management, ...) is excluded.
const PUBLIC_EXACT = new Set(["/verify", "/issue", "/sandbox/keys"]);
const PUBLIC_PREFIXES = ["/public/"];
const isPublicPath = (p) => PUBLIC_EXACT.has(p) || PUBLIC_PREFIXES.some((pre) => p.startsWith(pre));

const REF = "#/components/schemas/";

/** Collects every `#/components/schemas/X` name referenced anywhere in `node`. */
function collectRefs(node, acc) {
  if (Array.isArray(node)) {
    for (const n of node) collectRefs(n, acc);
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string" && v.startsWith(REF)) acc.add(v.slice(REF.length));
      else collectRefs(v, acc);
    }
  }
}

if (!existsSync(src)) {
  console.error(`[public-openapi] missing ${src}. Run "pnpm sync:openapi" first.`);
  process.exit(1);
}

const oa = JSON.parse(readFileSync(src, "utf8"));

// 1. Keep only public paths.
const paths = {};
for (const [p, def] of Object.entries(oa.paths ?? {})) {
  if (isPublicPath(p)) paths[p] = def;
}

// 2. Transitively keep only the schemas those paths reach.
const allSchemas = oa.components?.schemas ?? {};
const keep = new Set();
collectRefs(paths, keep);
let changed = true;
while (changed) {
  changed = false;
  for (const name of [...keep]) {
    const before = keep.size;
    collectRefs(allSchemas[name] ?? {}, keep);
    if (keep.size !== before) changed = true;
  }
}
const schemas = {};
for (const name of keep) if (allSchemas[name]) schemas[name] = allSchemas[name];

const publicOa = {
  ...oa,
  paths,
  components: { ...(oa.components ?? {}), schemas },
};
writeFileSync(dest, `${JSON.stringify(publicOa, null, 2)}\n`);
console.log(
  `[public-openapi] ${Object.keys(paths).length} public paths, ${keep.size} schemas -> ${dest}`,
);
