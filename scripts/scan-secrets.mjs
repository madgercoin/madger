import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" })
  .trim().split("\n").filter(Boolean)
  .filter(file => file !== "scripts/scan-secrets.mjs"
    && !file.startsWith("node_modules/")
    && !file.startsWith("dist/")
    && !/\.(?:gif|ico|jpe?g|mov|mp4|png|webm|webp|woff2?|zip)$/i.test(file));
const patterns = [
  ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Cloudflare API token assignment", /\b(?:CLOUDFLARE_API_TOKEN|CF_API_TOKEN)\s*=\s*[^\s<>{}$]+/i],
  ["generic secret assignment", /\b(?:api[_-]?key|client[_-]?secret|private[_-]?key)\s*=\s*["'][^"'\s]{12,}["']/i]
];
const findings = [];
for (const file of files) {
  let content;
  try {
    content = await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  for (const [name, pattern] of patterns) if (pattern.test(content)) findings.push(`${file}: ${name}`);
}
if (findings.length) {
  console.error(findings.map(finding => `- ${finding}`).join("\n"));
  process.exit(1);
}
console.log(`Scanned ${files.length} repository files for high-confidence secret patterns.`);
