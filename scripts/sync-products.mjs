import fs from "node:fs";
import {
  fetchAppleProduct,
  parseAppleProduct,
} from "../server/apple-products.js";
// Official product-family URLs discovered from Apple's US shopping directories.
const source = new URL("../src/product-sources.json", import.meta.url);
const urls = JSON.parse(fs.readFileSync(source, "utf8"));
const catalog = [],
  seen = new Set(),
  failures = [];
for (const entry of urls) {
  try {
    const product = process.env.APPLE_CATALOG_SNAPSHOT
      ? parseAppleProduct(
          fs.readFileSync(
            process.env.APPLE_CATALOG_SNAPSHOT + "/" + entry.snapshot + ".html",
            "utf8",
          ),
          entry.url,
        )
      : await fetchAppleProduct(entry.url);
    if (!seen.has(product.id)) {
      seen.add(product.id);
      catalog.push(product);
    }
  } catch (error) {
    failures.push({ url: entry.url, error: error.message });
  }
}
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
if (catalog.length < 20)
  throw new Error("Catalog is incomplete; existing file preserved.");
fs.writeFileSync(
  new URL("../src/products.json", import.meta.url),
  JSON.stringify(catalog, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    families: catalog.length,
    variants: catalog.reduce((n, p) => n + p.variants.length, 0),
    failures: failures.length,
  }),
);
