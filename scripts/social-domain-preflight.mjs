// Publishing source of truth, verified against README.md and PROJECT_CONTEXT.md.
export const MADGER_WEBSITE = 'https://madgercoin.com';
const canonicalHost = new URL(MADGER_WEBSITE).hostname;

function fail(context, field, detail) {
  throw new Error(`MADGER preflight ${context} (${field}): ${detail}. Use ${MADGER_WEBSITE}; review captions, links, alt text and artwork before retrying.`);
}

function checkHost(host, context, field, owned = false, media = false) {
  host = host.toLowerCase().replace(/\.$/, '');
  // Only the apex and conventional www alias are approved website hosts.
  if (host === canonicalHost || host === `www.${canonicalHost}`) return;
  // Named buckets are media transport, not claims about MADGER's website.
  // Restrict this exception to known provider suffixes and media fields.
  if (!owned && media && /(?:\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com|\.r2\.dev)$/.test(host)) return;
  if (owned || host.includes('madger')) {
    fail(context, field, `unapproved MADGER website host "${host}"`);
  }
}

export function validateMadgerLinks(value, context = 'post', field = 'post') {
  walkLinks(value, context, field, typeof value === 'string', false);
}

function walkLinks(value, context, field, scan, media) {
  const owned = /\.(?:websiteUrl|officialWebsite|madgerWebsiteUrl)$/i.test(field);
  if (owned && typeof value !== 'string') {
    fail(context, field, 'owned website field requires a single absolute HTTPS URL string');
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkLinks(item, context, `${field}[${index}]`, scan, media));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const childField = `${field}.${key}`;
      const childMedia = /^(?:mediaUrl|assetUrl|mediaUrls)$/i.test(key) || /\.assets\[\d+\]\.(?:image|video)\.url$/i.test(childField);
      const childScan = scan || /^(?:text|caption|defaultText|altText|artworkText|title|assetTitle|websiteUrl|officialWebsite|madgerWebsiteUrl)$/i.test(key) || /(?:url|link)$/i.test(key) || childMedia;
      walkLinks(item, context, childField, childScan, childMedia);
    }
  } else if (typeof value === 'string') {
    if (!scan && !owned) return;
    const normalized = value.normalize('NFKC');
    // Parse complete URLs first so MADGER account names in third-party paths
    // (x.com/madger, raw.githubusercontent.com/madgercoin/...) stay allowed.
    const remaining = normalized.replace(/(?:https?:)?\/\/[^\s<>"'`]+/gi, (raw) => {
      try {
        // Remove only trailing prose delimiters, never an internal delimiter
        // or domain suffix. Explicit website fields remain strict below.
        const candidate = raw.replace(/[.,!?;:)\]}]+$/, '');
        const url = new URL(candidate.startsWith('//') ? `https:${candidate}` : candidate);
        if (url.username || url.password) fail(context, field, 'URL credentials are not allowed');
        checkHost(url.hostname, context, field, owned, media);
      } catch (error) {
        if (error.message.startsWith('MADGER preflight')) throw error;
        fail(context, field, 'malformed URL');
      }
      return ' ';
    });
    for (const match of remaining.matchAll(/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\.)?/gi)) {
      checkHost(match[0], context, field, owned, media);
    }
    if (owned) {
      let url;
      try { url = new URL(normalized); } catch { fail(context, field, 'website field requires an absolute HTTPS URL'); }
      if (url.protocol !== 'https:' || url.username || url.password) fail(context, field, 'website field requires an absolute HTTPS URL without credentials');
      checkHost(url.hostname, context, field, true);
    }
  }
}

export function preflightPost(post, { context = post.id || 'post', mediaUrls = [] } = {}) {
  validateMadgerLinks(post, context);
  if (!Array.isArray(mediaUrls)) fail(context, 'mediaUrls', 'media URLs must be an array of absolute HTTPS URL strings');
  if (!mediaUrls.length) return;
  // This is a human attestation bound to the exact public assets, not OCR.
  const review = post.artworkUrlReview;
  const validMedia = (url) => {
    if (typeof url !== 'string') return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
    } catch { return false; }
  };
  if (!mediaUrls.every(validMedia)) fail(context, 'mediaUrls', 'media URLs require absolute HTTPS URL strings without credentials');
  for (const url of new Set(mediaUrls)) {
    if (!review || !Array.isArray(review.mediaUrls) || !review.mediaUrls.every(validMedia) || !review.mediaUrls.includes(url) ||
        typeof review.reviewedBy !== 'string' || !review.reviewedBy.trim() ||
        typeof review.reviewedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(review.reviewedAt) ||
        !Number.isFinite(Date.parse(review.reviewedAt)) ||
        review.website !== MADGER_WEBSITE || review.confirmed !== true) {
      fail(context, 'artworkUrlReview', `visual artwork URL check required for "${url}"; inspect final pixels/video frames and record mediaUrls, reviewedBy, reviewedAt, website and confirmed: true`);
    }
  }
}
