import { readdir } from "node:fs/promises";
import path from "node:path";
import { distAllowlist } from "../site-config.mjs";

async function walk(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

const actual = (await walk("dist")).sort();
const missing = distAllowlist.filter(file => !actual.includes(file));
const unexpected = actual.filter(file => !distAllowlist.includes(file));
if (missing.length || unexpected.length) {
  if (missing.length) console.error(`Missing dist files: ${missing.join(", ")}`);
  if (unexpected.length) console.error(`Unapproved dist files: ${unexpected.join(", ")}`);
  process.exit(1);
}
console.log(`Validated explicit dist allowlist (${actual.length} files).`);
