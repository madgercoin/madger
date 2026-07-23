import { cp, mkdir, rm } from "node:fs/promises";

const pages = [
  "index.html",
  "litepaper.html",
  "404.html",
  "styles.css",
  "script.js",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "_headers"
];

const assets = [
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

await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
await Promise.all(pages.map(file => cp(file, `dist/${file}`)));
await Promise.all(assets.map(file => cp(file, `dist/assets/${file}`)));
console.log(`Built MADGER static site with ${pages.length + assets.length} files.`);
