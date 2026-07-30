import fs from "node:fs/promises";
import path from "node:path";

import {
  buildTelegramRequest,
  claimDuePosts,
  normalizeBotUsername,
  validateTelegramManifest,
  validateTelegramState
} from "./telegram-automation-core.mjs";

const mode = process.argv[2] || "verify";
const manifestPath = process.argv[3] || "content/telegram-schedule.json";
const statePath = process.argv[4] || "reports/telegram/state.json";
const planPath = process.argv[5] || "/tmp/madger-telegram-plan.json";
const token = process.env.TELEGRAM_BOT_TOKEN;

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function telegram(method, body = {}) {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok || payload.ok !== true) {
    throw new Error(`Telegram ${method} failed: ${payload.description || response.status}`);
  }
  return payload.result;
}

async function verify(manifest) {
  const me = await telegram("getMe");
  const expected = normalizeBotUsername(manifest.botUsername);
  if (normalizeBotUsername(me.username) !== expected) {
    throw new Error(`Telegram token belongs to @${me.username || "unknown"}, expected @${expected}`);
  }

  const permissionChecks = {
    channel: ["can_post_messages", "can_edit_messages", "can_delete_messages"],
    group: ["can_delete_messages", "can_restrict_members"]
  };
  for (const [target, chatId] of Object.entries(manifest.targets)) {
    const member = await telegram("getChatMember", { chat_id: chatId, user_id: me.id });
    if (!["administrator", "creator"].includes(member.status)) {
      throw new Error(`@${expected} is not an administrator in ${chatId}`);
    }
    const missing = permissionChecks[target].filter((permission) => member.status !== "creator" && member[permission] !== true);
    if (missing.length) {
      throw new Error(`@${expected} is missing ${missing.join(", ")} in ${chatId}`);
    }
  }
  console.log(`Verified @${expected} and required MADGER Telegram administrator permissions.`);
}

async function claim(manifest, state) {
  const maxLatenessMinutes = Number(manifest.maxLatenessMinutes ?? 90);
  const result = claimDuePosts({ manifest, state, maxLatenessMinutes });
  await writeJson(statePath, result.state);
  await writeJson(planPath, {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    posts: result.claimed
  });
  console.log(`Claimed ${result.claimed.length} due Telegram post(s).`);
}

async function publish(manifest, state) {
  const plan = await readJson(planPath);
  if (plan?.schemaVersion !== 1 || !Array.isArray(plan.posts)) {
    throw new Error("Invalid Telegram publication plan");
  }
  if (!plan.posts.length) {
    console.log("No claimed Telegram posts. Automation is safely idle.");
    return;
  }

  let failed = false;
  for (const entry of plan.posts) {
    const current = state.entries[entry.id];
    if (current?.status !== "claimed") {
      console.error(`${entry.id}: expected claimed state; refusing to publish`);
      failed = true;
      continue;
    }
    try {
      const request = buildTelegramRequest({
        entry,
        chatId: manifest.targets[entry.target]
      });
      const sent = await telegram(request.method, request.body);
      state.entries[entry.id] = {
        ...current,
        status: "sent",
        sentAt: new Date().toISOString(),
        chatId: String(sent.chat.id),
        messageId: sent.message_id
      };
      console.log(`Published ${entry.id} as Telegram message ${sent.message_id}.`);
    } catch (error) {
      state.entries[entry.id] = {
        ...current,
        status: "failed",
        failedAt: new Date().toISOString(),
        error: error.message
      };
      console.error(`${entry.id}: ${error.message}`);
      failed = true;
    }
  }
  await writeJson(statePath, state);
  if (failed) process.exitCode = 1;
}

const manifest = validateTelegramManifest(await readJson(manifestPath));
if (mode === "verify") {
  await verify(manifest);
} else if (mode === "claim") {
  await claim(manifest, validateTelegramState(await readJson(statePath)));
} else if (mode === "publish") {
  await verify(manifest);
  await publish(manifest, validateTelegramState(await readJson(statePath)));
} else {
  throw new Error(`Unknown Telegram automation mode: ${mode}`);
}
