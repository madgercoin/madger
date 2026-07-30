import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";

const campaignPath = process.argv[2];
const dryRun = process.env.SOCIAL_DRY_RUN === "true";

if (!campaignPath) {
  throw new Error("Usage: node social/publish.mjs <campaign.json>");
}

const campaign = JSON.parse(await readFile(campaignPath, "utf8"));

if (!campaign.id || !/^[a-z0-9][a-z0-9-]{2,79}$/i.test(campaign.id)) {
  throw new Error("Campaign id must be 3-80 letters, numbers, or hyphens.");
}

if (campaign.approved !== true) {
  throw new Error(`Campaign ${campaign.id} is not approved.`);
}

const messages = campaign.messages ?? {};
const selected = Object.entries(messages).filter(([, value]) => {
  return typeof value === "string" && value.trim().length > 0;
});

if (selected.length === 0) {
  throw new Error(`Campaign ${campaign.id} contains no messages.`);
}

const limits = {
  x: 280,
  telegram_announcement: 4096,
  telegram_community: 4096,
  discord: 2000,
};

for (const [channel, text] of selected) {
  if (!(channel in limits)) {
    throw new Error(`Unsupported channel: ${channel}`);
  }
  if ([...text].length > limits[channel]) {
    throw new Error(`${channel} message exceeds ${limits[channel]} characters.`);
  }
}

if (dryRun) {
  console.log(JSON.stringify({
    campaign: campaign.id,
    dryRun: true,
    channels: selected.map(([channel, text]) => ({
      channel,
      characters: [...text].length,
    })),
  }, null, 2));
  process.exit(0);
}

const results = [];

for (const [channel, text] of selected) {
  if (channel === "x") {
    results.push(await publishX(text));
  } else if (channel === "telegram_announcement") {
    results.push(await publishTelegram(
      text,
      requiredEnv("TELEGRAM_ANNOUNCEMENT_CHAT_ID"),
      channel,
    ));
  } else if (channel === "telegram_community") {
    results.push(await publishTelegram(
      text,
      requiredEnv("TELEGRAM_COMMUNITY_CHAT_ID"),
      channel,
    ));
  } else if (channel === "discord") {
    results.push(await publishDiscord(text));
  }
}

console.log(JSON.stringify({
  campaign: campaign.id,
  dryRun: false,
  results,
}, null, 2));

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }
  return value;
}

async function publishTelegram(text, chatId, channel) {
  const token = requiredEnv("TELEGRAM_BOT_TOKEN");
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: false,
      }),
    },
  );
  const payload = await response.json();
  if (!response.ok || payload.ok !== true) {
    throw new Error(`${channel} failed: ${safeError(payload)}`);
  }
  return {
    channel,
    message_id: payload.result.message_id,
    chat_id: String(payload.result.chat.id),
  };
}

async function publishDiscord(text) {
  const webhook = requiredEnv("DISCORD_WEBHOOK_URL");
  const response = await fetch(`${webhook}?wait=true`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: text,
      allowed_mentions: { parse: [] },
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`discord failed: ${safeError(payload)}`);
  }
  return {
    channel: "discord",
    message_id: payload.id,
    channel_id: payload.channel_id,
  };
}

async function publishX(text) {
  const consumerKey = requiredEnv("X_API_KEY");
  const consumerSecret = requiredEnv("X_API_SECRET");
  const accessToken = requiredEnv("X_ACCESS_TOKEN");
  const accessSecret = requiredEnv("X_ACCESS_TOKEN_SECRET");
  const url = "https://api.x.com/2/tweets";
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(18).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };
  const parameterString = Object.entries(oauth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percent(key)}=${percent(value)}`)
    .join("&");
  const signatureBase = [
    "POST",
    percent(url),
    percent(parameterString),
  ].join("&");
  const signingKey = `${percent(consumerSecret)}&${percent(accessSecret)}`;
  oauth.oauth_signature = createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");
  const authorization = "OAuth " + Object.entries(oauth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percent(key)}="${percent(value)}"`)
    .join(", ");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.data?.id) {
    throw new Error(`x failed: ${safeError(payload)}`);
  }
  return {
    channel: "x",
    post_id: payload.data.id,
    url: `https://x.com/madgercoin/status/${payload.data.id}`,
  };
}

function percent(value) {
  return encodeURIComponent(value)
    .replaceAll("!", "%21")
    .replaceAll("'", "%27")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29")
    .replaceAll("*", "%2A");
}

function safeError(payload) {
  if (!payload || typeof payload !== "object") return "unknown error";
  const clone = structuredClone(payload);
  for (const key of ["token", "access_token", "webhook"]) {
    if (key in clone) clone[key] = "[redacted]";
  }
  return JSON.stringify(clone).slice(0, 1200);
}
