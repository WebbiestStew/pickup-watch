import fs from "node:fs";
import crypto from "node:crypto";
const read = (name) =>
  fs.readFileSync(new URL("../src/" + name, import.meta.url), "utf8");
const products = JSON.parse(read("products.json")),
  stores = JSON.parse(read("stores.json"));
const data =
  "const PRODUCTS=" +
  JSON.stringify(
    products.map(({ variants, ...product }) => ({
      ...product,
      configurations: variants.length,
    })),
  ) +
  ";const STORES=" +
  JSON.stringify(stores) +
  ";\n";
const css = read("style.css"),
  client = data + read("client.js");
const hash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
const styleUrl = "/assets/app." + hash(css) + ".css",
  scriptUrl = "/assets/app." + hash(client) + ".js";
const publicDir = new URL("../public/", import.meta.url);
fs.mkdirSync(new URL("../lib/", import.meta.url), { recursive: true });
fs.mkdirSync(new URL("assets/", publicDir), { recursive: true });
for (const name of fs.readdirSync(new URL("assets/", publicDir)))
  if (/^app\.[a-f0-9]+\.(css|js)$/.test(name))
    fs.unlinkSync(new URL("assets/" + name, publicDir));
const base =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_URL
      ? "https://" + process.env.VERCEL_URL
      : "http://localhost:8767");
const page = read("page.html")
  .replaceAll("__SITE_ORIGIN__", new URL(base).origin)
  .replace("__STYLE_URL__", styleUrl)
  .replace("__SCRIPT_URL__", scriptUrl);
fs.writeFileSync(new URL("index.html", publicDir), page);
fs.writeFileSync(new URL(styleUrl.slice(1), publicDir), css);
fs.writeFileSync(new URL(scriptUrl.slice(1), publicDir), client);
fs.writeFileSync(
  new URL("../lib/inventory.js", import.meta.url),
  "const STORES=" +
    JSON.stringify(stores) +
    ';\nconst DEFAULT_PART="MK1H4LL/A";\nconst PAGE="";\n' +
    read("api.js"),
);
console.log(
  "Built " +
    Buffer.byteLength(page) +
    "-byte HTML shell with fingerprinted CSS and JavaScript.",
);
