import { fetchAppleProduct, appleShopURL } from "../server/apple-products.js";
const cache = new Map(),
  attempts = new Map();
export default {
  async fetch(request) {
    if (request.method !== "GET")
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    let url;
    try {
      url = appleShopURL(
        new URL(request.url).searchParams.get("url") || "",
      ).href;
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const saved = cache.get(url);
    if (saved?.until > Date.now())
      return Response.json({ product: saved.product });
    const identity = (request.headers.get("x-forwarded-for") || "local").split(
        ",",
      )[0],
      now = Date.now();
    const last = attempts.get(identity);
    const attempt = last?.until > now ? last : { count: 0, until: now + 60000 };
    attempt.count++;
    attempts.set(identity, attempt);
    if (attempts.size > 1000) attempts.delete(attempts.keys().next().value);
    if (attempt.count > 6)
      return Response.json(
        { error: "Please wait a minute before loading more product links." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    try {
      const product = await fetchAppleProduct(url);
      if (cache.size > 100) cache.delete(cache.keys().next().value);
      cache.set(url, { product, until: now + 86400000 });
      return Response.json(
        { product },
        { headers: { "cache-control": "private, max-age=3600" } },
      );
    } catch (error) {
      return Response.json({ error: error.message }, { status: 422 });
    }
  },
};
