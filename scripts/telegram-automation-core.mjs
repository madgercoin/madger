const MESSAGE_LIMIT = 4096;
const CAPTION_LIMIT = 1024;

export function normalizeBotUsername(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function validateTelegramManifest(manifest) {
  if (manifest?.schemaVersion !== 1) {
    throw new Error("Unsupported Telegram manifest schemaVersion");
  }
  if (!normalizeBotUsername(manifest.botUsername)) {
    throw new Error("Telegram manifest botUsername is required");
  }
  if (!manifest.targets || typeof manifest.targets !== "object") {
    throw new Error("Telegram manifest targets are required");
  }
  for (const target of ["channel", "group"]) {
    if (typeof manifest.targets[target] !== "string" || !manifest.targets[target].trim()) {
      throw new Error(`Telegram ${target} target is required`);
    }
  }
  if (!Array.isArray(manifest.posts)) {
    throw new Error("Telegram manifest posts must be an array");
  }

  const ids = new Set();
  for (const entry of manifest.posts) {
    if (typeof entry?.id !== "string" || !entry.id.trim()) {
      throw new Error("Every Telegram schedule entry must have a non-empty id");
    }
    const id = entry.id.trim();
    if (ids.has(id)) throw new Error(`Duplicate Telegram schedule entry id: ${id}`);
    ids.add(id);

    if (!["channel", "group"].includes(entry.target)) {
      throw new Error(`Unsupported Telegram target for ${id}`);
    }
    if (typeof entry.text !== "string" || !entry.text.trim()) {
      throw new Error(`Telegram text is required for ${id}`);
    }
    const limit = entry.mediaUrl ? CAPTION_LIMIT : MESSAGE_LIMIT;
    if (entry.text.length > limit) {
      throw new Error(`Telegram text exceeds ${limit} characters for ${id}`);
    }
    if (entry.mediaUrl && !entry.mediaUrl.startsWith("https://")) {
      throw new Error(`Public HTTPS mediaUrl required for ${id}`);
    }
    const dueAt = new Date(entry.dueAt);
    if (!Number.isFinite(dueAt.getTime())) {
      throw new Error(`Invalid Telegram dueAt for ${id}`);
    }
  }
  return manifest;
}

export function validateTelegramState(state) {
  if (state?.schemaVersion !== 1 || typeof state.entries !== "object" || !state.entries) {
    throw new Error("Invalid Telegram publication state");
  }
  return state;
}

export function claimDuePosts({
  manifest,
  state,
  now = Date.now(),
  maxLatenessMinutes = 90
}) {
  validateTelegramManifest(manifest);
  validateTelegramState(state);
  if (!Number.isFinite(maxLatenessMinutes) || maxLatenessMinutes <= 0) {
    throw new Error("maxLatenessMinutes must be positive");
  }

  const nextState = structuredClone(state);
  const claimed = [];
  const maxLatenessMs = maxLatenessMinutes * 60_000;
  const claimedAt = new Date(now).toISOString();

  for (const entry of manifest.posts) {
    if (entry.enabled !== true || nextState.entries[entry.id]) continue;
    const dueAtMs = new Date(entry.dueAt).getTime();
    if (dueAtMs > now) continue;

    if (now - dueAtMs > maxLatenessMs) {
      nextState.entries[entry.id] = {
        status: "expired",
        dueAt: new Date(dueAtMs).toISOString(),
        observedAt: claimedAt,
        target: entry.target
      };
      continue;
    }

    nextState.entries[entry.id] = {
      status: "claimed",
      dueAt: new Date(dueAtMs).toISOString(),
      claimedAt,
      target: entry.target
    };
    claimed.push(structuredClone(entry));
  }

  return { claimed, state: nextState };
}

export function buildTelegramRequest({ entry, chatId }) {
  if (!entry || !chatId) throw new Error("Telegram entry and chatId are required");
  if (entry.mediaUrl) {
    return {
      method: "sendVideo",
      body: {
        chat_id: chatId,
        video: entry.mediaUrl,
        caption: entry.text,
        supports_streaming: true
      }
    };
  }
  return {
    method: "sendMessage",
    body: {
      chat_id: chatId,
      text: entry.text,
      disable_web_page_preview: false
    }
  };
}

