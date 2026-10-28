const MODELS=[{"part":"MK1F4LL/A","storage":"256gb","color":"nightsky","token":"7.6-inch-display-256gb-night-sky-att"},{"part":"MK1F4LL/A","storage":"256gb","color":"nightsky","token":"7.6-inch-display-256gb-night-sky-t-mobile"},{"part":"MK1F4LL/A","storage":"256gb","color":"nightsky","token":"7.6-inch-display-256gb-night-sky-verizon"},{"part":"MK1F4LL/A","storage":"256gb","color":"nightsky","token":"7.6-inch-display-256gb-night-sky-unlocked"},{"part":"MK1H4LL/A","storage":"512gb","color":"nightsky","token":"7.6-inch-display-512gb-night-sky-att"},{"part":"MK1H4LL/A","storage":"512gb","color":"nightsky","token":"7.6-inch-display-512gb-night-sky-t-mobile"},{"part":"MK1H4LL/A","storage":"512gb","color":"nightsky","token":"7.6-inch-display-512gb-night-sky-verizon"},{"part":"MK1H4LL/A","storage":"512gb","color":"nightsky","token":"7.6-inch-display-512gb-night-sky-unlocked"},{"part":"MK1G4LL/A","storage":"512gb","color":"starwhite","token":"7.6-inch-display-512gb-star-white-att"},{"part":"MK1G4LL/A","storage":"512gb","color":"starwhite","token":"7.6-inch-display-512gb-star-white-t-mobile"},{"part":"MK1G4LL/A","storage":"512gb","color":"starwhite","token":"7.6-inch-display-512gb-star-white-verizon"},{"part":"MK1G4LL/A","storage":"512gb","color":"starwhite","token":"7.6-inch-display-512gb-star-white-unlocked"},{"part":"MK1E4LL/A","storage":"256gb","color":"starwhite","token":"7.6-inch-display-256gb-star-white-att"},{"part":"MK1E4LL/A","storage":"256gb","color":"starwhite","token":"7.6-inch-display-256gb-star-white-t-mobile"},{"part":"MK1E4LL/A","storage":"256gb","color":"starwhite","token":"7.6-inch-display-256gb-star-white-verizon"},{"part":"MK1E4LL/A","storage":"256gb","color":"starwhite","token":"7.6-inch-display-256gb-star-white-unlocked"},{"part":"MK1L4LL/A","storage":"1tb","color":"nightsky","token":"7.6-inch-display-1tb-night-sky-att"},{"part":"MK1L4LL/A","storage":"1tb","color":"nightsky","token":"7.6-inch-display-1tb-night-sky-t-mobile"},{"part":"MK1L4LL/A","storage":"1tb","color":"nightsky","token":"7.6-inch-display-1tb-night-sky-verizon"},{"part":"MK1L4LL/A","storage":"1tb","color":"nightsky","token":"7.6-inch-display-1tb-night-sky-unlocked"},{"part":"MK1Q4LL/A","storage":"2tb","color":"starwhite","token":"7.6-inch-display-2tb-star-white-att"},{"part":"MK1Q4LL/A","storage":"2tb","color":"starwhite","token":"7.6-inch-display-2tb-star-white-t-mobile"},{"part":"MK1Q4LL/A","storage":"2tb","color":"starwhite","token":"7.6-inch-display-2tb-star-white-verizon"},{"part":"MK1Q4LL/A","storage":"2tb","color":"starwhite","token":"7.6-inch-display-2tb-star-white-unlocked"},{"part":"MK1J4LL/A","storage":"1tb","color":"starwhite","token":"7.6-inch-display-1tb-star-white-att"},{"part":"MK1J4LL/A","storage":"1tb","color":"starwhite","token":"7.6-inch-display-1tb-star-white-t-mobile"},{"part":"MK1J4LL/A","storage":"1tb","color":"starwhite","token":"7.6-inch-display-1tb-star-white-verizon"},{"part":"MK1J4LL/A","storage":"1tb","color":"starwhite","token":"7.6-inch-display-1tb-star-white-unlocked"},{"part":"MK1R4LL/A","storage":"2tb","color":"nightsky","token":"7.6-inch-display-2tb-night-sky-att"},{"part":"MK1R4LL/A","storage":"2tb","color":"nightsky","token":"7.6-inch-display-2tb-night-sky-t-mobile"},{"part":"MK1R4LL/A","storage":"2tb","color":"nightsky","token":"7.6-inch-display-2tb-night-sky-verizon"},{"part":"MK1R4LL/A","storage":"2tb","color":"nightsky","token":"7.6-inch-display-2tb-night-sky-unlocked"}];const STORES=[{"id":"R216","name":"Domain NORTHSIDE","city":"Austin","state":"TX","stateName":"Texas","zip":"78758","url":"https://www.apple.com/retail/domainnorthside/"},{"id":"R085","name":"Barton Creek","city":"Austin","state":"TX","stateName":"Texas","zip":"78746","url":"https://www.apple.com/retail/bartoncreek/"},{"id":"R144","name":"NorthPark Center","city":"Dallas","state":"TX","stateName":"Texas","zip":"75225","url":"https://www.apple.com/retail/northparkcenter/"},{"id":"R042","name":"Knox Street","city":"Dallas","state":"TX","stateName":"Texas","zip":"75205","url":"https://www.apple.com/retail/knoxstreet/"},{"id":"R746","name":"Galleria Dallas","city":"Dallas","state":"TX","stateName":"Texas","zip":"75240","url":"https://www.apple.com/retail/galleriadallas/"},{"id":"R492","name":"Cielo Vista Mall","city":"El Paso","state":"TX","stateName":"Texas","zip":"79925","url":"https://www.apple.com/retail/cielovistamall/"},{"id":"R316","name":"University Park Village","city":"Fort Worth","state":"TX","stateName":"Texas","zip":"76107","url":"https://www.apple.com/retail/universityparkvillage/"},{"id":"R204","name":"Baybrook","city":"Friendswood","state":"TX","stateName":"Texas","zip":"77546","url":"https://www.apple.com/retail/baybrook/"},{"id":"R164","name":"Memorial City","city":"Houston","state":"TX","stateName":"Texas","zip":"77024","url":"https://www.apple.com/retail/memorialcity/"},{"id":"R058","name":"Houston Galleria","city":"Houston","state":"TX","stateName":"Texas","zip":"77056","url":"https://www.apple.com/retail/houstongalleria/"},{"id":"R321","name":"Willowbrook Mall","city":"Houston","state":"TX","stateName":"Texas","zip":"77070","url":"https://www.apple.com/retail/willowbrookmall/"},{"id":"R437","name":"Highland Village","city":"Houston","state":"TX","stateName":"Texas","zip":"77027","url":"https://www.apple.com/retail/highlandvillage/"},{"id":"R290","name":"North Star","city":"San Antonio","state":"TX","stateName":"Texas","zip":"78216","url":"https://www.apple.com/retail/northstar/"},{"id":"R131","name":"La Cantera","city":"San Antonio","state":"TX","stateName":"Texas","zip":"78256","url":"https://www.apple.com/retail/lacantera/"},{"id":"R151","name":"Southlake Town Square","city":"Southlake","state":"TX","stateName":"Texas","zip":"76092","url":"https://www.apple.com/retail/southlaketownsquare/"},{"id":"R205","name":"First Colony Mall","city":"Sugar Land","state":"TX","stateName":"Texas","zip":"77479","url":"https://www.apple.com/retail/firstcolonymall/"},{"id":"R126","name":"The Woodlands","city":"The Woodlands","state":"TX","stateName":"Texas","zip":"77380","url":"https://www.apple.com/retail/thewoodlands/"}];
const $ = (id) => document.getElementById(id);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const carrier = (model) =>
  model.token.endsWith("t-mobile") ? "t-mobile" : model.token.split("-").pop();
