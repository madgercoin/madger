const baseUrl = (process.env.SITE_URL ?? "https://madgercoin.com").replace(/\/$/, "");
const officialMint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const checks = [["/", 200], ["/litepaper.html", 200], ["/__deployment-check-missing-page__", 404], ["/styles.css", 200], ["/script.js", 200], ["/manifest.webmanifest", 200], ["/robots.txt", 200], ["/sitemap.xml", 200], ["/assets/madger_v5_hero.webp", 200], ["/assets/madger_v5_icon.png", 200]];
const failures = [];
let homepage;

for (const [pathname, expectedStatus] of checks) {
  try {
    const response = await fetch(`${baseUrl}${pathname}`, { redirect: "follow" });
    if (response.status !== expectedStatus) failures.push(`${pathname}: expected ${expectedStatus}, received ${response.status}`);
    if (pathname === "/") homepage = { response, body: await response.text() };
    console.log(`${response.status === expectedStatus ? "PASS" : "FAIL"} ${pathname} (${response.status})`);
  } catch (error) {
    failures.push(`${pathname}: ${error.message}`);
  }
}

if (homepage) {
  const { body, response } = homepage;
  const contentChecks = [[body.includes(officialMint), "exact official mint"], [!/no official token contract/i.test(body), "obsolete no-contract language absent"], [body.includes('href="https://x.com/madgercoin"'), "official X link"], [body.includes('href="https://t.me/madgercoin"'), "official Telegram announcement link"], [body.includes('href="https://t.me/madgerburrow"'), "official Telegram community link"]];
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

if (failures.length) {
  console.error(`\nDeployment validation failed:\n${failures.map(failure => `- ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`\nDeployment validation passed for ${baseUrl}.`);
