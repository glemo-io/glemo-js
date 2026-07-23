import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET = 15 * 1024; // 15 kB gzip
const file = new URL("../dist/index.global.js", import.meta.url);
const size = gzipSync(readFileSync(file)).length;
console.log(`widget embed: ${(size / 1024).toFixed(1)} kB gzip (presupuesto ${BUDGET / 1024} kB)`);
if (size > BUDGET) {
  console.error("El widget excede el presupuesto de bundle.");
  process.exit(1);
}
