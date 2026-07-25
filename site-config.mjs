export const rootFiles = [
  "index.html",
  "litepaper.html",
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
  "favicon.png",
  "madger_brand_board.jpg",
  "madger_brand_guide.png",
  "madger_full_logo.png",
  "madger_hero.jpg",
  "madger_profile.png",
  "madger_round_icon.png",
  "madger_wallet_icon.png",
  "madger_x_banner.png"
];

export const distAllowlist = [
  ...rootFiles,
  ...assetFiles.map(file => `assets/${file}`)
].sort();
