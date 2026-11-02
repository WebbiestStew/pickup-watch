// Track only confirmed state changes; stale/unknown results never trigger alerts.
export function stockAlertTransition(watch, data) {
  if (
    !watch ||
    !data ||
    data.queriedZip !== watch.zip ||
    data.nextCheckAt <= Date.now() ||
    data.checkedAt <= (watch.checkedAt || 0)
  )
    return { watch, stores: [] };
  const available = new Set(watch.available || []),
    stores = [];
  for (const store of data.stores || []) {
    const status = store.availability?.[watch.part]?.status;
    if (status === "available") {
      if (!available.has(store.id)) stores.push(store);
      available.add(store.id);
    } else if (status === "unavailable") available.delete(store.id);
  }
  return {
    watch: { ...watch, checkedAt: data.checkedAt, available: [...available] },
    stores,
  };
}
