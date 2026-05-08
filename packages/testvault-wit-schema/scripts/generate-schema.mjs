import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist");

// Import from compiled output — use file URL so Windows drive letters work
const { TESTVAULT_SCHEMA } = await import(pathToFileURL(resolve(distDir, "schema.js")).href);

const outPath = resolve(distDir, "schema.json");
writeFileSync(outPath, JSON.stringify(TESTVAULT_SCHEMA, null, 2) + "\n", "utf8");

console.log(`schema.json written to ${outPath} (${TESTVAULT_SCHEMA.wits.length} WITs, v${TESTVAULT_SCHEMA.version})`);
