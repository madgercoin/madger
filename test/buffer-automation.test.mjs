import assert from "node:assert/strict";
import test from "node:test";

import { evaluateScheduledEntry, metadataFor } from "../scripts/buffer-automation-core.mjs";

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
