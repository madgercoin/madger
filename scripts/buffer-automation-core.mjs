export function evaluateScheduledEntry({ entry, channelId, existingPosts, now = Date.now() }) {
  const dueAt = new Date(entry.dueAt);
  if (!Number.isFinite(dueAt.getTime())) {
    throw new Error(`Invalid dueAt for ${entry.id}`);
  }

  const dueAtIso = dueAt.toISOString();
  const duplicate = existingPosts.find((post) =>
    post.channelId === channelId &&
    post.text === entry.text &&
    new Date(post.dueAt).toISOString() === dueAtIso
  );

  if (duplicate) return { dueAt, duplicate };

  if (dueAt.getTime() <= now) {
    throw new Error(`Expired dueAt for ${entry.id}`);
  }
  if (!entry.mediaUrl?.startsWith("https://")) {
    throw new Error(`Public HTTPS mediaUrl missing for ${entry.id}`);
  }

  return { dueAt, duplicate: null };
}
