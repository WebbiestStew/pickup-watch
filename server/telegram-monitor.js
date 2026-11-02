import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import inventory from "../lib/inventory.js";
import config from "./personal-watch.json" with { type: "json" };
import { stockAlertTransition } from "../src/stock-alerts.js";
const stateKey = "pickup:telegram:personal:v1",
  lockKey = stateKey + ":lock";
const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
function authorized(request) {
  const secret = process.env.MONITOR_SECRET;
  if (!secret || secret.length < 32) return false;
  const actual = request.headers.get("authorization") || "";
  return timingSafeEqual(
    createHash("sha256").update(actual).digest(),
    createHash("sha256")
      .update("Bearer " + secret)
      .digest(),
  );
}
async function redis(args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token =
      process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Storage is not configured");
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error("Storage unavailable");
  const data = await r.json();
  if (data.error) throw new Error("Storage command failed");
  return data.result;
}
export async function sendTelegram(text) {
  const r = await fetch(
    "https://api.telegram.org/bot" +
      process.env.TELEGRAM_BOT_TOKEN +
      "/sendMessage",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(12000),
    },
  );
  const result = await r.json();
  if (!r.ok || !result.ok) throw new Error("Telegram delivery failed");
}
export async function telegramMonitor(request) {
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID)
    return json({ error: "Telegram setup is incomplete" }, 503);
  const lock = randomUUID();
  let acquired = false;
  try {
    acquired = (await redis(["SET", lockKey, lock, "NX", "EX", 90])) === "OK";
    if (!acquired)
      return json({ ok: true, checked: false, reason: "already-running" });
    const old = JSON.parse((await redis(["GET", stateKey])) || "null");
    const response = await inventory.fetch(
      new Request(
        "https://pickup-watch.vercel.app/api/availability?zip=" +
          config.zip +
          "&part=" +
          encodeURIComponent(config.part),
      ),
      {},
      {},
    );
    const data = await response.json();
    if (!response.ok)
      return json({
        ok: true,
        checked: false,
        reason: "upstream-cooldown",
        retryAt: data.retryAt || null,
      });
    const stores = data.stores.filter((store) =>
      config.storeIds.includes(store.id),
    );
    const transition = stockAlertTransition(
      {
        part: config.part,
        zip: config.zip,
        available: old?.available || [],
        checkedAt: old?.checkedAt || 0,
      },
      { ...data, queriedZip: config.zip, stores },
    );
    if (transition.stores.length) {
      const checked = new Date(data.checkedAt).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        dateStyle: "medium",
        timeStyle: "short",
      });
      await sendTelegram(
        config.name +
          " is available for pickup!\n\n" +
          transition.stores
            .map(
              (store) =>
                "• " +
                store.name +
                " — " +
                (store.availability[config.part].message || "Available"),
            )
            .join("\n") +
          "\n\nChecked " +
          checked +
          " (San Antonio time).\n" +
          config.url +
          "\n\nStock can change; confirm availability and carrier eligibility at Apple.",
      );
    }
    await redis([
      "SET",
      stateKey,
      JSON.stringify({ ...transition.watch, lastRunAt: Date.now() }),
      "EX",
      365 * 86400,
    ]);
    return json({
      ok: true,
      checked: true,
      matchedStores: stores.length,
      alertsSent: transition.stores.length ? 1 : 0,
    });
  } catch {
    return json(
      {
        error:
          "Monitor failed; next scheduled run will retry. No successful alert was recorded.",
      },
      502,
    );
  } finally {
    if (acquired)
      try {
        await redis([
          "EVAL",
          "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",
          1,
          lockKey,
          lock,
        ]);
      } catch {}
  }
}
