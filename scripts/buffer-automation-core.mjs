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

export function validateScheduleManifest(manifest) {
  if (manifest?.schemaVersion !== 1) {
    throw new Error("Unsupported manifest schemaVersion");
  }
  if (!Array.isArray(manifest.posts)) {
    throw new Error("Schedule manifest posts must be an array");
  }

  const ids = new Set();
  for (const entry of manifest.posts) {
    if (typeof entry?.id !== "string" || !entry.id.trim()) {
      throw new Error("Every schedule entry must have a non-empty id");
    }
    const id = entry.id.trim();
    if (ids.has(id)) {
      throw new Error(`Duplicate schedule entry id: ${id}`);
    }
    ids.add(id);
  }
  return manifest.posts;
}

export function metadataFor(entry) {
  switch (entry.service) {
    case "instagram":
      return { instagram: { type: "reel", shouldShareToFeed: true, isAiGenerated: true } };
    case "facebook":
      return { facebook: { type: "reel" } };
    case "tiktok":
      return { tiktok: { isAiGenerated: true } };
    case "youtube":
      return {
        youtube: {
          title: entry.title,
          categoryId: "24",
          privacy: "public",
          madeForKids: false,
          embeddable: true,
          notifySubscribers: true,
          isAiGenerated: true
        }
      };
    case "twitter":
      return { twitter: { isAiGenerated: true } };
    default:
      return undefined;
  }
}
