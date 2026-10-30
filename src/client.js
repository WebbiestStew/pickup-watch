const $ = (id) => document.getElementById(id);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const preferencesKey = "pickup-watch-products-v4";
let preferences = {};
try {
  preferences = JSON.parse(localStorage.getItem(preferencesKey) || "{}");
} catch {}
const shared = new URLSearchParams(location.search);
const productCache = new Map();
let activeProduct = null,
  model = {
    part: "",
    id: "",
    label: "Choose a product",
    url: "https://www.apple.com/shop",
  },
  loadingProduct = false,
  selectionVersion = 0;
let observations = new Map(),
  areaCache = new Map();
try {
  const saved = JSON.parse(
    sessionStorage.getItem("pickup-watch-products-results-v4") || "{}",
  );
  observations = new Map(
    (saved.observations || []).filter(
      ([, value]) => value.expires > Date.now(),
    ),
  );
  areaCache = new Map(
    (saved.areas || []).filter(([, value]) => value.nextCheckAt > Date.now()),
  );
} catch {}
let nextCheck = 0,
  cycleStart = Date.now(),
  cooldown = false,
  busy = false,
  lastZip = "",
  lastDisplay = "",
  limit = 12,
  renderKey = "",
  lastMode = "";
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const initialZip = shared.get("zip") || preferences.zip || "";
if (/^\d{5}$/.test(initialZip)) $("zip").value = initialZip;
function productUrl() {
  return model.url;
}
function persist() {
  try {
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({
        product: activeProduct?.id,
        part: model.part,
        link: PRODUCTS.find((item) => item.id === activeProduct?.id)
          ?.configurations
          ? undefined
          : activeProduct?.url,
        zip: $("zip").value.trim(),
      }),
    );
  } catch {}
}
function updateModel() {
  $("model-label").textContent = model.label.startsWith(activeProduct.name) ? model.label : activeProduct.name + " · " + model.label;
  $("product").href = productUrl();
  $("selection-feedback").textContent =
    model.note ||
    "Exact retail part number: " +
      model.part +
      ". Selection saved on this device.";
  renderKey = "";
  persist();
  render();
  if (lastZip && !cooldown) {
    nextCheck = Date.now() + 1000;
    cycleStart = Date.now();
  }
}
function setOptions(select, items, value) {
  select.replaceChildren(
    ...items.map((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      return option;
    }),
  );
  if (items.some((item) => item.id === value)) select.value = value;
}
function populateProducts(preferred) {
  const products = PRODUCTS.filter(
    (product) => product.category === $("product-category").value,
  );
  setOptions($("product-family"), products, preferred);
  return loadProduct($("product-family").value);
}
async function loadProduct(id, preferredPart) {
  const version = ++selectionVersion;
  loadingProduct = true;
  $("check-area").disabled = true;
  $("product-variant").disabled = true;
  $("selection-feedback").textContent = "Loading exact configurations…";
  try {
    let product = productCache.get(id);
    if (!product) {
      const response = await fetch(
        "/api/catalog?product=" + encodeURIComponent(id),
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not load configurations.");
      product = data.product;
      productCache.set(id, product);
    }
    if (version !== selectionVersion) return;
    activeProduct = product;
    setOptions(
      $("product-variant"),
      product.variants.map((variant) => ({
        id: variant.part,
        name: variant.label,
      })),
      preferredPart,
    );
    model =
      product.variants.find(
        (variant) => variant.part === $("product-variant").value,
      ) || product.variants[0];
    updateModel();
  } catch (error) {
    if (version === selectionVersion) {
      $("selection-feedback").textContent = error.message;
      model = {
        part: "",
        label: "Choose a product",
        url: "https://www.apple.com/shop",
      };
    }
  } finally {
    if (version === selectionVersion) {
      loadingProduct = false;
      $("product-variant").disabled = !model.part;
      $("check-area").disabled = !model.part || busy;
    }
  }
}
async function importProduct(url) {
  const button = $("load-product");
  button.disabled = true;
  $("import-feedback").textContent = "Reading Apple’s product page…";
  try {
    const response = await fetch(
      "/api/product?url=" + encodeURIComponent(url),
      { signal: AbortSignal.timeout(30000) },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Could not read this product.");
    const product = data.product;
    productCache.set(product.id, product);
    if (!PRODUCTS.some((item) => item.id === product.id))
      PRODUCTS.push(product);
    const categories = [...new Set(PRODUCTS.map((item) => item.category))];
    setOptions(
      $("product-category"),
      categories.map((name) => ({ id: name, name })),
      product.category,
    );
    setOptions(
      $("product-family"),
      PRODUCTS.filter((item) => item.category === product.category),
      product.id,
    );
    await loadProduct(product.id, shared.get("part"));
    $("import-feedback").textContent =
      "Product loaded from Apple. Choose its exact configuration, then check your area.";
  } catch (error) {
    $("import-feedback").textContent =
      error.message || "Apple could not load this link. Try again later.";
  } finally {
    button.disabled = false;
  }
}
$("product-category").addEventListener("change", () => populateProducts());
$("product-family").addEventListener("change", () =>
  loadProduct($("product-family").value),
);
$("product-variant").addEventListener("change", () => {
  model = activeProduct.variants.find(
    (item) => item.part === $("product-variant").value,
  );
  updateModel();
});
$("model-form").addEventListener("submit", (event) => event.preventDefault());
$("import-form").addEventListener("submit", (event) => {
  event.preventDefault();
  importProduct($("apple-url").value.trim());
});
const initialProduct =
  PRODUCTS.find(
    (item) => item.id === (shared.get("product") || preferences.product),
  ) ||
  PRODUCTS.find((item) => item.id === "buy-iphone/iphone-duo") ||
  PRODUCTS[0];
setOptions(
  $("product-category"),
  [...new Set(PRODUCTS.map((item) => item.category))].map((name) => ({
    id: name,
    name,
  })),
  initialProduct.category,
);
setOptions(
  $("product-family"),
  PRODUCTS.filter((item) => item.category === initialProduct.category),
  initialProduct.id,
);
loadProduct(initialProduct.id, shared.get("part") || preferences.part);
const importedLink =
  shared.get("link") ||
  (!PRODUCTS.some((item) => item.id === preferences.product) &&
    preferences.link);
if (importedLink) {
  $("apple-url").value = importedLink;
  importProduct(importedLink);
}
function resultFor(store, now = Date.now()) {
  const observation = observations.get(store.id);
  if (!observation || observation.expires <= now)
    return {
      status: "unknown",
      message: observation
        ? "Previous check expired"
        : "Check this area to see stock",
    };
  return (
    observation.availability[model.part] || {
      status: "unknown",
      message: "No result for this configuration",
    }
  );
}
function render() {
  const now = Date.now(),
    counts = { available: 0, unavailable: 0, unknown: 0 };
  const ranked = STORES.map((store) => ({
    store,
    result: resultFor(store, now),
  }));
  ranked.forEach(({ result }) => counts[result.status]++);
  for (const key in counts) $(key).textContent = counts[key];
  const query = $("store-search").value.trim().toLowerCase();
  const filtered = ranked.filter(
    ({ store, result }) =>
      (!$("filter").value || result.status === $("filter").value) &&
      (!query ||
        (store.name + " " + store.city + " " + store.stateName)
          .toLowerCase()
          .includes(query)),
  );
  filtered.sort(
    (a, b) =>
      ({ available: 0, unavailable: 1, unknown: 2 })[a.result.status] -
        { available: 0, unavailable: 1, unknown: 2 }[b.result.status] ||
      a.store.stateName.localeCompare(b.store.stateName) ||
      a.store.city.localeCompare(b.store.city),
  );
  $("results-count").textContent =
    filtered.length + (filtered.length === 1 ? " store" : " stores");
  $("empty").hidden = filtered.length > 0;
  $("more").hidden = filtered.length <= limit;
  const visible = filtered.slice(0, limit);
  const signature =
    model.part +
    "|" +
    visible
      .map(
        ({ store, result }) =>
          store.id +
          result.status +
          result.message +
          (observations.get(store.id)?.checkedAt || ""),
      )
      .join("|");
  if (signature === renderKey) return;
  renderKey = signature;
  $("stores").innerHTML = visible
    .map(({ store, result }) => {
      const observation = observations.get(store.id);
      const checked = observation?.availability[model.part]
        ? " · checked " +
          new Date(observation.checkedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      return (
        '<article class="store" data-status="' +
        result.status +
        '"><div class="store-top"><span class="city">' +
        escape(store.city + ", " + store.state) +
        '</span><span class="badge ' +
        result.status +
        '">' +
        {
          available: "Available",
          unavailable: "Unavailable",
          unknown: "Unconfirmed",
        }[result.status] +
        "</span></div><h3>" +
        escape(store.name) +
        "</h3><p>" +
        escape(result.message + checked) +
        '</p><button data-zip="' +
        escape(store.zip) +
        '" aria-label="Check availability near ' +
        escape(store.name) +
        '">Check this area ↗</button><div class="links"><a href="' +
        escape(productUrl()) +
        '" target="_blank" rel="noopener">View at Apple ↗</a><a href="' +
        escape(store.url) +
        '" target="_blank" rel="noopener">Store details ↗</a></div></article>'
      );
    })
    .join("");
}
function applyResults(data, zip) {
  for (const store of data.stores)
    observations.set(store.id, {
      availability: store.availability,
      checkedAt: data.checkedAt,
      expires: data.nextCheckAt,
    });
  areaCache.set(model.part + ":" + zip.slice(0, 3), data);
  try {
    sessionStorage.setItem(
      "pickup-watch-products-results-v4",
      JSON.stringify({
        observations: [...observations],
        areas: [...areaCache],
      }),
    );
  } catch {}
  nextCheck = data.nextCheckAt;
  cycleStart = data.checkedAt;
  cooldown = false;
  lastZip = zip;
  $("filter").value = "";
  $("store-search").value = "";
  limit = 12;
  $("feedback").textContent =
    (data.message ? data.message + " " : "") +
    data.stores.length +
    " nearby stores · " +
    (data.cached ? "Cached check" : "Updated") +
    " " +
    new Date(data.checkedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }) +
    ". Refreshes automatically while this tab is open.";
  $("store-heading").textContent = "Stores near " + zip;
  $("status").textContent = "● Watching your area";
  persist();
  render();
}
async function check(zip) {
  if (busy || loadingProduct || !model.part) return;
  const requestedPart = model.part;
  if (!/^(73301|73344|73960|7[5-9]\d{3}|885\d{2})$/.test(zip)) {
    $("feedback").textContent = "Enter a five-digit Texas ZIP code.";
    $("zip").focus();
    return;
  }
  const local = areaCache.get(model.part + ":" + zip.slice(0, 3));
  if (local && local.nextCheckAt > Date.now()) {
    applyResults({ ...local, cached: true }, zip);
    tick();
    return;
  }
  if (cooldown && Date.now() < nextCheck) {
    $("feedback").textContent =
      "The next retry is scheduled. Giving Apple a pause helps avoid blocked checks.";
    return;
  }
  busy = true;
  $("check-area").disabled = true;
  $("check-area").textContent = "Checking…";
  $("feedback").textContent = "Checking nearby Apple Stores…";
  $("status").textContent = "● Checking";
  $("stores").setAttribute("aria-busy", "true");
  tick();
  try {
    const response = await fetch(
      "/api/availability?zip=" +
        encodeURIComponent(zip) +
        "&part=" +
        encodeURIComponent(requestedPart),
      { cache: "no-store", signal: AbortSignal.timeout(45000) },
    );
    const data = await response.json();
    if (requestedPart !== model.part) return;
    if (!response.ok || data.error) {
      nextCheck = data.retryAt || Date.now() + 300000;
      cycleStart = Date.now();
      cooldown = true;
      $("feedback").textContent =
        data.error || "Apple could not confirm stock. A retry is scheduled.";
      $("status").textContent = "● Cooldown";
    } else applyResults(data, zip);
  } catch {
    nextCheck = Date.now() + 300000;
    cycleStart = Date.now();
    cooldown = true;
    $("status").textContent = "● Connection issue";
    $("feedback").textContent =
      "Could not reach the checker. We’ll retry after a short pause. Current stock is unconfirmed.";
  } finally {
    lastZip = zip;
    busy = false;
    $("check-area").disabled = false;
    $("check-area").textContent = "Check availability ↗";
    $("stores").setAttribute("aria-busy", "false");
    persist();
    render();
    tick();
  }
}
$("area-form").addEventListener("submit", (event) => {
  event.preventDefault();
  check($("zip").value.trim());
});
$("filter").addEventListener("change", () => {
  limit = 12;
  render();
});
let searchTimer;
$("store-search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    limit = 12;
    render();
  }, 120);
});
$("stores").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-zip]");
  if (button) {
    $("zip").value = button.dataset.zip;
    check(button.dataset.zip);
  }
});
$("more").addEventListener("click", () => {
  limit += 12;
  render();
});
let toastTimer;
$("share").addEventListener("click", async () => {
  const link = new URL(location.origin + location.pathname);
  link.searchParams.set("product", activeProduct.id);
  link.searchParams.set("part", model.part);
  if (!PRODUCTS.find((item) => item.id === activeProduct.id)?.configurations)
    link.searchParams.set("link", activeProduct.url);
  if (/^\d{5}$/.test($("zip").value.trim()))
    link.searchParams.set("zip", $("zip").value.trim());
  try {
    await navigator.clipboard.writeText(link.toString());
    $("toast").textContent = "Link copied. Send it to your people.";
  } catch {
    $("toast").textContent = "Your share link is in the address bar.";
    history.replaceState(null, "", link);
  }
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("toast").hidden = true;
  }, 3500);
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    event.preventDefault();
    $("store-search").focus();
  }
});
function tick() {
  if (document.hidden) return;
  const seconds = Math.max(0, Math.ceil((nextCheck - Date.now()) / 1000));
  const display = busy
    ? "Checking"
    : nextCheck && seconds
      ? String(Math.floor(seconds / 60)).padStart(2, "0") +
        ":" +
        String(seconds % 60).padStart(2, "0")
      : "Ready";
  if (display !== lastDisplay) {
    const counter = $("countdown");
    if (
      display.includes(":") &&
      lastDisplay.includes(":") &&
      display.length === lastDisplay.length
    ) {
      Array.from(display).forEach((char, index) => {
        const element = counter.children[index];
        if (element && element.textContent !== char) {
          element.textContent = char;
          if (!reducedMotion)
            element.animate(
              [
                { transform: "translateY(7px)", opacity: 0 },
                { transform: "translateY(0)", opacity: 1 },
              ],
              { duration: 260, easing: "ease-out" },
            );
        }
      });
    } else if (!display.includes(":")) {
      const word = document.createElement("span");
      word.className = "word";
      word.textContent = display;
      counter.replaceChildren(word);
    } else
      counter.replaceChildren(
        ...Array.from(display, (char) => {
          const span = document.createElement("span");
          span.className = char === ":" ? "colon" : "digit";
          span.textContent = char;
          return span;
        }),
      );
    lastDisplay = display;
    counter.setAttribute("aria-label", display);
  }
  const mode = busy
    ? "busy"
    : cooldown
      ? "cooldown"
      : lastZip
        ? "watching"
        : "ready";
  if (mode !== lastMode) {
    $("dial").classList.toggle("is-checking", busy);
    $("timer-panel").classList.toggle("is-cooldown", cooldown);
    $("status").classList.toggle("cooldown", cooldown);
    $("timer-label").textContent = cooldown
      ? "Cooling down · retry in"
      : lastZip
        ? "Next area check in"
        : "Your next stock check";
    $("time-caption").textContent = busy
      ? "Contacting Apple"
      : cooldown
        ? "Giving Apple a moment"
        : lastZip
          ? "Free · 2-minute checks"
          : "Choose your area";
    $("health").textContent = cooldown
      ? "A retry is scheduled. Current stock is unconfirmed."
      : lastZip
        ? "Area checks continue while this tab is open."
        : "Search a ZIP code to check nearby stores.";
    lastMode = mode;
  }
  const fraction = nextCheck
    ? Math.max(
        0,
        Math.min(
          1,
          (nextCheck - Date.now()) / Math.max(1000, nextCheck - cycleStart),
        ),
      )
    : 1;
  $("ring-progress").style.strokeDashoffset = String(100 * (1 - fraction));
  if (!busy && nextCheck && Date.now() >= nextCheck && lastZip) {
    nextCheck = Date.now() + 30000;
    check(lastZip);
  }
}
render();
tick();
setInterval(tick, 1000);
setInterval(() => {
  if (!document.hidden) render();
}, 30000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    render();
    tick();
  }
});
