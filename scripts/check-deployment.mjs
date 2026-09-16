const baseUrl = (process.env.SITE_URL ?? "https://madgercoin.com").replace(/\/$/, "");
const officialMint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const checks = [
  ["/app", 200],
  ["/app.css", 200],
  ["/app.js", 200],
  ["/verified-contributions.json", 200],
  ["/sw.js", 200],
  ["/buy", 200],
  ["/purchase-path.css", 200],
  ["/", 200],
  ["/commons", 200],
  ["/brand-system.css", 200],
  ["/commons.css", 200],
  ["/home-utility.css", 200],
  ["/launch.html", 200],
  ["/transparency.html", 200],
  ["/litepaper.html", 200],
  ["/collaborators", 200],
  ["/privacy", 200],
  ["/__deployment-check-missing-page__", 404],
  ["/styles.css", 200],
  ["/home-v2.css", 200],
  ["/script.js", 200],
  ["/manifest.webmanifest", 200],
  ["/robots.txt", 200],
  ["/sitemap.xml", 200],
  ["/assets/madger_hero_burrow_v7.jpg", 200],
  ["/assets/madger_official_logo_transparent_192.png", 200],
  ["/assets/madger_official_logo_transparent_512.png", 200],
  ["/assets/madger_v6_community_welcome.webp", 200]
];
const redirects = [
  ["/app.html", "/app"],
  ["/app/", "/app"],
  ["/buy.html", "/buy"],
  ["/buy/", "/buy"],
  ["/index.html", "/"],
  ["/launch", "/launch.html"],
  ["/launch/", "/launch.html"],
  ["/litepaper", "/litepaper.html"],
  ["/litepaper/", "/litepaper.html"],
  ["/launch-hunt.html", "/"],
  ["/meme-contest.html", "/"],
  ["/collaborators.html", "/collaborators", 307],
  ["/privacy.html", "/privacy", 307]
];
const failures = [];
const responses = new Map();

for (const [pathname, expectedStatus] of checks) {
  try {
    const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
    const body = response.headers.get("content-type")?.includes("text/html") ? await response.text() : null;
    responses.set(pathname, { response, body });
    if (response.status !== expectedStatus) failures.push(`${pathname}: expected ${expectedStatus}, received ${response.status}`);
    console.log(`${response.status === expectedStatus ? "PASS" : "FAIL"} ${pathname} (${response.status})`);
  } catch (error) {
    failures.push(`${pathname}: ${error.message}`);
  }
}

for (const [pathname, destination, expectedStatus = 301] of redirects) {
  try {
    const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
    const location = response.headers.get("location");
    const expected = new URL(destination, baseUrl).toString();
    const actual = location ? new URL(location, baseUrl).toString() : null;
    const passed = response.status === expectedStatus && actual === expected;
    console.log(`${passed ? "PASS" : "FAIL"} ${pathname} -> ${destination} (${response.status})`);
    if (!passed) failures.push(`${pathname}: expected ${expectedStatus} to ${expected}, received ${response.status} to ${actual}`);
  } catch (error) {
    failures.push(`${pathname}: ${error.message}`);
  }
}

