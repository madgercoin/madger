import assert from "node:assert/strict";
import test from "node:test";

import {
  channelState,
  metricsToObject,
  metricDeltas,
  summarizeCampaign
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
    { id: "disconnected", channelId: "x", status: "scheduled", dueAt: "2026-08-02T14:00:00Z", channelState: "disconnected", metrics: {} },
    { id: "locked", channelId: "y", status: "scheduled", dueAt: "2026-08-03T14:00:00Z", channelState: "locked", metrics: {} },
    { id: "future", status: "scheduled", dueAt: "2026-08-04T14:00:00Z", channelState: "connected", metrics: {} }
  ], [], Date.parse("2026-07-31T00:00:00Z"));
  assert.deepEqual(summary.needsAttention, ["late", "failed", "disconnected", "locked"]);
  assert.deepEqual(summary.attentionReasons.late, ["overdue"]);
  assert.deepEqual(summary.attentionReasons.failed, ["publishing_error", "overdue"]);
  assert.deepEqual(summary.attentionReasons.disconnected, ["channel_disconnected"]);
  assert.deepEqual(summary.attentionReasons.locked, ["channel_locked"]);
  assert.deepEqual(summary.atRiskPosts, ["disconnected", "locked"]);
  assert.deepEqual(summary.unhealthyChannelIds, ["x", "y"]);
  assert.equal(summary.errors, 1);
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
