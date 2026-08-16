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

export function metadataFor(entry) {
  switch (entry.service) {
    case "instagram":
      return entry.mediaType === "image"
        ? { instagram: { type: "post", isAiGenerated: true } }
        : { instagram: { type: "reel", shouldShareToFeed: true, isAiGenerated: true } };
    case "facebook":
      return { facebook: { type: entry.mediaType === "image" ? "post" : "reel" } };
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

export function assetFor(entry) {
  if (entry.mediaType === "image") {
    return { image: { url: entry.mediaUrl } };
  }
  if (entry.mediaType && entry.mediaType !== "video") {
    throw new Error(`Unsupported mediaType for ${entry.id || "entry"}: ${entry.mediaType}`);
  }
  return {
    video: {
      url: entry.mediaUrl,
      metadata: { thumbnailOffset: entry.thumbnailOffsetMs || 1000, title: entry.title }
    }
  };
}
