import fs from 'node:fs/promises';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const MINT = 'BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv';
const EXPECTED = {
  amount: '1000000000000000',
  decimals: 6,
  uiAmountString: '1000000000',
  program: 'spl-token',
  owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  mintAuthority: null,
  freezeAuthority: null,
};

async function rpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params }),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`${method}: ${JSON.stringify(body.error || body)}`);
  return body.result;
}

const [supplyResult, accountResult] = await Promise.all([
  rpc('getTokenSupply', [MINT, { commitment: 'finalized' }]),
  rpc('getAccountInfo', [MINT, { encoding: 'jsonParsed', commitment: 'finalized' }]),
]);
const mintInfo = accountResult.value?.data?.parsed?.info;
const actual = {
  amount: supplyResult.value.amount,
  decimals: supplyResult.value.decimals,
  uiAmountString: supplyResult.value.uiAmountString,
  program: accountResult.value?.data?.program,
  owner: accountResult.value?.owner,
  mintAuthority: mintInfo?.mintAuthority ?? null,
  freezeAuthority: mintInfo?.freezeAuthority ?? null,
  initialized: mintInfo?.isInitialized === true,
  accountSpace: accountResult.value?.space,
  supplySlot: supplyResult.context.slot,
  accountSlot: accountResult.context.slot,
};
const checks = {
  supply: actual.amount === EXPECTED.amount,
  decimals: actual.decimals === EXPECTED.decimals,
  program: actual.program === EXPECTED.program,
  owner: actual.owner === EXPECTED.owner,
  mintAuthorityRevoked: actual.mintAuthority === null,
  freezeAuthorityRevoked: actual.freezeAuthority === null,
  initialized: actual.initialized,
};
const healthy = Object.values(checks).every(Boolean);
const generatedAt = new Date().toISOString();
const report = {
  generatedAt,
  commitment: 'finalized',
  mint: MINT,
  healthy,
  checks,
  actual,
  inference: actual.program === 'spl-token' && actual.accountSpace === 82
    ? 'Classic SPL Token mint; Token-2022 transfer-fee extensions do not apply.'
    : 'Program or account layout requires manual transfer-fee review.',
};
await fs.mkdir('reports/token', { recursive: true });
await fs.writeFile('reports/token/latest.json', JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# MADGER on-chain verification',
  '',
  `Generated: ${generatedAt}`,
  `Commitment: finalized`,
  `Mint: \`${MINT}\``,
  '',
  `Overall status: **${healthy ? 'PASS' : 'FAIL'}**`,
  '',
  '| Check | Result | Observed |',
  '|---|---|---|',
  `| Supply | ${checks.supply ? 'PASS' : 'FAIL'} | ${actual.uiAmountString} MADGER |`,
  `| Decimals | ${checks.decimals ? 'PASS' : 'FAIL'} | ${actual.decimals} |`,
  `| Token program | ${checks.program && checks.owner ? 'PASS' : 'FAIL'} | ${actual.owner} |`,
  `| Mint authority revoked | ${checks.mintAuthorityRevoked ? 'PASS' : 'FAIL'} | ${actual.mintAuthority} |`,
  `| Freeze authority revoked | ${checks.freezeAuthorityRevoked ? 'PASS' : 'FAIL'} | ${actual.freezeAuthority} |`,
  '',
  `Inference: ${report.inference}`,
  '',
  `RPC slots: supply ${actual.supplySlot}; account ${actual.accountSlot}.`,
  ''
];
await fs.writeFile('reports/token/latest.md', lines.join('\n'));
console.log(JSON.stringify(report, null, 2));
if (!healthy) process.exitCode = 1;
