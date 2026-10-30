// Read Apple's public configuration metadata without evaluating page scripts.
export const PART_PATTERN = /^[A-Z0-9]{5,12}\/[A-Z0-9]{1,3}$/;
const clean = (value) =>
  String(value ?? "")
    .split(/<div|<p|<br/i)[0]
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
export function embeddedJSON(html, key) {
  const match = new RegExp("\\b" + key + "\\s*:").exec(html);
  if (!match) return null;
  const start = match.index + match[0].length;
  let first = start;
  while (/\s/.test(html[first] || "") && first < html.length) first++;
  if (!["{", "["].includes(html[first])) return null;
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = first; i < html.length; i++) {
    const ch = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === "{" || ch === "[") depth++;
    if (ch === "}" || ch === "]") {
      depth--;
      if (!depth) {
        try {
          return JSON.parse(html.slice(first, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
export function appleShopURL(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.apple.com" ||
    url.username ||
    url.password ||
    url.port ||
    !/^\/shop\/(?:buy-[a-z-]+|product|select)\//.test(url.pathname)
  )
    throw new Error(
      "Paste a US Apple Store product link starting with https://www.apple.com/shop/.",
    );
  url.search = "";
  url.hash = "";
  return url;
}
export function categoryFor(url) {
  if (url.includes("/buy-iphone/")) return "iPhone";
  if (url.includes("/buy-ipad/")) return "iPad";
  if (url.includes("/buy-watch/")) return "Apple Watch";
  if (url.includes("/buy-mac/studio-display")) return "Displays";
  if (url.includes("/buy-mac/")) return "Mac";
  if (url.includes("/buy-airpods/")) return "AirPods";
  if (
    /\/buy-beats\/|\/shop\/product\/[^/]+\/[^/]+\/(?:beats|powerbeats)/.test(
      url,
    )
  )
    return "Beats";
  if (url.includes("/buy-vision/")) return "Apple Vision Pro";
  if (/\/buy-(home|homepod|tv)\//.test(url)) return "Home & TV";
  if (url.includes("/buy-airtag/")) return "AirTag";
  return "Accessories";
}
export function parseAppleProduct(html, source) {
  const url = appleShopURL(source).href;
  const selection = embeddedJSON(html, "productSelectionData");
  const schema = [];
  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const data = JSON.parse(match[1]);
      schema.push(...(Array.isArray(data) ? data : [data]));
    } catch {}
  }
  const productSchema = schema.find((x) => x["@type"] === "Product");
  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])
    .replace(/^(?:Buy|Shop)\s+/i, "")
    .replace(/\s*- Apple$/i, "");
  const name = (
    (categoryFor(url) === "Accessories" || categoryFor(url) === "Beats"
      ? clean(productSchema?.name)
      : "") ||
    title ||
    clean(productSchema?.name) ||
    "Apple product"
  ).slice(0, 140);
  const display = {
    ...selection?.displayValues,
    ...selection?.mainDisplayValues,
    ...selection?.configDisplayValues,
  };
  const variants = [];
  const seen = new Set();
  const add = (part, label, link = url, note = "") => {
    part = String(part || "").toUpperCase();
    if (!PART_PATTERN.test(part) || seen.has(part)) return;
    seen.add(part);
    variants.push({
      id: part,
      part,
      label: (label || "Standard configuration").slice(0, 220) + " · " + part,
      url: link,
      note,
    });
  };
  for (const item of selection?.products || []) {
    const part = item.partNumber || item.btrOrFdPartNumber || item.part;
    if (!PART_PATTERN.test(String(part || ""))) continue;
    const dimensions =
      item.dimensions ||
      Object.fromEntries(
        Object.entries(item).filter(
          ([key]) => /dimension/i.test(key) && key !== "dimensionSteporder",
        ),
      );
    const labels = Object.entries(dimensions)
      .filter(([, value]) => typeof value === "string")
      .map(
        ([key, value]) =>
          clean(display[key]?.[value]?.value) ||
          (!display[key]?.[value]?.header?.includes("badge") &&
            clean(display[key]?.[value]?.header)) ||
          value
            .replace(/_/g, " ")
            .replace(
              /(\d)(gb|tb|inch|mm)\b/gi,
              (_, n, u) =>
                n + (u.toLowerCase() === "inch" ? "‑inch" : u.toUpperCase()),
            ),
      );
    const watchCase = url.includes("/buy-watch/");
    add(
      part,
      [...new Set(labels)].join(" · "),
      item.seoUrlToken ? url.replace(/\/$/, "") + "/" + item.seoUrlToken : url,
      watchCase
        ? "Watch case stock; choose a compatible band and fit at Apple."
        : url.includes("/buy-iphone/")
          ? "Hardware stock only. Choose your carrier and confirm eligibility at Apple."
          : item.type
            ? "Standard retail configuration. Confirm memory, storage, and keyboard at Apple."
            : "",
    );
  }
  if (!variants.length && productSchema) {
    const offers = Array.isArray(productSchema.offers)
      ? productSchema.offers
      : [productSchema.offers];
    for (const offer of offers.filter(Boolean))
      add(offer.sku, clean(productSchema.name) || name);
  }
  // Accessory URLs themselves contain the exact selected SKU. Never scrape recommendation SKUs.
  const pathPart = new URL(url).pathname.match(
    /^\/shop\/product\/([a-z0-9]+)\/([a-z0-9]+)(?:\/|$)/i,
  );
  if (pathPart) add(pathPart[1] + "/" + pathPart[2], name, url);
  if (!variants.length)
    throw new Error(
      "Apple does not expose a pickup part number on this page. Choose a specific retail configuration at Apple, then paste its product link.",
    );
  return {
    id: new URL(url).pathname.replace(/^\/shop\//, "").replace(/\/$/, ""),
    name,
    category: categoryFor(url),
    url,
    variants,
    verifiedAt: new Date().toISOString().slice(0, 10),
  };
}
export async function fetchAppleProduct(value) {
  let url = appleShopURL(value);
  for (let redirects = 0; redirects < 4; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(20000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      url = appleShopURL(new URL(response.headers.get("location"), url).href);
      continue;
    }
    if (!response.ok)
      throw new Error(
        "Apple could not load that product right now. Try again later.",
      );
    const reader = response.body.getReader();
    let size = 0,
      chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 5_000_000) {
        await reader.cancel();
        throw new Error("Apple product page is too large to read.");
      }
      chunks.push(value);
    }
    return parseAppleProduct(Buffer.concat(chunks).toString("utf8"), url.href);
  }
  throw new Error("Apple redirected this link too many times.");
}
