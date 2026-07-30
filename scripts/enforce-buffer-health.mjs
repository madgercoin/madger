import { readFile } from "node:fs/promises";
import { campaignHealthDetails } from "./buffer-performance-core.mjs";

const reportPath = process.argv[2] ?? "reports/social/latest.json";
const report = JSON.parse(await readFile(reportPath, "utf8"));
const { atRisk, failed } = campaignHealthDetails(report);

if (!atRisk.length) {
  console.log("Buffer campaign channel health passed.");
  process.exit(0);
}

const annotationData = (value) => String(value)
  .replaceAll("%", "%25")
  .replaceAll("\r", "%0D")
  .replaceAll("\n", "%0A");
const channelLabel = (post) => post.channel === "unknown"
  ? `${post.service} channel ${post.channelId ?? "not found"}`
  : `${post.service} channel ${post.channel} (${post.channelId})`;

for (const post of atRisk) {
  const message = `${post.id} is due ${post.dueAt ?? "at an unknown time"} and depends on a ${post.channelState} ${channelLabel(post)}. Reauthorize that channel in Buffer, then verify or reschedule the post.`;
  console.error(`::error title=Buffer channel ${post.channelState}::${annotationData(message)}`);
}
for (const post of failed) {
  const message = `${post.id} already failed on the same ${channelLabel(post)}. Reschedule it after channel authorization is restored.`;
  console.error(`::warning title=Buffer post already failed::${annotationData(message)}`);
}

console.error(
  `Buffer campaign channel health failed: ${atRisk.length} scheduled post(s) are at risk${failed.length ? ` and ${failed.length} post(s) already failed on the same channel` : ""}.`
);
process.exit(1);
