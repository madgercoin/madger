export const rootFiles = [
  "index.html",
  "launch.html",
  "litepaper.html",
  "official-links.html",
  "collaborators.html",
  "launch-hunt.html",
  "privacy.html",
  "meme-contest.html",
  "404.html",
  "styles.css",
  "launch-coin.css",
  "script.js",
  "launch-state.js",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "favicon.png",
  "favicon-spin.js",
  "madger_coin_spin_sprite.png",
  "madger_coin_spin_favicon.gif",
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
  "media/madger-prelaunch-tomorrow-cpmm-v2.png"
];

export const distAllowlist = [
  ...rootFiles,
  ...assetFiles.map(file => `assets/${file}`)
].sort();
