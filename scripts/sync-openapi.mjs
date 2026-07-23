#!/usr/bin/env node
// Syncs the Glemo API OpenAPI contract from the (private) backend into this repo so
// the SDK types can be regenerated locally. The backend is the source of truth.
// The FULL contract is a local dev artifact and is gitignored: it must never land in
// this public repo. Plan 02 narrows what the SDK actually consumes to the PUBLIC subset.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const src =
  process.env.GLEMO_OPENAPI_SRC ?? resolve(process.cwd(), "../glemo-backend/openapi/openapi.json");
const destDir = resolve(process.cwd(), "openapi");
const dest = resolve(destDir, "openapi.json");

if (!existsSync(src)) {
  console.error(
    `[sync-openapi] source not found: ${src}\nSet GLEMO_OPENAPI_SRC, or place glemo-backend as a sibling directory.`,
  );
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[sync-openapi] copied ${src} -> ${dest}`);
