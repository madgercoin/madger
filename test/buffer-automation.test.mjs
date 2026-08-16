import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { assetFor, evaluateScheduledEntry, metadataFor } from "../scripts/buffer-automation-core.mjs";

const future = "2030-01-01T15:00:00.000Z";
const past = "2020-01-01T15:00:00.000Z";
const baseEntry = {
  id: "madger-test-x",
  text: "Test post",
  dueAt: future,
  mediaUrl: "https://media.example/madger.mp4"
};

test("accepts a unique future post", () => {
  const result = evaluateScheduledEntry({
    entry: baseEntry,
    channelId: "channel-1",
    existingPosts: [],
    now: Date.parse("2029-01-01T00:00:00.000Z")
  });
  assert.equal(result.dueAt.toISOString(), future);
  assert.equal(result.duplicate, null);
});

test("skips a previously accepted post even after dueAt has passed", () => {
  const duplicate = { id: "buffer-post-1", channelId: "channel-1", text: "Test post", dueAt: past };
  const result = evaluateScheduledEntry({
    entry: { ...baseEntry, dueAt: past, mediaUrl: "" },
    channelId: "channel-1",
    existingPosts: [duplicate],
    now: Date.parse("2026-01-01T00:00:00.000Z")
  });
  assert.equal(result.duplicate, duplicate);
});

test("rejects a unique expired post", () => {
  assert.throws(() => evaluateScheduledEntry({
    entry: { ...baseEntry, dueAt: past },
    channelId: "channel-1",
    existingPosts: [],
    now: Date.parse("2026-01-01T00:00:00.000Z")
  }), /Expired dueAt/);
});

test("rejects an invalid timestamp", () => {
  assert.throws(() => evaluateScheduledEntry({
    entry: { ...baseEntry, dueAt: "not-a-date" },
    channelId: "channel-1",
    existingPosts: []
  }), /Invalid dueAt/);
});

test("rejects missing public media for a new post", () => {
  assert.throws(() => evaluateScheduledEntry({
    entry: { ...baseEntry, mediaUrl: "" },
    channelId: "channel-1",
    existingPosts: [],
    now: Date.parse("2029-01-01T00:00:00.000Z")
  }), /Public HTTPS mediaUrl missing/);
});

test("does not treat a different channel, caption, or time as a duplicate", () => {
  const existingPosts = [
    { id: "wrong-channel", channelId: "channel-2", text: "Test post", dueAt: future },
    { id: "wrong-text", channelId: "channel-1", text: "Different", dueAt: future },
    { id: "wrong-time", channelId: "channel-1", text: "Test post", dueAt: "2030-01-01T16:00:00.000Z" }
  ];
  const result = evaluateScheduledEntry({
    entry: baseEntry,
    channelId: "channel-1",
    existingPosts,
    now: Date.parse("2029-01-01T00:00:00.000Z")
  });
  assert.equal(result.duplicate, null);
});

test("YouTube metadata always includes Buffer's required category and title", () => {
  const metadata = metadataFor({ service: "youtube", title: "MADGER 002 — Keep Digging" });
  assert.equal(metadata.youtube.categoryId, "24");
  assert.equal(metadata.youtube.title, "MADGER 002 — Keep Digging");
  assert.equal(metadata.youtube.privacy, "public");
  assert.equal(metadata.youtube.madeForKids, false);
});

test("creates an image asset without video-only metadata", () => {
  assert.deepEqual(assetFor({
    mediaType: "image",
    mediaUrl: "https://media.example/celebration.jpg"
  }), { image: { url: "https://media.example/celebration.jpg" } });
});

test("retains video asset metadata by default", () => {
  assert.deepEqual(assetFor({
    mediaUrl: "https://media.example/madger.mp4",
    title: "Keep Digging",
    thumbnailOffsetMs: 2000
  }), { video: {
    url: "https://media.example/madger.mp4",
    metadata: { thumbnailOffset: 2000, title: "Keep Digging" }
  } });
});

test("rejects unknown media types instead of sending a malformed asset", () => {
  assert.throws(() => assetFor({
    id: "bad-media",
    mediaType: "document",
    mediaUrl: "https://media.example/file.pdf"
  }), /Unsupported mediaType for bad-media: document/);
});

test("uses static-post metadata for Facebook and Instagram images", () => {
  assert.deepEqual(metadataFor({ service: "facebook", mediaType: "image" }), {
    facebook: { type: "post" }
  });
  assert.deepEqual(metadataFor({ service: "instagram", mediaType: "image" }), {
    instagram: { type: "post", shouldShareToFeed: true, isAiGenerated: true }
  });
});

test("approved meme contest launch covers every Buffer channel", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL(
    "../content/buffer-schedule.json",
    import.meta.url
  )));
  const posts = manifest.posts.filter(({ id }) => id.startsWith("meme-contest-launch-"));

  assert.equal(posts.length, 5);
  assert.deepEqual(new Set(posts.map(({ service }) => service)), new Set([
    "twitter", "facebook", "instagram", "tiktok", "youtube"
  ]));
  assert.ok(posts.every(({ enabled }) => enabled === true));
  assert.ok(posts.every(({ mediaUrl }) => mediaUrl.startsWith("https://")));
  assert.equal(posts.find(({ service }) => service === "twitter").text.length <= 280, true);
  assert.ok(posts.filter(({ service }) => ["tiktok", "youtube"].includes(service))
    .every(({ mediaType }) => mediaType === "video"));
  assert.ok(posts.filter(({ service }) => ["twitter", "facebook", "instagram"].includes(service))
    .every(({ mediaType }) => mediaType === "image"));

  const rules = fs.readFileSync(new URL("../docs/meme-contest-2026-08.md", import.meta.url), "utf8");
  assert.match(rules, /First place — US\$20 in SOL/);
  assert.match(rules, /Second place — US\$10 in SOL/);
  assert.match(rules, /Third place — US\$5 in SOL/);
  assert.match(rules, /Silver Shovel — August 2026/);
  assert.match(rules, /Bronze Claw — August 2026/);
  assert.ok(posts.every(({ text }) => /\$20|\$35/.test(text)));
  assert.ok(posts.every(({ text }) => text.includes("madgercoin.com/meme-contest.html")));
});
