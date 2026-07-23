MADGER WEBSITE V2 — DEPLOYMENT INSTRUCTIONS

FASTEST DEPLOYMENT (Cloudflare Workers static assets)
1. Open Cloudflare Dashboard.
2. Go to Workers & Pages.
3. Open the existing MADGER Worker.
4. Choose Edit code / Upload version / Deploy static assets (wording may vary).
5. Upload ALL files and the assets folder from this package. Do not upload the outer folder itself.
6. Deploy.
7. Test the workers.dev URL first.
8. After madgercoin.com shows Active under Cloudflare Domains, test https://madgercoin.com.

IMPORTANT BEFORE PUBLIC LAUNCH
- Create Telegram, then replace “Telegram coming soon” in index.html with the real link.
- Do not add a token contract until deployment is complete and verified.
- When a contract exists, replace “Not launched” and “Building first” in index.html.
- Keep the warning telling users where the authentic contract is published.
- Set up a separate treasury wallet and operations wallet before launch.

FILES
index.html — main website
styles.css — design
script.js — Daily Dig rotation
litepaper.html — public litepaper
assets/ — images and icons

NO BUILD PROCESS REQUIRED
This is a static website. Upload it exactly as provided.
