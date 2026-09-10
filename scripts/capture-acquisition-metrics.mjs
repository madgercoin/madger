import fs from 'node:fs/promises';

const MINT = 'BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv';
const POOL = 'FVRpAmyDsdvKHQT2ds6ytZsJHt7SDDDbScQx3c4fu32h';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DEX_URL = `https://api.dexscreener.com/token-pairs/v1/solana/${MINT}`;

const request = await readJsonIfPresent('acquisition/request.json');
const label = cleanLabel(process.env.SNAPSHOT_LABEL || request?.snapshotLabel || 'scheduled');
const generatedAt = new Date().toISOString();

const [marketResult, holderResult] = await Promise.allSettled([
  fetchMarket(),
  fetchHolders(),
]);

if (marketResult.status !== 'fulfilled') throw marketResult.reason;
const market = marketResult.value;
const holders = holderResult.status === 'fulfilled'
  ? holderResult.value
  : { status: 'unavailable', error: holderResult.reason?.message || String(holderResult.reason) };

const report = {
  generatedAt,
  snapshotLabel: label,
  network: 'solana',
  mint: MINT,
  pool: POOL,
  market,
  holders,
  interpretation: {
    holderCount: holders.status === 'ok' ? 'Unique SPL token-account owners with a positive raw token balance at finalized commitment.' : 'Holder count unavailable for this run; market metrics remain usable.',
    attribution: 'Campaign attribution is aggregate. It does not identify a purchaser or prove that an individual click caused an on-chain purchase.'
  }
};

await fs.mkdir('reports/acquisition/history', { recursive: true });
await fs.writeFile('reports/acquisition/latest.json', JSON.stringify(report, null, 2) + '\n');
await fs.writeFile('reports/acquisition/latest.md', markdown(report));

const safeTime = generatedAt.replace(/[:.]/g, '-');
await fs.writeFile(`reports/acquisition/history/${safeTime}-${label}.json`, JSON.stringify(report, null, 2) + '\n');

console.log(JSON.stringify(report, null, 2));

async function fetchMarket() {
  const response = await fetch(DEX_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`DEX Screener HTTP ${response.status}`);
  const pairs = await response.json();
  if (!Array.isArray(pairs)) throw new Error('DEX Screener response was not an array.');
  const pair = pairs.find(item => item.pairAddress === POOL);
  if (!pair) throw new Error(`Verified pool ${POOL} was not returned for mint ${MINT}.`);
  if (pair.baseToken?.address !== MINT && pair.quoteToken?.address !== MINT) throw new Error('Verified pool response did not contain the MADGER mint.');
  return {
    source: 'DEX Screener API',
    pairUrl: pair.url,
    dexId: pair.dexId,
    pairAddress: pair.pairAddress,
    baseToken: pair.baseToken,
    quoteToken: pair.quoteToken,
    priceUsd: numberOrNull(pair.priceUsd),
    priceNative: numberOrNull(pair.priceNative),
    liquidityUsd: numberOrNull(pair.liquidity?.usd),
    liquidityBase: numberOrNull(pair.liquidity?.base),
    liquidityQuote: numberOrNull(pair.liquidity?.quote),
    fdv: numberOrNull(pair.fdv),
    marketCap: numberOrNull(pair.marketCap),
    volume24h: numberOrNull(pair.volume?.h24),
    buys24h: numberOrNull(pair.txns?.h24?.buys),
    sells24h: numberOrNull(pair.txns?.h24?.sells),
    pairCreatedAt: pair.pairCreatedAt || null,
    websites: pair.info?.websites || [],
    socials: pair.info?.socials || []
  };
}

async function fetchHolders() {
  const params = [TOKEN_PROGRAM, {
    commitment: 'finalized',
    encoding: 'jsonParsed',
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: MINT } }
    ]
  }];
  const result = await rpc('getProgramAccounts', params);
  const owners = new Set();
  let positiveTokenAccounts = 0;
  for (const account of result) {
    const info = account.account?.data?.parsed?.info;
    const amount = info?.tokenAmount?.amount;
    const owner = info?.owner;
    if (!owner || !amount || amount === '0') continue;
    positiveTokenAccounts += 1;
    owners.add(owner);
  }
  return {
    status: 'ok',
    source: 'Solana finalized RPC',
    uniqueOwnersWithPositiveBalance: owners.size,
    positiveTokenAccounts,
  };
}

async function rpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) throw new Error(`${method}: ${JSON.stringify(body.error || body)}`);
  return body.result;
}

function markdown(report) {
  const h = report.holders;
  const m = report.market;
  return [
    '# MADGER acquisition snapshot',
    '',
    `Generated: ${report.generatedAt}`,
    `Label: \`${report.snapshotLabel}\``,
    `Mint: \`${report.mint}\``,
    `Verified pool: \`${report.pool}\``,
    '',
    '| Metric | Value |',
    '|---|---:|',
    `| Price (USD) | ${fmt(m.priceUsd, 8)} |`,
    `| Liquidity (USD) | ${money(m.liquidityUsd)} |`,
    `| Market cap | ${money(m.marketCap)} |`,
    `| FDV | ${money(m.fdv)} |`,
    `| 24h volume | ${money(m.volume24h)} |`,
    `| 24h buys | ${fmt(m.buys24h)} |`,
    `| 24h sells | ${fmt(m.sells24h)} |`,
    `| Unique positive-balance owners | ${h.status === 'ok' ? h.uniqueOwnersWithPositiveBalance : 'unavailable'} |`,
    `| Positive token accounts | ${h.status === 'ok' ? h.positiveTokenAccounts : 'unavailable'} |`,
    '',
    `Market source: ${m.source}.`,
    h.status === 'ok' ? `Holder source: ${h.source}.` : `Holder RPC error: ${h.error}.`,
    '',
    'Attribution note: aggregate campaign clicks and holder/market changes can be compared across time windows, but they do not prove that any particular click caused a purchase.',
    ''
  ].join('\n');
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value) {
  return value == null ? 'n/a' : `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function fmt(value, digits = 0) {
  return value == null ? 'n/a' : Number(value).toLocaleString('en-US', { maximumFractionDigits: digits });
}

function cleanLabel(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'scheduled';
}

async function readJsonIfPresent(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
