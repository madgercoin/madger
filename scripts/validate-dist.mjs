import { readFile, readdir } from "node:fs/promises";
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
const launchDocuments = ["LAUNCH_PLAN.md", "LAUNCH_DECISIONS.md", "docs/launch-runbook.md", "docs/liquidity-plan.md", "docs/wallet-operations.md", "docs/launch-communications.md", "docs/listing-submissions.md"];
const leakedDocuments = actual.filter(file => launchDocuments.includes(file) || file.startsWith("docs/"));
const privateOperationsAddresses = [
  "GWyajcELd3nM1NtfvkJoXz2AgYYinqyZzqAC4NQyBzsi", "Ge91NeKSg4uYci29mq2XN5N4KQsnoXtkWBPEorPa63aZ",
  "C29Y6p3NXgi5UauC3W9PVN7SDguk9EA2e5oDDJEHRxNz", "ATFELs8fV9CthKDjVLfhMb756uD499nHVtzLr5i7XKPp",
  "EVSB7eT5ws43oi2ztWKNQvH4THXQD3k9z6Sk9NNFP1FT"
];
const publishedText = (await Promise.all(actual.filter(file => /\.(?:html|js|css|xml|txt|json|webmanifest)$/i.test(file))
  .map(file => readFile(path.join("dist", file), "utf8")))).join("\n");
const leakedAddresses = privateOperationsAddresses.filter(address => publishedText.includes(address));
if (missing.length || unexpected.length) {
  if (missing.length) console.error(`Missing dist files: ${missing.join(", ")}`);
  if (unexpected.length) console.error(`Unapproved dist files: ${unexpected.join(", ")}`);
  process.exit(1);
}
if (leakedDocuments.length || leakedAddresses.length || /(?:seed phrase|private key)\s*[:=]\s*[A-Za-z0-9]+/i.test(publishedText)) {
  if (leakedDocuments.length) console.error(`Launch documents leaked to dist: ${leakedDocuments.join(", ")}`);
  if (leakedAddresses.length) console.error(`Operations wallet information leaked to dist: ${leakedAddresses.join(", ")}`);
  if (/(?:seed phrase|private key)\s*[:=]\s*[A-Za-z0-9]+/i.test(publishedText)) console.error("Private wallet material pattern found in dist");
  process.exit(1);
}
console.log(`Validated explicit dist allowlist (${actual.length} files).`);
console.log("Validated launch-document exclusion and absence of private wallet material/operations addresses in dist.");
