const baseUrl = (process.env.SITE_URL ?? "https://madgercoin.com").replace(/\/$/, "");
const officialMint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const checks = [
  ["/", 200],
  ["/launch.html", 200],
  ["/litepaper.html", 200],
  ["/collaborators", 200],
  ["/privacy", 200],
  ["/__deployment-check-missing-page__", 404],
  ["/styles.css", 200],
  ["/script.js", 200],
  ["/manifest.webmanifest", 200],
  ["/robots.txt", 200],
  ["/sitemap.xml", 200],
  ["/assets/madger_v5_hero.webp", 200],
  ["/assets/madger_official_logo_transparent_192.png", 200],
  ["/assets/madger_official_logo_transparent_512.png", 200],
  ["/assets/madger_v6_community_welcome.webp", 200]
];
const redirects = [
  ["/index.html", "/"],
  ["/launch", "/launch.html"],
  ["/launch/", "/launch.html"],
  ["/litepaper", "/litepaper.html"],
  ["/litepaper/", "/litepaper.html"],
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
    [body.includes('rel="preload" as="image" href="/assets/madger_v5_hero.webp"'), "hero image preload"],
    [body.includes('"@type": "Organization"'), "Organization structured data"],
    [body.includes('name="robots" content="index,follow'), "homepage index directive"]
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
    [launch.body.includes("Monday, August 31, 2026 at 14:00 UTC"), "current public launch target"],
    [launch.body.includes("Public trading is not live yet"), "pre-live safety warning"],
    [launch.body.includes("600,000,000 MADGER") && launch.body.includes("Final amounts pending authorization"), "liquidity target and funding boundary"],
    [launch.body.includes("Permanent Burn &amp; Earn planned"), "working LP-protection plan"],
    [!/(raydium\.io\/(swap|liquidity)|jup\.ag|birdeye\.so|dexscreener\.com)\//i.test(launch.body), "no pre-launch trading destination"]
  ];
  for (const [passed, label] of contentChecks) {
    console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
    if (!passed) failures.push(`launch: ${label}`);
  }
}

const missing = responses.get("/__deployment-check-missing-page__");
if (missing && !missing.response.headers.get("x-robots-tag")?.includes("noindex")) {
  failures.push("404 response: missing X-Robots-Tag noindex");
}

if (failures.length) {
  console.error(`\nDeployment validation failed:\n${failures.map(failure => `- ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`\nDeployment validation passed for ${baseUrl}.`);
