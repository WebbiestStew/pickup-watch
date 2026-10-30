import assert from "node:assert/strict";
import {
  parseAppleProduct,
  appleShopURL,
  fetchAppleProduct,
} from "../server/apple-products.js";
import productEndpoint from "../api/product.js";
const root = "https://www.apple.com/shop/buy-ipad/ipad-mini";
const metadata = {
  products: [
    {
      partNumber: "ML2T4LL/A",
      dimensionCapacity: "256gb",
      dimensionColor: "starlight",
    },
    { partNumber: "ML2T4LL/A", dimensionCapacity: "256gb" },
  ],
  displayValues: { dimensionColor: { starlight: { header: "Starlight" } } },
};
const parsed = parseAppleProduct(
  "<title>Shop iPad mini - Apple</title><script>var data={productSelectionData:" +
    JSON.stringify(metadata) +
    "};</script>",
  root,
);
assert.equal(parsed.name, "iPad mini");
assert.equal(parsed.variants.length, 1);
assert(parsed.variants[0].label.includes("256GB"));
assert.equal(parsed.category, "iPad");
const accessory = parseAppleProduct(
  '<title>Buy Apple Pencil - Apple</title><script type="application/ld+json">{"@type":"Product","name":"Apple Pencil","offers":{"sku":"MX2D3AM/A"}}</script><p>Recommended: MM123LL/A</p>',
  "https://www.apple.com/shop/product/mx2d3am/a/apple-pencil",
);
assert.equal(accessory.variants.length, 1);
assert.equal(accessory.variants[0].part, "MX2D3AM/A");
assert.throws(() =>
  parseAppleProduct(
    "<title>Product</title><p>Recommendation MM123LL/A</p>",
    root,
  ),
);
for (const url of [
  "http://www.apple.com/shop/product/test/a",
  "https://evil.test/shop/product/test/a",
  "https://www.apple.com.evil.test/shop/product/test/a",
  "https://www.apple.com:444/shop/product/test/a",
  "https://user@www.apple.com/shop/product/test/a",
  "https://www.apple.com/shop/product/../../support",
])
  assert.throws(() => appleShopURL(url));
let calls = 0;
globalThis.fetch = async () => {
  calls++;
  return new Response(null, {
    status: 302,
    headers: { location: "https://evil.test/private" },
  });
};
await assert.rejects(fetchAppleProduct(root));
assert.equal(calls, 1);
const previous = calls;
const rejected = await productEndpoint.fetch(
  new Request(
    "https://example.test/api/product?url=" +
      encodeURIComponent("https://127.0.0.1/private"),
  ),
);
assert.equal(rejected.status, 400);
assert.equal(calls, previous);
console.log(
  "Passed product metadata parsing, exact SKU deduplication, accessory support, URL validation, and redirect safety.",
);
