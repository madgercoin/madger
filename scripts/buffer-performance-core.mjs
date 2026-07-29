export const CAMPAIGN_METRICS = Object.freeze([
  "reactions",
  "comments",
  "shares",
  "reposts",
  "reach",
  "impressions",
  "views",
  "clicks",
  "saves",
  "follows"
]);

export function metricsToObject(metrics) {
  return Object.fromEntries((metrics ?? []).map((metric) => [metric.type, metric.value]));
}

export function metricDeltas(current = {}, previous = {}) {
  const deltas = {};
  for (const [key, value] of Object.entries(current)) {
    if (Number.isFinite(value) && Number.isFinite(previous[key])) {
      deltas[key] = value - previous[key];
    }
  }
  return deltas;
}

export function channelState(channel) {
  if (channel?.isLocked) return "locked";
  if (channel?.isDisconnected) return "disconnected";
  return "connected";
}

function aggregateMetric(posts, key) {
  const values = posts.map((post) => post.metrics?.[key]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function reasonsFor(post, now) {
  const reasons = [];
  if (post.status === "error") reasons.push("publishing_error");
  if (post.status === "monitor_error") reasons.push("monitor_error");
  if (post.channelState === "disconnected") reasons.push("channel_disconnected");
  if (post.channelState === "locked") reasons.push("channel_locked");
  const dueAt = Date.parse(post.dueAt);
  if (Number.isFinite(dueAt) && dueAt + 3 * 60 * 60 * 1000 < now && post.status !== "sent") {
    reasons.push("overdue");
  }
  return reasons;
}

export function summarizeCampaign(posts, previousPosts = [], now = Date.now()) {
  const previousById = new Map(previousPosts.map((post) => [post.id, post]));
  const totals = Object.fromEntries(CAMPAIGN_METRICS.map((key) => [key, aggregateMetric(posts, key)]));
  const deltas = {};
  const deltaCohorts = {};
  for (const key of CAMPAIGN_METRICS) {
    let currentTotal = 0;
    let previousTotal = 0;
    let cohortSize = 0;
    for (const post of posts) {
      const previous = previousById.get(post.id);
      const currentValue = post.metrics?.[key];
      const previousValue = previous?.metrics?.[key];
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) continue;
      currentTotal += currentValue;
      previousTotal += previousValue;
      cohortSize += 1;
    }
    deltas[key] = cohortSize ? currentTotal - previousTotal : null;
    deltaCohorts[key] = cohortSize;
  }

  const engagementRates = posts.map((post) => post.metrics?.engagementRate).filter(Number.isFinite);
  const averageEngagementRate = engagementRates.length
    ? engagementRates.reduce((sum, value) => sum + value, 0) / engagementRates.length
    : null;

  const attentionReasons = {};
  for (const post of posts) {
    const reasons = reasonsFor(post, now);
    if (reasons.length) attentionReasons[post.id] = reasons;
  }
  const needsAttention = Object.keys(attentionReasons);
  const atRiskPosts = posts
    .filter((post) => ["scheduled", "sending"].includes(post.status))
    .filter((post) => ["disconnected", "locked"].includes(post.channelState))
    .map((post) => post.id);
  const unhealthyChannelIds = [...new Set(
    posts
      .filter((post) => ["disconnected", "locked"].includes(post.channelState))
      .map((post) => post.channelId)
      .filter(Boolean)
  )];

  return {
    totalPosts: posts.length,
    sent: posts.filter((post) => post.status === "sent").length,
    scheduled: posts.filter((post) => post.status === "scheduled").length,
    sending: posts.filter((post) => post.status === "sending").length,
    errors: posts.filter((post) => post.status === "error" || post.status === "monitor_error").length,
    needsAttention,
    attentionReasons,
    atRiskPosts,
    unhealthyChannelIds,
    totals,
    deltas,
    deltaCohorts,
    averageEngagementRate,
    priorSnapshotAvailable: previousById.size > 0
  };
}
