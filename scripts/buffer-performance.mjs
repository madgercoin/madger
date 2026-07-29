import fs from "node:fs/promises";
import { channelState, metricsToObject, metricDeltas, summarizeCampaign } from "./buffer-performance-core.mjs";

const API_URL = "https://api.buffer.com";
const token = process.env.BUFFER_API_TOKEN;
if (!token) throw new Error("BUFFER_API_TOKEN is not configured");

async function graphql(query, variables = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(`Buffer API error: ${JSON.stringify(payload.errors || payload)}`);
  }
  return payload.data;
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

const priorReport = await readJson("reports/social/latest.json", null);
const manifest = await readJson("content/buffer-schedule.json", { posts: [] });
const account = await graphql(`query { account { organizations { id name } } }`);
const organizations = account.account.organizations;
const requestedId = process.env.BUFFER_ORGANIZATION_ID;
const organization = requestedId
  ? organizations.find((item) => item.id === requestedId)
  : organizations.length === 1 ? organizations[0] : null;
if (!organization) throw new Error("Unable to resolve one Buffer organization");

const channelData = await graphql(`
  query Channels($organizationId: OrganizationId!) {
    channels(input: { organizationId: $organizationId }) {
      id name displayName service externalLink isDisconnected isLocked isQueuePaused
    }
  }
`, { organizationId: organization.id });

const end = new Date();
const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
const channelRows = [];
for (const channel of channelData.channels) {
  const state = channelState(channel);
  try {
    const data = await graphql(`
      query Metrics($input: AggregatedPostMetricsInput!) {
        aggregatedPostMetrics(input: $input) {
          metrics { type name value unit }
          metricsUpdatedAt
        }
      }
    `, { input: {
      organizationId: organization.id,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      channelIds: [channel.id]
    } });
    const values = metricsToObject(data.aggregatedPostMetrics.metrics);
    channelRows.push({
      channelId: channel.id,
      channel: channel.displayName || channel.name,
      service: channel.service,
      externalLink: channel.externalLink,
      disconnected: channel.isDisconnected,
      locked: channel.isLocked,
      state,
      healthy: state === "connected",
      queuePaused: channel.isQueuePaused,
      metricsUpdatedAt: data.aggregatedPostMetrics.metricsUpdatedAt,
      metrics: values,
      requiresCommunityReview: (values.comments || 0) > 0
    });
  } catch (error) {
    channelRows.push({
      channelId: channel.id,
      channel: channel.displayName || channel.name,
      service: channel.service,
      externalLink: channel.externalLink,
      disconnected: channel.isDisconnected,
      locked: channel.isLocked,
      state,
      healthy: state === "connected",
      queuePaused: channel.isQueuePaused,
      error: error.message
    });
  }
}

const channelsById = new Map(channelRows.map((channel) => [channel.channelId, channel]));
const previousCampaignPosts = priorReport?.campaign?.posts ?? [];
const previousCampaignById = new Map(previousCampaignPosts.map((post) => [post.id, post]));
const campaignPosts = [];
for (const entry of manifest.posts.filter((post) => post.bufferPostId)) {
  const campaignChannel = channelsById.get(entry.channelId);
  const connectionState = campaignChannel?.state ?? "unknown";
  try {
    const data = await graphql(`
      query CampaignPost($postId: PostId!) {
        post(input: { id: $postId }) {
          id status dueAt sentAt externalLink
          error { message supportUrl }
          metrics { type name value unit }
          metricsUpdatedAt
        }
      }
    `, { postId: entry.bufferPostId });
    const post = data.post;
    const metrics = metricsToObject(post.metrics);
    campaignPosts.push({
      id: entry.id,
      bufferPostId: entry.bufferPostId,
      title: entry.title,
      service: entry.service,
      channelId: entry.channelId,
      channelState: connectionState,
      dueAt: post.dueAt || entry.dueAt,
      sentAt: post.sentAt,
      status: post.status,
      externalLink: post.externalLink,
      publishingError: post.error,
      metricsUpdatedAt: post.metricsUpdatedAt,
      metrics,
      metricDeltas: metricDeltas(metrics, previousCampaignById.get(entry.id)?.metrics)
    });
  } catch (error) {
    campaignPosts.push({
      id: entry.id,
      bufferPostId: entry.bufferPostId,
      title: entry.title,
      service: entry.service,
      channelId: entry.channelId,
      channelState: connectionState,
      dueAt: entry.dueAt,
      status: "monitor_error",
      metrics: {},
      metricDeltas: {},
      monitorError: error.message
    });
  }
}

const campaignSummary = summarizeCampaign(campaignPosts, previousCampaignPosts, end.getTime());
const report = {
  generatedAt: end.toISOString(),
  previousGeneratedAt: priorReport?.generatedAt ?? null,
  window: { start: start.toISOString(), end: end.toISOString() },
  organization,
  channels: channelRows,
  campaign: {
    source: "content/buffer-schedule.json",
    summary: campaignSummary,
    posts: campaignPosts
  },
  limitations: [
    "Buffer refreshes social metrics approximately daily, so values can lag source networks by about 24 hours.",
    "The follows metric is Instagram followers attributed to a post, not total account followers.",
    "Website visitor analytics are not included in Buffer data.",
    "A comment count identifies engagement but does not expose message text through the documented public API."
  ]
};

