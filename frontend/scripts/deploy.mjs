// Copies the production build (dist/) into backend-spring's static resources
// so a single `mvnw spring-boot:run` / packaged jar serves the React app at "/".
// Run via `npm run deploy` (builds first, then copies).
import { cpSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");
const targetDir = path.resolve(here, "..", "..", "backend-spring", "src", "main", "resources", "static");

if (!existsSync(distDir)) {
  console.error("dist/ not found — run `npm run build` first (or use `npm run deploy`, which does this automatically).");
  process.exit(1);
}

rmSync(targetDir, { recursive: true, force: true });
cpSync(distDir, targetDir, { recursive: true });

console.log(`Deployed frontend build to ${targetDir}`);
