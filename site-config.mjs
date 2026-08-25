export const rootFiles = [
  "index.html",
  "litepaper.html",
  "official-links.html",
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
  "madger_v5_official_logo.webp",
  "madger_v5_social.jpg",
  "madger_v5_profile.webp",
  "media/madger-prelaunch-2-days.png"
];

export const distAllowlist = [
  ...rootFiles,
  ...assetFiles.map(file => `assets/${file}`)
].sort();
