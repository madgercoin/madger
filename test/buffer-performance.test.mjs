import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import {
  channelState,
  metricsToObject,
  metricDeltas,
  summarizeCampaign,
  monitoredChannels,
  monitoredCampaignEntries
} from "../scripts/buffer-performance-core.mjs";

test("converts Buffer metrics into keyed values", () => {
  assert.deepEqual(metricsToObject([
    { type: "views", value: 120 },
    { type: "engagementRate", value: 4.5 }
  ]), { views: 120, engagementRate: 4.5 });
});

test("calculates only comparable per-post metric deltas", () => {
  assert.deepEqual(
    metricDeltas({ views: 125, reactions: 9, follows: 2 }, { views: 100, reactions: 4 }),
    { views: 25, reactions: 5 }
  );
});

test("classifies Buffer channel connection state with locked taking precedence", () => {
  assert.equal(channelState(null), "unknown");
  assert.equal(channelState({ isDisconnected: false, isLocked: false }), "connected");
  assert.equal(channelState({ isDisconnected: true, isLocked: false }), "disconnected");
  assert.equal(channelState({ isDisconnected: true, isLocked: true }), "locked");
});

test("summarizes campaign totals without treating unavailable metrics as zero", () => {
  const summary = summarizeCampaign([
    { id: "a", status: "sent", dueAt: "2026-07-29T14:00:00Z", metrics: { views: 100, reactions: 4, engagementRate: 5 } },
    { id: "b", status: "scheduled", dueAt: "2030-07-29T14:00:00Z", metrics: {} }
  ], [], Date.parse("2026-07-30T00:00:00Z"));
  assert.equal(summary.totalPosts, 2);
  assert.equal(summary.sent, 1);
  assert.equal(summary.scheduled, 1);
  assert.equal(summary.totals.views, 100);
  assert.equal(summary.totals.follows, null);
  assert.equal(summary.averageEngagementRate, 5);
});

test("calculates campaign-level growth against the prior snapshot", () => {
  const previous = [{ id: "a", status: "sent", dueAt: "2026-07-29T14:00:00Z", metrics: { views: 100, reactions: 4 } }];
  const current = [{ id: "a", status: "sent", dueAt: "2026-07-29T14:00:00Z", metrics: { views: 175, reactions: 10 } }];
  const summary = summarizeCampaign(current, previous, Date.parse("2026-07-30T00:00:00Z"));
  assert.equal(summary.deltas.views, 75);
  assert.equal(summary.deltas.reactions, 6);
  assert.equal(summary.priorSnapshotAvailable, true);
});

test("flags overdue, errored, disconnected, and locked campaign posts with reasons", () => {
  const summary = summarizeCampaign([
    { id: "late", status: "scheduled", dueAt: "2026-07-29T14:00:00Z", channelState: "connected", metrics: {} },
    { id: "failed", status: "error", dueAt: "2026-07-30T14:00:00Z", channelState: "connected", metrics: {} },
    { id: "disconnected", channelId: "x", status: "monitor_error", dueAt: "2026-08-02T14:00:00Z", channelState: "disconnected", metrics: {} },
    { id: "locked", channelId: "y", status: "scheduled", dueAt: "2026-08-03T14:00:00Z", channelState: "locked", metrics: {} },
    { id: "missing", channelId: "z", status: "scheduled", dueAt: "2026-08-03T15:00:00Z", channelState: "unknown", metrics: {} },
    { id: "future", status: "scheduled", dueAt: "2026-08-04T14:00:00Z", channelState: "connected", metrics: {} }
  ], [], Date.parse("2026-07-31T00:00:00Z"));
  assert.deepEqual(summary.needsAttention, ["late", "failed", "disconnected", "locked", "missing"]);
  assert.deepEqual(summary.attentionReasons.late, ["overdue"]);
  assert.deepEqual(summary.attentionReasons.failed, ["publishing_error", "overdue"]);
  assert.deepEqual(summary.attentionReasons.disconnected, ["monitor_error", "channel_disconnected"]);
  assert.deepEqual(summary.attentionReasons.locked, ["channel_locked"]);
  assert.deepEqual(summary.attentionReasons.missing, ["channel_missing"]);
  assert.deepEqual(summary.atRiskPosts, ["disconnected", "locked", "missing"]);
  assert.deepEqual(summary.unhealthyChannelIds, ["x", "y", "z"]);
  assert.equal(summary.errors, 2);
});

test("campaign deltas ignore missing queries, new posts, and newly available metrics", () => {
  const previous = [
    { id: "failed-now", status: "sent", dueAt: "2026-07-29T14:00:00Z", metrics: { views: 100 } },
    { id: "comparable", status: "sent", dueAt: "2026-07-29T15:00:00Z", metrics: { views: 50 } }
  ];
  const current = [
    { id: "failed-now", status: "monitor_error", dueAt: "2026-07-29T14:00:00Z", metrics: {} },
    { id: "comparable", status: "sent", dueAt: "2026-07-29T15:00:00Z", metrics: { views: 75, follows: 2 } },
    { id: "new-post", status: "sent", dueAt: "2026-07-29T16:00:00Z", metrics: { views: 20 } }
  ];
  const summary = summarizeCampaign(current, previous, Date.parse("2026-07-30T00:00:00Z"));
  assert.equal(summary.deltas.views, 25);
  assert.equal(summary.deltaCohorts.views, 1);
  assert.equal(summary.deltas.follows, null);
  assert.equal(summary.deltaCohorts.follows, 0);
});

test("retired channels and campaign entries are excluded without hiding active unhealthy channels", () => {
  const registry = { x: { retiredChannelId: "retired" } };
  assert.deepEqual(monitoredChannels([
    { id: "retired", isDisconnected: true },
    { id: "current", isDisconnected: true }
  ], registry), [{ id: "current", isDisconnected: true }]);
  const entries = monitoredCampaignEntries({ posts: [
    { id: "obsolete", channelId: "retired", bufferPostId: "old", enabled: false },
    { id: "active", channelId: "current", bufferPostId: "new", enabled: false },
    { id: "draft", channelId: "current" }
  ] }, registry);
  assert.deepEqual(entries.map((entry) => entry.id), ["active"]);
  const summary = summarizeCampaign(entries.map((entry) => ({
    ...entry, channelState: "disconnected", status: "monitor_error", metrics: {}
  })));
  assert.deepEqual(summary.atRiskPosts, ["active"]);
});

test("retired X manifest records retain their IDs in an audit-only archive", () => {
  const read = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
  const manifest = read("../content/buffer-schedule.json");
  const registry = read("../config/social-channels.json");
  const archive = read("../content/archive/2026-10-10-retired-x.json");
  assert.equal(manifest.posts.some((entry) => entry.channelId === registry.x.retiredChannelId), false);
  assert.equal(manifest.posts.some((entry) => entry.service === "twitter" && entry.channelName?.toLowerCase() === "madgercoin"), false);
  assert.equal(archive.posts.find((entry) => entry.id === "madger-002-x").bufferPostId, "6a6872fa7c69e407413f994b");
  assert.ok(archive.posts.every((entry) => entry.enabled === false));
  const snapshot = read("../reports/social/archive/2026-10-10-before-x-retirement.json");
  assert.ok(snapshot.campaign.summary.atRiskPosts.includes("madger-002-x"));
});
