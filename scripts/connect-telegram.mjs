import fs from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
const path = new URL("../.env.telegram.local", import.meta.url);
const env = parseEnv(fs.readFileSync(path, "utf8"));
if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_BOT_TOKEN || "")) {
  console.error(
    "Save your BotFather token as TELEGRAM_BOT_TOKEN in .env.telegram.local first.",
  );
  process.exit(1);
}
async function api(method, body = {}) {
  const r = await fetch(
    "https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/" + method,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    },
  );
  const d = await r.json();
  if (!r.ok || !d.ok)
    throw new Error("Telegram request failed. Verify the bot token.");
  return d.result;
}
try {
  const me = await api("getMe");
  if (!env.TELEGRAM_LINK_CODE) {
    env.TELEGRAM_LINK_CODE = randomBytes(24).toString("hex");
    fs.appendFileSync(
      path,
      "\nTELEGRAM_LINK_CODE=" + env.TELEGRAM_LINK_CODE + "\n",
      { mode: 0o600 },
    );
  }
  const updates = await api("getUpdates", {
    allowed_updates: ["message"],
    limit: 100,
    timeout: 0,
  });
  const match = updates
    .map((update) => update.message)
    .find(
      (message) =>
        message?.chat?.type === "private" &&
        message.text === "/start " + env.TELEGRAM_LINK_CODE,
    );
  if (!match) {
    console.log(
      "Open this link in Telegram and tap Start, then run this script again:",
    );
    console.log(
      "https://t.me/" + me.username + "?start=" + env.TELEGRAM_LINK_CODE,
    );
    process.exit(0);
  }
  if (!env.TELEGRAM_CHAT_ID) {
    fs.appendFileSync(path, "\nTELEGRAM_CHAT_ID=" + match.chat.id + "\n", {
      mode: 0o600,
    });
  }
  console.log(
    "Your private Telegram chat is linked. Credentials remain in .env.telegram.local.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
