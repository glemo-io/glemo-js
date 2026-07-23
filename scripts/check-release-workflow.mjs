#!/usr/bin/env node
// Guards that the release pipeline uses OIDC Trusted Publishing (no long-lived npm
// token) with provenance, driven by Changesets. The one-time linking of the Trusted
// Publisher on npmjs.com is [I] (founder); this asserts the workflow is correct.
import { readFileSync } from "node:fs";

const path = ".github/workflows/release.yml";
let yml;
try {
  yml = readFileSync(path, "utf8");
} catch {
  console.error(`[release-check] missing ${path}`);
  process.exit(1);
}

const required = [
  ["OIDC id-token permission", /id-token:\s*write/],
  ["provenance enabled", /NPM_CONFIG_PROVENANCE:\s*["']?true/],
  ["the Changesets action", /changesets\/action@/],
  ["a publish command", /publish:\s*pnpm release/],
];
const forbidden = [["a long-lived npm token", /NPM_TOKEN|NODE_AUTH_TOKEN/]];

const missing = required.filter(([, re]) => !re.test(yml)).map(([l]) => l);
const present = forbidden.filter(([, re]) => re.test(yml)).map(([l]) => l);

if (missing.length || present.length) {
  if (missing.length) console.error("[release-check] release.yml is missing:", missing.join("; "));
  if (present.length)
    console.error("[release-check] release.yml must NOT contain:", present.join("; "));
  process.exit(1);
}
console.log("[release-check] OK: OIDC trusted publishing with provenance, no long-lived token.");
