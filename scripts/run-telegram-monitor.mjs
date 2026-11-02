const secret = process.env.PICKUP_MONITOR_SECRET;
if (!secret) throw new Error("Set PICKUP_MONITOR_SECRET");
const r = await fetch("https://pickup-watch.vercel.app/api/telegram-monitor", {
  method: "POST",
  headers: { authorization: "Bearer " + secret },
  signal: AbortSignal.timeout(55000),
});
console.log(await r.text());
if (!r.ok) process.exitCode = 1;
