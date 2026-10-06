import test from "node:test";
import assert from "node:assert/strict";
import { calculateCirculatingSupply, supplyResponse } from "../supply-endpoint.mjs";

const tokenAccounts = [
  ["A8ipo29QM3BUqDaBzYHQBevP2DeHD9EDqHfStm6Tyh1t", "5LVpo5QrNJPuasud75CuF3gRtipFStkR2seyWMgg5E8V", "499999999999968"],
  ["55FduFuEmEGmrAut4e2VqbRFHjKdhbKMN5zixkKzLAKd", "hXgWwvwmaYkCyehaea1AzcbD156LmR2mQtYU18eTvrL", "160000000000000"],
  ["CikoF6N2s5k32rRNrWCdwfonnvTQaH7xgJRPX1GiJH9m", "6DoXr5WALTXN3wLPvnxQEP8LZtNiViuTxUcedXsSttMT", "70000000000000"],
  ["GzgvnZ8KSVnkPdU6ovLtAjjAW9K7xDa78ikf914DUsyx", "3aW5JEwSLrSLkSRjmKQ2dSQnowwNmSALX1vr6g4RKdPQ", "25000000000000"],
  ["DcX6yJGexVwwvq24etRek4znWtV24Ce1gCZQX96BFwbA", "82wZ6Cmw76HbRqJqSJ1cSXVhhBXNtWSpdH4XR669j341", "20000000000000"]
];
const mint = "BHauMX8akk2umqkQqnJwpYkCRkZmefGnEBFByeFXRKqv";
function rpcMock({ alterAccount, supply = "999999994992711", fail = false } = {}) {
  const calls = [];
  const fetcher = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    if (fail) return new Response("failure", { status: 429 });
    const result = body.method === "getMultipleAccounts" ? {
      context: { slot: 100 },
      value: tokenAccounts.map(([address, owner, amount], i) => ({
        owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        data: { parsed: { type: "account", info: {
          mint, owner: i === alterAccount ? "wrong-owner" : owner,
          tokenAmount: { amount, decimals: 6 }
        } } }
      }))
    } : { context: { slot: 100 }, value: { amount: supply, decimals: 6 } };
    return new Response(JSON.stringify({ result }), { status: 200 });
  };
  return { fetcher, calls };
}

test("returns Jupiter's numeric format from verified finalized token accounts", async () => {
  const { fetcher, calls } = rpcMock();
  const response = await supplyResponse({ fetcher, now: Date.parse("2026-10-06") });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { circulatingSupply: 224999994.992743 });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(calls.map(call => call.method), [
    "getTokenSupply", "getMultipleAccounts", "getTokenSupply"
  ]);
  assert.deepEqual(calls[1].params[0], tokenAccounts.map(([address]) => address));
  assert.equal(calls[1].params[1].minContextSlot, 100);
});

test("rejects a changed escrow owner instead of claiming it is locked", async () => {
  const response = await supplyResponse({ ...rpcMock({ alterAccount: 2 }), now: Date.parse("2026-10-06") });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Supply temporarily unavailable" });
});

test("does not serve stale data after an RPC failure or first vesting cliff", async () => {
  assert.equal((await supplyResponse({ ...rpcMock({ fail: true }), now: Date.parse("2026-10-06") })).status, 503);
  await assert.rejects(() => calculateCirculatingSupply({
    ...rpcMock(), now: Date.parse("2027-03-12T08:30:00Z")
  }), /Vesting schedule/);
});