await fs.mkdir("reports/social", { recursive: true });
await fs.writeFile("reports/social/latest.json", JSON.stringify(report, null, 2) + "\n");

const metric = (row, key) => Number.isFinite(row.metrics?.[key]) ? row.metrics[key] : "—";
const format = (value, delta = null, suffix = "") => {
  if (!Number.isFinite(value)) return "—";
  const base = Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (!Number.isFinite(delta) || delta === 0) return `${base}${suffix}`;
  const change = Number.isInteger(delta) ? String(delta) : delta.toFixed(2);
  return `${base}${suffix} (${delta > 0 ? "+" : ""}${change})`;
};
const statusLabel = (post) => {
  const reasons = campaignSummary.attentionReasons[post.id];
  return reasons ? `⚠ ${post.status} (${reasons.join(", ").replaceAll("_", " ")})` : post.status;
};
const healthLabel = (row) => row.state === "connected"
  ? "Connected"
  : row.state === "locked" ? "Locked" : row.state === "disconnected" ? "Disconnected" : "Unknown";
const link = (url) => url ? `[Open](${url})` : "—";
const lines = [
  "# MADGER social performance",
  "",
  `Generated: ${report.generatedAt}`,
  `Previous snapshot: ${report.previousGeneratedAt || "none"}`,
  "",
  "## 30-day channel rollup",
  "",
  "| Channel | Health | Posts | Impressions | Reach | Views | Eng. rate | Clicks | Follows | Review |",
  "|---|---|---:|---:|---:|---:|---:|---:|---:|---|",
  ...channelRows.map((row) => `| ${row.service}: ${row.channel} | ${healthLabel(row)} | ${metric(row, "postCount")} | ${metric(row, "impressions")} | ${metric(row, "reach")} | ${metric(row, "views")} | ${Number.isFinite(row.metrics?.engagementRate) ? `${row.metrics.engagementRate.toFixed(2)}%` : "—"} | ${metric(row, "clicks")} | ${metric(row, "follows")} | ${row.requiresCommunityReview ? "Check Buffer Community" : "None flagged"} |`),
  "",
  "## Scheduled campaign",
  "",
  `Sent: ${campaignSummary.sent}/${campaignSummary.totalPosts} · Scheduled: ${campaignSummary.scheduled} · Errors: ${campaignSummary.errors} · Attention: ${campaignSummary.needsAttention.length} · At risk: ${campaignSummary.atRiskPosts.length}`,
  "",
  "| Metric | Current | Change since prior report |",
  "|---|---:|---:|",
  ...Object.keys(campaignSummary.totals).map((key) => `| ${key} | ${format(campaignSummary.totals[key])} | ${format(campaignSummary.deltas[key])} |`),
  `| averageEngagementRate | ${format(campaignSummary.averageEngagementRate, null, "%")} | — |`,
  "",
  "## Per-post performance",
  "",
  "| Post | Network | Connection | Due (UTC) | Status | Views | Impressions | Reach | Reactions | Comments | Shares | Clicks | Follows | Link |",
  "|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|",
  ...campaignPosts.map((post) => `| ${post.title} | ${post.service} | ${post.channelState} | ${post.dueAt || "—"} | ${statusLabel(post)} | ${format(post.metrics.views, post.metricDeltas.views)} | ${format(post.metrics.impressions, post.metricDeltas.impressions)} | ${format(post.metrics.reach, post.metricDeltas.reach)} | ${format(post.metrics.reactions, post.metricDeltas.reactions)} | ${format(post.metrics.comments, post.metricDeltas.comments)} | ${format(post.metrics.shares, post.metricDeltas.shares)} | ${format(post.metrics.clicks, post.metricDeltas.clicks)} | ${format(post.metrics.follows, post.metricDeltas.follows)} | ${link(post.externalLink)} |`),
  "",
  "## Interpretation",
  "",
  "- Parentheses show movement since the prior daily report; unavailable metrics remain — rather than being treated as zero.",
  "- Buffer metrics refresh approximately daily and may lag native network activity by about 24 hours.",
  "- Follows means Instagram followers attributed to a post; it is not the account's total follower count.",
  "- Disconnected, locked, or missing campaign channels are flagged before scheduled posts are lost.",
  "- Any errored post or post still unsent three hours after its due time is flagged for attention.",
  "- Website visitors require a separate first-party analytics source and are not inferred from social impressions or clicks.",
  ""
];
await fs.writeFile("reports/social/latest.md", lines.join("\n"));
if (campaignSummary.atRiskPosts.length) {
  console.error(`::warning title=Buffer campaign channel at risk::${campaignSummary.atRiskPosts.length} scheduled post(s) depend on a disconnected, locked, or missing channel: ${campaignSummary.atRiskPosts.join(", ")}`);
}
console.log(JSON.stringify(report, null, 2));
