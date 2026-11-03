import assert from "node:assert/strict";
import inventory from "../lib/inventory.js";
import { telegramMonitor } from "../server/telegram-monitor.js";
process.env.MONITOR_SECRET = "monitor-test-secret-longer-than-32-characters";
process.env.TELEGRAM_BOT_TOKEN = "123456:mock-only-not-real";
process.env.TELEGRAM_CHAT_ID = "12345";
process.env.KV_REST_API_URL = "https://redis.example.test";
process.env.KV_REST_API_TOKEN = "mock-only";
const db = new Map();
let sent = 0,
  deliveryFails = false,
  status = "available",
  time = Date.now();
const req = (token = process.env.MONITOR_SECRET) =>
  new Request("https://example.test/api/telegram-monitor", {
    method: "POST",
    headers: { authorization: "Bearer " + token },
  });
inventory.fetch = async (request) => {
  assert.equal(new URL(request.url).searchParams.get("part"), "MK1F4LL/A");
  assert.equal(new URL(request.url).searchParams.get("zip"), "75225");
  return Response.json({
    queriedZip: "75205",
    checkedAt: ++time,
    nextCheckAt: Date.now() + 120000,
    stores: [
      {
        id: "R144",
        name: "NorthPark Center",
        availability: { "MK1F4LL/A": { status, message: "Available Today" } },
      },
      {
        id: "R042",
        name: "Knox Street",
        availability: { "MK1F4LL/A": { status: "unknown" } },
      },
      {
        id: "R225",
        name: "Not in Dallas",
        availability: { "MK1F4LL/A": { status: "available" } },
      },
    ],
  });
};
globalThis.fetch = async (url, options) => {
  if (url === "https://redis.example.test") {
    const [op, key, value, ...rest] = JSON.parse(options.body);
    let result;
    if (op === "SET") {
      if (rest.includes("NX") && db.has(key)) result = null;
      else {
        db.set(key, value);
        result = "OK";
      }
    } else if (op === "GET") result = db.get(key) || null;
    else if (op === "EVAL") {
      db.delete("pickup:telegram:personal:v1:lock");
      result = 1;
    } else throw new Error("Unexpected Redis command");
    return Response.json({ result });
  }
  assert(String(url).startsWith("https://api.telegram.org/bot"));
  const payload = JSON.parse(options.body);
  assert.equal(payload.chat_id, "12345");
  assert(payload.text.includes("NorthPark Center"));
  assert(!payload.text.includes("Not in Dallas"));
  assert(!payload.text.includes("Knox Street —"));
  if (deliveryFails) return Response.json({ ok: false }, { status: 500 });
  sent++;
  return Response.json({ ok: true, result: { message_id: sent } });
};
assert.equal((await telegramMonitor(req("wrong"))).status, 401);
assert.equal(sent, 0);
assert.equal((await telegramMonitor(req())).status, 200);
assert.equal(sent, 1);
await telegramMonitor(req());
assert.equal(sent, 1);
status = "unknown";
await telegramMonitor(req());
status = "available";
await telegramMonitor(req());
assert.equal(sent, 1);
status = "unavailable";
await telegramMonitor(req());
status = "available";
deliveryFails = true;
assert.equal((await telegramMonitor(req())).status, 502);
assert.equal(sent, 1);
deliveryFails = false;
await telegramMonitor(req());
assert.equal(sent, 2);
db.set("pickup:telegram:personal:v1:lock", "other-run");
const locked = await (await telegramMonitor(req())).json();
assert.equal(locked.reason, "already-running");
assert.equal(db.get("pickup:telegram:personal:v1:lock"), "other-run");
console.log(
  "Passed Telegram monitor tests: authentication, Dallas-only alerts, duplicate suppression, restocks, delivery retry, and concurrent-run lock. All Telegram requests mocked.",
);
