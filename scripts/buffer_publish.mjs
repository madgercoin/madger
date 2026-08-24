#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const API_URL = "https://api.buffer.com";
const root = process.cwd();

const settings = {
  campaignFile: process.env.CAMPAIGN_FILE || "social/campaigns/2026-08-24-today.json",
  channelsFile: process.env.CHANNELS_FILE || "config/social-channels.json",
  assetUrl: process.env.ASSET_URL || "",
  assetKind: process.env.ASSET_KIND || "video",
  mode: process.env.PUBLISH_MODE || "shareNow",
  dueAt: process.env.DUE_AT || "",
  dryRun: /^(1|true|yes)$/i.test(process.env.DRY_RUN || "false"),
};

const allowedModes = new Set(["shareNow", "addToQueue", "shareNext", "customScheduled"]);
if (!process.env.BUFFER_API_KEY) fail("BUFFER_API_KEY is not configured.");
if (!settings.assetUrl) fail("ASSET_URL is required and must be a public HTTPS media URL.");
if (!/^https:\/\//i.test(settings.assetUrl)) fail("ASSET_URL must start with https://");
if (!new Set(["image", "video"]).has(settings.assetKind)) fail("ASSET_KIND must be image or video.");
if (!allowedModes.has(settings.mode)) fail(`Unsupported PUBLISH_MODE: ${settings.mode}`);
if (settings.mode === "customScheduled" && !settings.dueAt) fail("DUE_AT is required for customScheduled mode.");

const [campaign, channelConfig] = await Promise.all([
  readJson(settings.campaignFile),
  readJson(settings.channelsFile),
]);

const organizationId = process.env.BUFFER_ORGANIZATION_ID || await discoverOrganizationId();
const channels = await gql(
  `query Channels($input: ChannelsInput!) {
    channels(input: $input) {
      id name displayName descriptor service type externalLink
      isDisconnected isLocked
    }
  }`,
  { input: { organizationId } },
);

const selected = channelConfig.buffer.map((spec) => selectChannel(channels.channels, spec));
console.log(`Validated ${selected.length} MADGER Buffer destinations:`);
for (const { spec, channel } of selected) {
  console.log(`- ${spec.label}: ${channel.displayName || channel.name} (${channel.id})`);
}

if (settings.dryRun) {
  console.log("DRY_RUN=true: no posts were created.");
  process.exit(0);
}

const results = [];
for (const { spec, channel } of selected) {
  const servicePost = campaign.posts?.[spec.service] || {};
  const input = {
    aiAssisted: true,
    assets: [buildAsset(settings.assetKind, settings.assetUrl, campaign, spec.service)],
    channelId: channel.id,
    mode: settings.mode,
    needsApproval: false,
    schedulingType: "automatic",
    source: "madger-github",
    text: servicePost.text || campaign.defaultText,
    metadata: servicePost.metadata ? { [spec.service]: servicePost.metadata } : undefined,
  };
  if (settings.mode === "customScheduled") input.dueAt = settings.dueAt;

  const data = await gql(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        __typename
        ... on PostActionSuccess {
          post { id status channelService sharedNow dueAt externalLink }
        }
        ... on InvalidInputError { message }
        ... on NotFoundError { message }
        ... on UnauthorizedError { message }
        ... on UnexpectedError { message }
        ... on LimitReachedError { message }
        ... on RestProxyError { message code link }
      }
    }`,
    { input: stripUndefined(input) },
  );

  const result = data.createPost;
  if (result.__typename !== "PostActionSuccess") {
    fail(`${spec.label} failed: ${result.__typename}: ${result.message || "unknown Buffer error"}`);
  }
  results.push({ label: spec.label, ...result.post });
  console.log(`Created ${spec.label} post ${result.post.id} (${result.post.status}).`);
}

console.log(JSON.stringify({ campaign: campaign.campaign, results }, null, 2));

function buildAsset(kind, url, campaignData, service) {
  if (kind === "image") {
    return { image: { url, metadata: { altText: campaignData.altText } } };
  }
  const metadata = { title: campaignData.assetTitle };
  if (service === "instagram" || service === "tiktok") metadata.thumbnailOffset = 1000;
  return { video: { url, metadata } };
}

function selectChannel(channelsList, spec) {
  const candidates = channelsList.filter((channel) => {
    if (channel.service !== spec.service || channel.isDisconnected || channel.isLocked) return false;
    if (spec.expectedType && channel.type !== spec.expectedType) return false;
    const haystack = [channel.name, channel.displayName, channel.descriptor, channel.externalLink]
      .filter(Boolean).join(" ").toLowerCase();
    return spec.selectors.some((selector) => haystack.includes(selector.toLowerCase()));
  });
  if (candidates.length !== 1) {
    const found = candidates.map((c) => `${c.displayName || c.name} (${c.id})`).join(", ") || "none";
    fail(`${spec.label} must match exactly one connected Buffer channel; found ${found}.`);
  }
  return { spec, channel: candidates[0] };
}

async function discoverOrganizationId() {
  const data = await gql(`query AccountOrganizations { account { organizations { id } } }`, {});
  const organizations = data.account.organizations;
  if (organizations.length !== 1) {
    fail(`Expected exactly one Buffer organization, found ${organizations.length}. Set BUFFER_ORGANIZATION_ID.`);
  }
  return organizations[0].id;
}

async function gql(query, variables) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.BUFFER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) fail(`Buffer HTTP ${response.status}: ${JSON.stringify(payload)}`);
  if (payload.errors?.length) fail(`Buffer GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`);
  return payload.data;
}

async function readJson(relativePath) {
  const fullPath = path.resolve(root, relativePath);
  return JSON.parse(await fs.readFile(fullPath, "utf8"));
}

function stripUndefined(value) {
  return JSON.parse(JSON.stringify(value));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
