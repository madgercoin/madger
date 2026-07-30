import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTelegramRequest,
  claimDuePosts,
  normalizeBotUsername,
  validateTelegramManifest
} from "../scripts/telegram-automation-core.mjs";

const manifest = {
  schemaVersion: 1,
  botUsername: "madger_publisher_bot",
  targets: {
    channel: "@madgercoin",
    group: "@madgerburrow"
  },
  posts: []
};

test("normalizes the configured bot username", () => {
  assert.equal(normalizeBotUsername(" @Madger_Publisher_Bot "), "madger_publisher_bot");
});

test("validates the Telegram manifest and unique post IDs", () => {
  const valid = {
    ...manifest,
    posts: [{
      id: "madger-telegram-001",
      enabled: false,
      target: "channel",
      dueAt: "2030-01-01T15:00:00.000Z",
      text: "Meet MADGER."
    }]
  };
  assert.equal(validateTelegramManifest(valid), valid);
  assert.throws(
    () => validateTelegramManifest({ ...valid, schemaVersion: 2 }),
    /Unsupported Telegram manifest/
  );
  assert.throws(
    () => validateTelegramManifest({ ...valid, posts: [valid.posts[0], valid.posts[0]] }),
    /Duplicate Telegram schedule entry/
  );
});

test("claims a due post once and leaves future posts alone", () => {
  const scheduled = {
    ...manifest,
    posts: [
      {
        id: "due",
        enabled: true,
        target: "channel",
        dueAt: "2030-01-01T15:00:00.000Z",
        text: "Due now"
      },
      {
        id: "future",
        enabled: true,
        target: "group",
        dueAt: "2030-01-01T17:00:00.000Z",
        text: "Later"
      }
    ]
  };
  const first = claimDuePosts({
    manifest: scheduled,
    state: { schemaVersion: 1, entries: {} },
    now: Date.parse("2030-01-01T15:30:00.000Z")
  });
  assert.deepEqual(first.claimed.map(({ id }) => id), ["due"]);
  assert.equal(first.state.entries.due.status, "claimed");

  const retry = claimDuePosts({
    manifest: scheduled,
    state: first.state,
    now: Date.parse("2030-01-01T15:45:00.000Z")
  });
  assert.equal(retry.claimed.length, 0);
});

test("expires stale posts instead of publishing them late", () => {
  const result = claimDuePosts({
    manifest: {
      ...manifest,
      posts: [{
        id: "stale",
        enabled: true,
        target: "channel",
        dueAt: "2030-01-01T12:00:00.000Z",
        text: "Too late"
      }]
    },
    state: { schemaVersion: 1, entries: {} },
    now: Date.parse("2030-01-01T15:00:00.000Z"),
    maxLatenessMinutes: 90
  });
  assert.equal(result.claimed.length, 0);
  assert.equal(result.state.entries.stale.status, "expired");
});

test("builds Telegram video and text requests without parsing untrusted markup", () => {
  const video = buildTelegramRequest({
    entry: {
      text: "Meet MADGER.",
      mediaUrl: "https://media.example/madger.mp4"
    },
    chatId: "@madgercoin"
  });
  assert.equal(video.method, "sendVideo");
  assert.equal(video.body.chat_id, "@madgercoin");
  assert.equal(video.body.parse_mode, undefined);

  const textOnly = buildTelegramRequest({
    entry: { text: "Welcome to the Burrow." },
    chatId: "@madgerburrow"
  });
  assert.equal(textOnly.method, "sendMessage");
  assert.equal(textOnly.body.text, "Welcome to the Burrow.");
});

