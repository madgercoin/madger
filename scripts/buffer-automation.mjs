import fs from 'node:fs/promises';
import { assetFor, evaluateScheduledEntry, metadataFor } from './buffer-automation-core.mjs';

const API_URL = 'https://api.buffer.com';
const token = process.env.BUFFER_API_TOKEN;
const mode = process.argv[2] || 'discover';
const manifestPath = process.argv[3] || 'content/buffer-schedule.json';

if (!token) throw new Error('BUFFER_API_TOKEN is not configured');

async function graphql(query, variables = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(`Buffer API error: ${JSON.stringify(payload.errors || payload)}`);
  }
  return payload.data;
}

async function discover() {
  const accountData = await graphql(`
    query DiscoverAccount {
      account { organizations { id name } }
    }
  `);
  const organizations = accountData.account.organizations;
  if (!organizations.length) throw new Error('No Buffer organization is available');
  const requestedId = process.env.BUFFER_ORGANIZATION_ID;
  const organization = requestedId
    ? organizations.find((item) => item.id === requestedId)
    : organizations.length === 1 ? organizations[0] : null;
  if (!organization) {
    throw new Error('Multiple Buffer organizations found; set BUFFER_ORGANIZATION_ID');
  }
  const channelData = await graphql(`
    query DiscoverChannels($organizationId: OrganizationId!) {
      channels(input: { organizationId: $organizationId }) {
        id name displayName service externalLink isDisconnected isLocked isQueuePaused
      }
    }
  `, { organizationId: organization.id });
  return { organization, channels: channelData.channels };
}

function findChannel(channels, target) {
  const matches = target.channelId
    ? channels.filter((channel) => channel.id === target.channelId && channel.service === target.service)
    : channels.filter((channel) => {
        if (channel.service !== target.service) return false;
        if (!target.channelName) return true;
        const wanted = target.channelName.toLowerCase();
        return [channel.name, channel.displayName].filter(Boolean)
          .some((value) => value.toLowerCase().includes(wanted));
      });
  if (matches.length !== 1) {
    throw new Error(`Expected one ${target.service} channel for ${target.id}; found ${matches.length}`);
  }
  const channel = matches[0];
  if (channel.isDisconnected || channel.isLocked) {
    throw new Error(`Channel ${channel.name} is unavailable`);
  }
  return channel;
}

async function scheduledPosts(organizationId, channelIds) {
  const posts = [];
  let after = null;
  do {
    const data = await graphql(`
      query ExistingPosts($organizationId: OrganizationId!, $channelIds: [ChannelId!], $after: String) {
        posts(first: 100, after: $after, input: {
          organizationId: $organizationId,
          filter: { channelIds: $channelIds }
        }) {
          edges { node { id text dueAt channelId } }
          pageInfo { hasNextPage endCursor }
        }
      }
    `, { organizationId, channelIds, after });
    posts.push(...data.posts.edges.map(({ node }) => node));
    after = data.posts.pageInfo.hasNextPage ? data.posts.pageInfo.endCursor : null;
    if (data.posts.pageInfo.hasNextPage && !after) {
      throw new Error('Buffer returned another posts page without an end cursor');
    }
  } while (after);
  return posts;
}

async function publish() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported manifest schemaVersion');
  const active = manifest.posts.filter((entry) => entry.enabled === true);
  if (!active.length) {
    console.log('No enabled posts. Automation is safely idle without calling Buffer.');
    return;
  }
  const { organization, channels } = await discover();
  const resolved = active.map((entry) => ({ entry, channel: findChannel(channels, entry) }));
  const existing = await scheduledPosts(organization.id, [...new Set(resolved.map(({ channel }) => channel.id))]);
  const mutation = `
    mutation SchedulePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text dueAt channelId } }
        ... on MutationError { message }
      }
    }
  `;
  for (const { entry, channel } of resolved) {
    const { dueAt, duplicate } = evaluateScheduledEntry({
      entry,
      channelId: channel.id,
      existingPosts: existing,
      now: Date.now(),
    });
    if (duplicate) {
      console.log(`Skipping existing post ${entry.id}: ${duplicate.id}`);
      continue;
    }
    const input = {
      text: entry.text,
      channelId: channel.id,
      schedulingType: 'automatic',
      mode: 'customScheduled',
      dueAt: dueAt.toISOString(),
      assets: [assetFor(entry)],
      aiAssisted: true,
      source: 'madger-github-automation',
    };
    const metadata = metadataFor(entry);
    if (metadata) input.metadata = metadata;
    const result = await graphql(mutation, { input });
    if (result.createPost.message) throw new Error(`${entry.id}: ${result.createPost.message}`);
    console.log(`Scheduled ${entry.id}: ${result.createPost.post.id}`);
  }
}

async function publishNow() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported manifest schemaVersion');
  const active = manifest.posts.filter((entry) => entry.publishNow === true);
  if (!active.length) {
    console.log('No posts flagged for immediate publishing. Automation is safely idle.');
    return;
  }
  const mutation = `
    mutation PublishPostNow($input: EditPostInput!) {
      editPost(input: $input) {
        ... on PostActionSuccess { post { id text dueAt channelId } }
        ... on MutationError { message }
      }
    }
  `;
  for (const entry of active) {
    if (!entry.bufferPostId) throw new Error(`Buffer post ID missing for ${entry.id}`);
    const input = {
      id: entry.bufferPostId,
      text: entry.text,
      schedulingType: 'automatic',
      mode: 'shareNow',
      assets: [assetFor(entry)],
      aiAssisted: true,
      source: 'madger-github-automation',
    };
    const metadata = metadataFor(entry);
    if (metadata) input.metadata = metadata;
    const result = await graphql(mutation, { input });
    if (result.editPost.message) throw new Error(`${entry.id}: ${result.editPost.message}`);
    console.log(`Published ${entry.id} now: ${result.editPost.post.id}`);
  }
}

if (mode === 'discover') {
  const result = await discover();
  console.log(JSON.stringify(result, null, 2));
} else if (mode === 'publish') {
  await publish();
} else if (mode === 'publish-now') {
  await publishNow();
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
