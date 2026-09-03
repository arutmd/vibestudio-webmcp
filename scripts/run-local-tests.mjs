import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const libDir = path.join(root, "lib");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(abs)));
    } else if (entry.name.endsWith(".test.ts")) {
      files.push(abs);
    }
  }
  return files.sort();
}

async function run(file) {
  const rel = path.relative(root, file);
  process.stdout.write(`\n[local-test] ${rel}\n`);
  const code = await new Promise((resolve) => {
    const proc = spawn(path.join(root, "node_modules", ".bin", "tsx"), [file], {
      cwd: root,
      stdio: "inherit",
    });
    proc.on("close", (c) => resolve(c ?? 1));
    proc.on("error", () => resolve(1));
  });
  if (code !== 0) process.exit(code);
}

const files = await walk(libDir);
if (!files.length) {
  process.stdout.write("No local TypeScript tests found.\n");
  process.exit(0);
}

for (const file of files) {
  await run(file);
}

process.stdout.write(`\n[local-test] ${files.length} file(s) passed\n`);
