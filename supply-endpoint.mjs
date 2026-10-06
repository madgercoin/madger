// Jupiter VRFD's API Endpoint format: { "circulatingSupply": number }.
// Count only the five publicly documented Jupiter Lock token accounts.
export const MINT = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const DECIMALS = 6;
const FIRST_CLIFF = Date.parse("2027-03-12T08:30:00Z");
const ESCROWS = Object.freeze([
  ["A8ipo29QM3BUqDaBzYHQBevP2DeHD9EDqHfStm6Tyh1t", "5LVpo5QrNJPuasud75CuF3gRtipFStkR2seyWMgg5E8V"],
  ["55FduFuEmEGmrAut4e2VqbRFHjKdhbKMN5zixkKzLAKd", "hXgWwvwmaYkCyehaea1AzcbD156LmR2mQtYU18eTvrL"],
  ["CikoF6N2s5k32rRNrWCdwfonnvTQaH7xgJRPX1GiJH9m", "6DoXr5WALTXN3wLPvnxQEP8LZtNiViuTxUcedXsSttMT"],
  ["GzgvnZ8KSVnkPdU6ovLtAjjAW9K7xDa78ikf914DUsyx", "3aW5JEwSLrSLkSRjmKQ2dSQnowwNmSALX1vr6g4RKdPQ"],
  ["DcX6yJGexVwwvq24etRek4znWtV24Ce1gCZQX96BFwbA", "82wZ6Cmw76HbRqJqSJ1cSXVhhBXNtWSpdH4XR669j341"]
]);

function baseUnits(amount) {
  if (typeof amount !== "string" || !/^\d+$/.test(amount)) throw new Error("Invalid token amount");
  return BigInt(amount);
}

async function rpc(fetcher, url, method, params) {
  const response = await fetcher(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("RPC HTTP failure");
  const payload = await response.json();
  if (payload.error || !payload.result) throw new Error("RPC result failure");
  return payload.result;
}

export async function calculateCirculatingSupply({
  fetcher = fetch,
  rpcUrl = "https://api.mainnet-beta.solana.com",
  now = Date.now()
} = {}) {
  // Once vesting starts, an unclaimed token can remain in an escrow while
  // becoming withdrawable. The account balance alone is no longer proof
  // that every token in it is locked. Stop serving until vesting is decoded.
  if (now >= FIRST_CLIFF) throw new Error("Vesting schedule requires renewed verification");

  // Repeat the supply read after the escrow read to detect a concurrent burn.
  // Solana RPC's minContextSlot ensures the account read is no older than
  // the initial mint read, even when RPC requests hit different nodes.
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = await rpc(fetcher, rpcUrl, "getTokenSupply", [MINT, { commitment: "finalized" }]);
    const supply = before.value;
    if (supply?.decimals !== DECIMALS) throw new Error("Unexpected mint decimals");
    const accounts = await rpc(fetcher, rpcUrl, "getMultipleAccounts", [
      ESCROWS.map(([account]) => account),
      { encoding: "jsonParsed", commitment: "finalized", minContextSlot: before.context.slot }
    ]);
    if (!Array.isArray(accounts.value) || accounts.value.length !== ESCROWS.length ||
        accounts.context?.slot < before.context.slot) throw new Error("Incomplete escrow read");

    let locked = 0n;
    for (let i = 0; i < ESCROWS.length; i++) {
      const account = accounts.value[i];
      const info = account?.data?.parsed?.info;
      if (account?.owner !== TOKEN_PROGRAM ||
          account?.data?.parsed?.type !== "account" ||
          info?.mint !== MINT || info?.owner !== ESCROWS[i][1] ||
          info?.tokenAmount?.decimals !== DECIMALS) throw new Error("Escrow identity mismatch");
      locked += baseUnits(info.tokenAmount.amount);
    }
    const after = await rpc(fetcher, rpcUrl, "getTokenSupply", [
      MINT, { commitment: "finalized", minContextSlot: accounts.context.slot }
    ]);
    if (after.value?.decimals !== DECIMALS) throw new Error("Unexpected mint decimals");
    if (before.value.amount !== after.value.amount) continue;
    const total = baseUnits(after.value.amount);
    const circulating = total - locked;
    if (circulating < 0n || circulating > total ||
        circulating > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Invalid circulating supply");
    return Number(circulating) / 1_000_000;
  }
  throw new Error("Supply changed during verification");
}

export async function supplyResponse(options = {}) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "x-content-type-options": "nosniff"
  };
  try {
    const circulatingSupply = await calculateCirculatingSupply(options);
    return new Response(JSON.stringify({ circulatingSupply }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Supply temporarily unavailable" }), {
      status: 503, headers
    });
  }
}
