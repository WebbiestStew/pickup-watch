import assert from "node:assert/strict";
import { stockAlertTransition } from "../src/stock-alerts.js";
let watch = { part: "MKFW4LL/A", zip: "77002", available: [], checkedAt: 0 };
const sample = (time, status = "available", part = watch.part) => ({
  queriedZip: "77002",
  checkedAt: time,
  nextCheckAt: Date.now() + 120000,
  stores: [
    { id: "R001", name: "Test store", availability: { [part]: { status } } },
  ],
});
let result = stockAlertTransition(watch, sample(1));
assert.equal(result.stores.length, 1);
watch = result.watch;
result = stockAlertTransition(watch, sample(2));
assert.equal(result.stores.length, 0);
watch = result.watch;
result = stockAlertTransition(watch, sample(3, "unknown"));
assert.equal(result.stores.length, 0);
watch = result.watch;
result = stockAlertTransition(watch, sample(4));
assert.equal(result.stores.length, 0);
watch = result.watch;
result = stockAlertTransition(watch, sample(5, "unavailable"));
assert.equal(result.stores.length, 0);
watch = result.watch;
result = stockAlertTransition(watch, sample(6));
assert.equal(result.stores.length, 1);
assert.equal(
  stockAlertTransition(watch, sample(7, "available", "OTHERLL/A")).stores
    .length,
  0,
);
assert.equal(
  stockAlertTransition(watch, { ...sample(7), queriedZip: "78701" }).stores
    .length,
  0,
);
assert.equal(
  stockAlertTransition(watch, { ...sample(7), nextCheckAt: 0 }).stores.length,
  0,
);
assert.equal(stockAlertTransition(result.watch, sample(1)).stores.length, 0);
console.log(
  "Passed alert tests: exact product and ZIP, repeat suppression, restocks, stale/unknown results, and out-of-order checks.",
);