const preferencesKey = "pickup-watch-preferences";
let preferences = {};
try {
  preferences = JSON.parse(localStorage.getItem(preferencesKey) || "{}");
} catch {}
const shared = new URLSearchParams(location.search);
let model =
  MODELS.find((m) => m.token === (shared.get("model") || preferences.token)) ||
  MODELS.find((m) => m.token === "7.6-inch-display-512gb-night-sky-verizon");
let observations = new Map(),
  areaCache = new Map();
try {
  const saved = JSON.parse(
    sessionStorage.getItem("pickup-watch-texas-v3") || "{}",
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
$("model-storage").value = model.storage;
$("model-color").value = model.color;
$("model-carrier").value = carrier(model);
const initialZip = shared.get("zip") || preferences.zip || "";
if (/^\d{5}$/.test(initialZip)) $("zip").value = initialZip;
if (shared.has("zip"))
  $("feedback").textContent =
    "Area and phone loaded from your link. Hit Find my iPhone to check stock.";
function productUrl() {
  return "https://www.apple.com/shop/buy-iphone/iphone-duo/" + model.token;
}
function persist() {
  try {
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ token: model.token, zip: $("zip").value.trim() }),
    );
  } catch {}
}
function updateModel() {
  $("model-label").textContent =
    model.storage.toUpperCase() +
    " · " +
    (model.color === "nightsky" ? "Night Sky" : "Star White") +
    " · " +
    {
      verizon: "Verizon",
      att: "AT&T",
      "t-mobile": "T-Mobile",
      unlocked: "Connect later",
    }[carrier(model)];
  $("product").href = productUrl();
  persist();
  render();
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
    model.token +
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
      const checked = observation
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
        productUrl() +
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
  areaCache.set("texas:" + zip.slice(0, 3), data);
  try {
    sessionStorage.setItem(
      "pickup-watch-texas-v3",
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
  if (busy) return;
  if (!/^(73301|73344|73960|7[5-9]\d{3}|885\d{2})$/.test(zip)) {
    $("feedback").textContent = "Enter a five-digit Texas ZIP code.";
    $("zip").focus();
    return;
  }
  const local = areaCache.get("texas:" + zip.slice(0, 3));
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
      "/api/availability?zip=" + encodeURIComponent(zip),
      { cache: "no-store", signal: AbortSignal.timeout(45000) },
    );
    const data = await response.json();
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
    $("check-area").textContent = "Find my iPhone ↗";
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
function applyModelSelection() {
  model =
    MODELS.find(
      (item) =>
        item.storage === $("model-storage").value &&
        item.color === $("model-color").value &&
        carrier(item) === $("model-carrier").value,
    ) || model;
  updateModel();
  $("selection-feedback").textContent =
    "Watching " + $("model-label").textContent + ". Saved on this device.";
}
$("model-form").addEventListener("change", applyModelSelection);
$("model-form").addEventListener("submit", (event) => {
  event.preventDefault();
  applyModelSelection();
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
  link.searchParams.set("model", model.token);
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
updateModel();
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
