import { mkdir, rm, cp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const zipPath = join(root, "bilibili-watchlater-extension.zip");
const execFileAsync = promisify(execFile);

await rm(dist, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(dist, { recursive: true });

for (const path of ["manifest.json", "src", "popup", "options", "icons"]) {
  await cp(join(root, path), join(dist, path), { recursive: true });
}

await writeFile(
  join(dist, "PACKAGE_NOTES.txt"),
  "Bilibili Watchlater extension package directory. Zip this directory for browser store upload.\n",
  "utf8"
);

await execFileAsync("zip", ["-r", zipPath, "."], { cwd: dist });

console.log(`Prepared extension package at ${dist}`);
console.log(`Prepared zip at ${zipPath}`);
