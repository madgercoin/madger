const API_URL = 'https://api.buffer.com';
const token = process.env.BUFFER_API_TOKEN;
const requestedOrganizationId = process.env.BUFFER_ORGANIZATION_ID;
if (!token) throw new Error('BUFFER_API_TOKEN is not configured');

const ALT = 'MADGER Launch Hunt contest poster in black, gold, and neon green. $75 prize pool paid in SOL with six winners. To enter: visit madgercoin.com, find the hidden Burrow Field Mark, join The Burrow on Telegram, and submit privately. One X bonus and one verified-friend bonus allow up to three entries per person. Contest ends September 1 at 14:00 UTC.';
const FEED = 'https://raw.githubusercontent.com/madgercoin/madger/main/media/launch-hunt/madger-launch-hunt-feed.jpg';
const X_IMAGE = 'https://raw.githubusercontent.com/madgercoin/madger/main/media/launch-hunt/madger-launch-hunt-x-1600x900.jpg';
const VIDEO = 'https://raw.githubusercontent.com/madgercoin/madger/main/media/launch-hunt/madger-launch-hunt-vertical.mp4';

const posts = [
  {
    id: 'launch-hunt-x', channelId: '6a67af8a4b2d03035f4e91f4', service: 'twitter',
    text: '🐾 $MADGER LAUNCH HUNT is live.\n\n$75 prize pool paid in SOL • 6 winners • no purchase necessary.\n\nFind the hidden Field Mark, join The Burrow, submit privately. Up to 3 entries.\n\nEnds Sep 1 · 14:00 UTC\nmadgercoin.com/launch-hunt.html\n#MADGERGiveaway',
    assets: [{ image: { url: X_IMAGE, metadata: { altText: ALT } } }],
    metadata: { twitter: { isAiGenerated: true } },
  },
  {
    id: 'launch-hunt-facebook', channelId: '6a67ecc14b2d03035f50dbad', service: 'facebook',
    text: '🐾 THE $MADGER LAUNCH HUNT IS LIVE.\n\nWe’re celebrating launch with a $75 total prize pool paid in SOL and 6 winners.\n\nHOW TO ENTER\n1. Visit madgercoin.com\n2. Find the hidden Burrow Field Mark\n3. Join The Burrow on Telegram\n4. Submit your entry privately\n\nEarn up to 3 entries: 1 valid core entry + 1 verified X bonus + 1 verified-friend bonus.\n\nNo purchase necessary. No wallet connection to enter. Never send SOL or reveal a seed phrase.\n\nEnds September 1 at 14:00 UTC.\nRules + private entry: https://madgercoin.com/launch-hunt.html\n\n#MADGER #MADGERGiveaway #Solana',
    assets: [{ image: { url: FEED, metadata: { altText: ALT } } }],
    metadata: { facebook: { type: 'post' } },
  },
  {
    id: 'launch-hunt-instagram', channelId: '6a67aebb4b2d03035f4e8b45', service: 'instagram',
    text: '🐾 $MADGER LAUNCH HUNT IS LIVE.\n\n$75 total prize value paid in SOL. 6 winners.\n\n🔎 Find the hidden Burrow Field Mark\n🕳 Join The Burrow on Telegram\n🔒 Submit privately\n➕ Earn up to 3 entries with the X bonus and one verified-friend bonus\n\nNo purchase necessary. No wallet connection to enter.\nEnds Sep 1 at 14:00 UTC.\n\nRules + entry: madgercoin.com/launch-hunt.html\n\n#MADGER #MADGERGiveaway #Solana #CryptoCommunity',
    assets: [{ image: { url: FEED, metadata: { altText: ALT } } }],
    metadata: { instagram: { type: 'post', shouldShareToFeed: true, isAiGenerated: true } },
  },
  {
    id: 'launch-hunt-tiktok', channelId: '6a67b0034b2d03035f4e9477', service: 'tiktok',
    text: '🐾 The $MADGER Launch Hunt is LIVE. 6 winners. $75 total prize value paid in SOL. Find the hidden Burrow Field Mark, join The Burrow, submit privately, and earn up to 3 entries. No purchase necessary. Ends Sep 1, 14:00 UTC. Rules: madgercoin.com/launch-hunt.html #MADGER #MADGERGiveaway #Solana',
    assets: [{ video: { url: VIDEO, metadata: { thumbnailOffset: 1000, title: 'MADGER Launch Hunt' } } }],
    metadata: { tiktok: { title: 'MADGER Launch Hunt — $75 paid in SOL · 6 winners', isAiGenerated: true } },
  },
];

async function graphql(query, variables = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) throw new Error(`Buffer API error: ${JSON.stringify(payload.errors || payload)}`);
  return payload.data;
}

const accountData = await graphql(`query Account { account { organizations { id name } } }`);
const organizations = accountData.account.organizations;
const organization = requestedOrganizationId
  ? organizations.find((o) => o.id === requestedOrganizationId)
  : organizations.length === 1 ? organizations[0] : null;
if (!organization) throw new Error('Unable to resolve the Buffer organization');

const channelData = await graphql(`query Channels($organizationId: OrganizationId!) { channels(input: { organizationId: $organizationId }) { id name service isDisconnected isLocked } }`, { organizationId: organization.id });
const channelMap = new Map(channelData.channels.map((c) => [c.id, c]));
for (const post of posts) {
  const channel = channelMap.get(post.channelId);
  if (!channel || channel.service !== post.service || channel.isDisconnected || channel.isLocked) {
    throw new Error(`${post.id}: target channel is not available`);
  }
}

const existingData = await graphql(`query Posts($organizationId: OrganizationId!, $channelIds: [ChannelId!]) { posts(first: 100, input: { organizationId: $organizationId, filter: { channelIds: $channelIds } }) { edges { node { id text channelId } } } }`, { organizationId: organization.id, channelIds: posts.map((p) => p.channelId) });
const existing = existingData.posts.edges.map(({ node }) => node);
const mutation = `mutation Create($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id text channelId dueAt } } ... on MutationError { message } } }`;
const results = [];

for (const post of posts) {
  const duplicate = existing.find((p) => p.channelId === post.channelId && p.text === post.text);
  if (duplicate) {
    results.push({ id: post.id, status: 'existing', bufferPostId: duplicate.id });
    continue;
  }
  const input = {
    text: post.text,
    channelId: post.channelId,
    schedulingType: 'automatic',
    mode: 'shareNow',
    assets: post.assets,
    metadata: post.metadata,
    aiAssisted: true,
    source: 'madger-launch-hunt-github',
  };
  const data = await graphql(mutation, { input });
  if (data.createPost.message) throw new Error(`${post.id}: ${data.createPost.message}`);
  results.push({ id: post.id, status: 'published', bufferPostId: data.createPost.post.id, channelId: data.createPost.post.channelId });
}
console.log(JSON.stringify({ organization, results }, null, 2));
