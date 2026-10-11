// Publishing source of truth, verified against README.md and PROJECT_CONTEXT.md.
export const MADGER_WEBSITE = 'https://madgercoin.com';
const canonicalHost = new URL(MADGER_WEBSITE).hostname;

function fail(context, field, detail) {
  throw new Error(`MADGER preflight ${context} (${field}): ${detail}. Use ${MADGER_WEBSITE}; review captions, links, alt text and artwork before retrying.`);
}

function checkHost(host, context, field, owned = false) {
  host = host.toLowerCase().replace(/\.$/, '');
  // Only the apex and conventional www alias are approved website hosts.
  if (host === canonicalHost || host === `www.${canonicalHost}`) return;
  if (owned || host.includes('madger')) {
    fail(context, field, `unapproved MADGER website host "${host}"`);
  }
}

export function validateMadgerLinks(value, context = 'post', field = 'post') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateMadgerLinks(item, context, `${field}[${index}]`));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      validateMadgerLinks(item, context, `${field}.${key}`);
    }
  } else if (typeof value === 'string') {
    const owned = /\.(?:websiteUrl|officialWebsite|madgerWebsiteUrl)$/i.test(field);
    const normalized = value.normalize('NFKC');
    // Parse complete URLs first so MADGER account names in third-party paths
    // (x.com/madger, raw.githubusercontent.com/madgercoin/...) stay allowed.
    const remaining = normalized.replace(/(?:https?:)?\/\/[^\s<>"'`]+/gi, (raw) => {
      try {
        const url = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
        if (/madger/i.test(url.username)) fail(context, field, 'misleading MADGER URL credentials');
        checkHost(url.hostname, context, field, owned);
      } catch (error) {
        if (error.message.startsWith('MADGER preflight')) throw error;
        fail(context, field, 'malformed URL');
      }
      return ' ';
    });
    for (const match of remaining.matchAll(/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\.)?/gi)) {
      checkHost(match[0], context, field, owned);
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
  if (!mediaUrls.length) return;
  // This is a human attestation bound to the exact public assets, not OCR.
  const review = post.artworkUrlReview;
  for (const url of new Set(mediaUrls)) {
    if (!review || !Array.isArray(review.mediaUrls) || !review.mediaUrls.includes(url) ||
        typeof review.reviewedBy !== 'string' || !review.reviewedBy.trim() ||
        !Number.isFinite(Date.parse(review.reviewedAt)) ||
        review.website !== MADGER_WEBSITE || review.confirmed !== true) {
      fail(context, 'artworkUrlReview', `visual artwork URL check required for "${url}"; inspect final pixels/video frames and record mediaUrls, reviewedBy, reviewedAt, website and confirmed: true`);
    }
  }
}