const homepage = responses.get("/");
if (homepage) {
  const { body, response } = homepage;
  const contentChecks = [
    [body.includes(officialMint), "exact official mint"],
    [!/no official token contract/i.test(body), "obsolete no-contract language absent"],
    [body.includes('href="https://x.com/madgercoin"'), "official X link"],
    [body.includes('href="https://t.me/madgercoin"'), "official Telegram announcement link"],
    [body.includes('href="https://t.me/madgerburrow"'), "official Telegram community link"],
    [body.includes('<link rel="canonical" href="https://madgercoin.com/">'), "homepage canonical"],
    [body.includes('"@type":"Organization"'), "Organization structured data"],
    [body.includes('name="robots" content="index,follow'), "homepage index directive"]
    ,[body.includes('class="hero hero-showcase utility-first-hero"') && body.includes("YOUR WAY INTO THE BURROW"), "utility-first hero"]
    ,[body.includes("Beginner Guide") && body.includes("Buy on Raydium"), "separate beginner and experienced purchase paths"]
    ,[body.includes('href="/launch.html">Open launch record'), "post-launch verification record"]
    ,[!/Launch Hunt|Meme Contest|MLH26|ENDS SEP/i.test(body), "expired contest content absent"]
  ];
  for (const [passed, label] of contentChecks) {
    console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
    if (!passed) failures.push(`homepage: ${label}`);
  }
  for (const header of ["content-security-policy", "strict-transport-security", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"]) {
    const passed = Boolean(response.headers.get(header));
    console.log(`${passed ? "PASS" : "FAIL"} header ${header}`);
    if (!passed) failures.push(`homepage: missing ${header} header`);
  }
}

const burrowApp = responses.get("/app");
if (burrowApp) {
  const contentChecks = [
    [burrowApp.body.includes('href="https://madgercoin.com/app"'), "app canonical"],
    [burrowApp.body.includes(officialMint), "app official mint"],
    [burrowApp.body.includes("Checked locally in your browser"), "local verifier privacy boundary"],
    [burrowApp.body.includes("NO WALLET REQUIRED"), "no-wallet access"],
    [burrowApp.body.includes("MADGER NEVER NEEDS YOUR SEED PHRASE"), "wallet-secret warning"],
    [burrowApp.body.includes("madger_official_contest_pose_card.svg"), "approved pose card"],
    [burrowApp.body.includes("THE ENDLESS BURROW"), "progressive field hunt"],
    [burrowApp.body.includes("ROTATING WEEKLY DISPATCH"), "recurring dispatch"],
    [burrowApp.body.includes("TRAIL XP IS NOT"), "unverified progress boundary"],
    [burrowApp.body.includes("THE FOUR-POINT REVIEW"), "published review rubric"],
    [burrowApp.body.includes("requires two independent reviewers"), "advanced review independence"],
    [burrowApp.body.includes("I removed secrets, private messages, and personal data"), "proof safety attestation"],
    [burrowApp.body.includes("I credited sources and have permission"), "proof rights attestation"],
    [burrowApp.body.includes("OFFICIAL TRUST REGISTRY"), "public badge verification"]
  ];
  for (const [passed, label] of contentChecks) {
    console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
    if (!passed) failures.push(`app: ${label}`);
  }
}

const trustRegistry = responses.get("/verified-contributions.json");
if (trustRegistry) {
  const { response } = trustRegistry;
  const contentType = response.headers.get("content-type") ?? "";
  const cacheControl = response.headers.get("cache-control") ?? "";
  const robots = response.headers.get("x-robots-tag") ?? "";
  const registryChecks = [
    [contentType.includes("application/json"), "registry JSON content type"],
    [cacheControl.includes("no-store"), "registry no-store cache boundary"],
    [robots.includes("noindex"), "registry noindex boundary"]
  ];
  for (const [passed, label] of registryChecks) {
    console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
    if (!passed) failures.push(`registry: ${label}`);
  }
}

const commons = responses.get("/commons");
if (commons) {
  const contentChecks = [
    [commons.body.includes("UTILITY THAT") && commons.body.includes("STARTS WITH PEOPLE"), "Commons value proposition"],
    [commons.body.includes("OPEN COMMUNITY MISSIONS"), "open community missions"],
    [commons.body.includes("PUBLIC PROOF LEDGER"), "public proof ledger"],
    [commons.body.includes("No wallet or token purchase is required"), "no-purchase access standard"],
    [commons.body.includes(officialMint), "official mint"]
  ];
  for (const [passed, label] of contentChecks) {
    console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
    if (!passed) failures.push(`commons: ${label}`);
  }
}

const litepaper = responses.get("/litepaper.html");
if (litepaper) {
  const contentChecks = [
    [litepaper.body.includes('<link rel="canonical" href="https://madgercoin.com/litepaper.html">'), "litepaper canonical"],
    [litepaper.body.includes('"@type": "Article"'), "litepaper Article structured data"],
    [litepaper.body.includes('name="twitter:card" content="summary_large_image"'), "litepaper social card"]
  ];
  for (const [passed, label] of contentChecks) {
    console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
    if (!passed) failures.push(`litepaper: ${label}`);
  }
}

const launch = responses.get("/launch.html");
if (launch) {
  const contentChecks = [
    [launch.body.includes('<link rel="canonical" href="https://madgercoin.com/launch.html">'), "launch canonical"],
    [launch.body.includes("TRADING LIVE"), "trading-live status"],
    [launch.body.includes("The SOL–MADGER market is live on Raydium"), "live-market notice"],
    [launch.body.includes("600,000,000 MADGER") && launch.body.includes("99.50% of LP supply escrowed") && launch.body.includes('href="/transparency.html"'), "launch allocation and LP-evidence boundary"],
    [launch.body.includes("0.25%"), "verified Raydium fee tier"],
    [launch.body.includes("https://raydium.io/liquidity-pools/?token=" + officialMint), "verified Raydium market destination"]
  ];
  for (const [passed, label] of contentChecks) {
    console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
    if (!passed) failures.push(`launch: ${label}`);
  }
}

const transparency = responses.get("/transparency.html");
if (transparency) {
  const contentChecks = [
    [transparency.body.includes('<link rel="canonical" href="https://madgercoin.com/transparency.html">'), "transparency canonical"],
    [transparency.body.includes("659,999,999.999968"), "verified locked supply"],
    [transparency.body.includes("339,999,994.992783"), "maximum circulating supply"],
    [transparency.body.includes("99.50% ESCROWED"), "LP escrow evidence"],
    [transparency.body.includes("5LVpo5QrNJPuasud75CuF3gRtipFStkR2seyWMgg5E8V") && transparency.body.includes("hXgWwvwmaYkCyehaea1AzcbD156LmR2mQtYU18eTvrL"), "token-lock addresses"]
  ];
  for (const [passed, label] of contentChecks) {
    console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
    if (!passed) failures.push(`transparency: ${label}`);
  }
}

const missing = responses.get("/__deployment-check-missing-page__");
const purchaseGuide = responses.get("/buy");
if (purchaseGuide) {
  const html = purchaseGuide.body ?? "";
  const expectedSwap = "https://raydium.io/swap/?inputMint=sol&amp;outputMint=" + officialMint;
  if (!html.includes('href="/r/raydium"')) failures.push("buy: fixed Raydium redirect absent");
  if (!html.includes(officialMint)) failures.push("buy: complete mint absent");
  if (!html.includes('href="https://madgercoin.com/buy"')) failures.push("buy: canonical absent");
  if (!html.includes("Do not send SOL to this mint")) failures.push("buy: mint/payment distinction absent");
  if (!html.includes("lose the full amount")) failures.push("buy: risk disclosure absent");
  if (!purchaseGuide.response.headers.get("content-security-policy")) failures.push("buy: CSP absent");
  if (!(homepage?.body ?? "").includes(expectedSwap) || !(homepage?.body ?? "").includes('href="/buy"')) failures.push("homepage: purchase path absent");
}
if (missing && !missing.response.headers.get("x-robots-tag")?.includes("noindex")) {
  failures.push("404 response: missing X-Robots-Tag noindex");
}

if (failures.length) {
  console.error(`\nDeployment validation failed:\n${failures.map(failure => `- ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`\nDeployment validation passed for ${baseUrl}.`);
