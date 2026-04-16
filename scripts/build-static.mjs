import { mkdir, readdir, rm, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, "dist");

const allowedExtensions = new Set([
  ".html",
  ".js",
  ".css",
  ".svg",
  ".png",
  ".txt",
  ".xml",
  ".webmanifest",
]);

const excludedFiles = new Set([
  "netlify.toml",
  "package.json",
  "package-lock.json",
  "supabase-setup.sql",
]);

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const entries = await readdir(projectRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name);
    if (!allowedExtensions.has(ext)) {
      continue;
    }

    if (excludedFiles.has(entry.name)) {
      continue;
    }

    const source = path.join(projectRoot, entry.name);
    const target = path.join(outDir, entry.name);
    await copyFile(source, target);
  }

  console.log(`Built static assets into ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
