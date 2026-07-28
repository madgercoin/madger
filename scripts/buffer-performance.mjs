import fs from 'node:fs/promises';

const API_URL = 'https://api.buffer.com';
const token = process.env.BUFFER_API_TOKEN;
if (!token) throw new Error('BUFFER_API_TOKEN is not configured');

async function graphql(query, variables = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) throw new Error(JSON.stringify(payload.errors || payload));
  return payload.data;
}

const account = await graphql(`query { account { organizations { id name } } }`);
const organizations = account.account.organizations;
const requestedId = process.env.BUFFER_ORGANIZATION_ID;
const organization = requestedId
  ? organizations.find((item) => item.id === requestedId)
  : organizations.length === 1 ? organizations[0] : null;
if (!organization) throw new Error('Unable to resolve one Buffer organization');

const channelData = await graphql(`
  query Channels($organizationId: OrganizationId!) {
    channels(input: { organizationId: $organizationId }) {
      id name displayName service externalLink isDisconnected isLocked isQueuePaused
    }
  }
`, { organizationId: organization.id });

const end = new Date();
const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
const rows = [];
for (const channel of channelData.channels) {
  try {
    const data = await graphql(`
      query Metrics($input: AggregatedPostMetricsInput!) {
        aggregatedPostMetrics(input: $input) {
          metrics { type name value unit }
          metricsUpdatedAt
        }
      }
    `, { input: {
      organizationId: organization.id,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      channelIds: [channel.id],
    } });
    const values = Object.fromEntries(data.aggregatedPostMetrics.metrics.map((m) => [m.type, m.value]));
    rows.push({
      channelId: channel.id,
      channel: channel.displayName || channel.name,
      service: channel.service,
      externalLink: channel.externalLink,
      healthy: !channel.isDisconnected && !channel.isLocked,
      queuePaused: channel.isQueuePaused,
      metricsUpdatedAt: data.aggregatedPostMetrics.metricsUpdatedAt,
      metrics: values,
      requiresCommunityReview: (values.comments || 0) > 0,
    });
  } catch (error) {
    rows.push({
      channelId: channel.id,
      channel: channel.displayName || channel.name,
      service: channel.service,
      externalLink: channel.externalLink,
      healthy: !channel.isDisconnected && !channel.isLocked,
      queuePaused: channel.isQueuePaused,
      error: error.message,
    });
  }
}

const report = {
  generatedAt: end.toISOString(),
  window: { start: start.toISOString(), end: end.toISOString() },
  organization,
  channels: rows,
  limitations: [
    'Buffer metrics refresh approximately daily.',
    'A comment count identifies engagement but does not expose message text through the documented public API.',
    'Individual replies must use Buffer Community or the native social network until a supported reply endpoint exists.'
  ]
};
await fs.mkdir('reports/social', { recursive: true });
await fs.writeFile('reports/social/latest.json', JSON.stringify(report, null, 2) + '\n');

const metric = (row, key) => row.metrics?.[key] ?? '—';
const lines = [
  '# MADGER social performance',
  '',
  `Generated: ${report.generatedAt}`,
  `Window: ${report.window.start} to ${report.window.end}`,
  '',
  '| Channel | Health | Posts | Reactions | Comments | Shares | Views | Review |',
  '|---|---|---:|---:|---:|---:|---:|---|',
  ...rows.map((row) => `| ${row.service}: ${row.channel} | ${row.healthy ? 'Connected' : 'Attention'} | ${metric(row, 'postCount')} | ${metric(row, 'reactions')} | ${metric(row, 'comments')} | ${metric(row, 'shares')} | ${metric(row, 'views')} | ${row.requiresCommunityReview ? 'Check Buffer Community' : 'None flagged'} |`),
  '',
  '## Interpretation',
  '',
  '- Metrics can lag network activity by roughly 24 hours.',
  '- A missing metric is not treated as zero unless Buffer returns the metric explicitly.',
  '- Comment counts trigger a human-readable review flag; no automated public reply is sent without message text and context.',
  ''
];
await fs.writeFile('reports/social/latest.md', lines.join('\n'));
console.log(JSON.stringify(report, null, 2));
