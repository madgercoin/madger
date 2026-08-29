export const rootFiles = [
  "index.html",
  "litepaper.html",
  "official-links.html",
  "collaborators.html",
  "launch-hunt.html",
  "privacy.html",
  "blog.html",
  "blog-building-foundations.html",
  "blog-honey-badger-standard.html",
  "blog-token-link-safety.html",
  "blog.css",
  "blog.js",
  "404.html",
  "styles.css",
  "script.js",
  "launch-state.js",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "_headers"
];

export const assetFiles = [
  "madger_v5_graphics.webp",
  "madger_v5_hero.webp",
  "madger_v5_icon.png",
  "madger_v5_mascot.webp",
  "madger_v5_mascot_portrait.webp",
  "madger_official_logo_transparent_180.png",
  "madger_official_logo_transparent_192.png",
  "madger_official_logo_transparent_512.png",
  "madger_v5_social.jpg",
  "madger_v5_profile.webp",
  "madger_v6_community_welcome.webp",
  "madger_journal_writer_v2.webp",
  "madger_journal_social_v2.jpg",
  "media/madger-prelaunch-tomorrow-cpmm-v2.png"
];

export const distAllowlist = [
  ...rootFiles,
  ...assetFiles.map(file => `assets/${file}`)
].sort();
