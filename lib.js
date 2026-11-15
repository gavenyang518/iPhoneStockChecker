// Shared, side-effect-free logic for the RestockCheck extension.
// Runs in the service worker, the popup and Node tests.

export const SITE = 'https://restockcheck.com';

/** Apple Store path prefix per storefront; null = unsupported. */
export function shopPrefix(country) {
  const c = String(country || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  if (c === 'US' || c === 'CN') return '';
  if (c === 'GB') return '/uk';
  return `/${c.toLowerCase()}`;
}

function appleHost(country) {
  return String(country).toUpperCase() === 'CN'
    ? 'https://www.apple.com.cn'
    : 'https://www.apple.com';
}

const STORE = /^R\d{3,4}$/;
const PART = /^[A-Z0-9]+\/[A-Z]$/;

/** One request per store, asking for every watched part there (~7 KB). */
export function pickupUrl(country, store, parts) {
  const prefix = shopPrefix(country);
  if (
    prefix === null ||
    !STORE.test(store) ||
    !parts.length ||
    parts.length > 20
  )
    throw new TypeError('Invalid pickup query');
  if (parts.some((p) => !PART.test(p))) throw new TypeError('Invalid part');
  const url = new URL(
    `${appleHost(country)}${prefix}/shop/retail/pickup-message`
  );
  url.searchParams.set('pl', 'true');
  url.searchParams.set('searchNearby', 'false');
  url.searchParams.set('store', store);
  parts.forEach((part, i) => url.searchParams.set(`parts.${i}`, part));
  return url.toString();
}

/** Apple product page for one exact part (opens the Apple Store app on iOS). */
export function buyUrl(country, part) {
  const prefix = shopPrefix(country) ?? '';
  return `${appleHost(country)}${prefix}/shop/product/${part}`;
}

/**
 * Parse Apple's answer into three states. Anything missing or unexpected is
 * 'unknown' — never silently "out of stock".
 */
export function parsePickup(payload, store, parts) {
  const stores = payload?.body?.stores;
  if (!Array.isArray(stores)) throw new TypeError('Unexpected Apple response');
  const entry = stores.find((s) => s?.storeNumber === store);
  const out = {};
  for (const part of parts) {
    const value = entry?.partsAvailability?.[part]?.pickupDisplay;
    out[part] =
      value === 'available'
        ? 'available'
        : value === 'unavailable'
          ? 'unavailable'
          : 'unknown';
  }
  return out;
}

/** Group watches into one query per (country, store). Paused ones are skipped. */
export function groupQueries(watches) {
  const map = new Map();
  for (const w of watches) {
    if (w.paused) continue;
    const key = `${w.country}:${w.store}`;
    const q = map.get(key) || {
      key,
      country: w.country,
      store: w.store,
      parts: [],
    };
    if (!q.parts.includes(w.part)) q.parts.push(w.part);
    map.set(key, q);
  }
  return [...map.values()];
}

/**
 * Alert only when a watch moves into stock; staying in stock is silent, and
 * an unknown reading neither alerts nor resets the state.
 */
export function nextAlertState(previous, reading) {
  if (reading === 'unknown')
    return { state: previous ?? 'unknown', alert: false };
  return {
    state: reading,
    alert: reading === 'available' && previous !== 'available',
  };
}

/**
 * Rolling request budget per IP. Apple starts answering 541 after a burst of
 * requests from one address; stay well under it.
 */
export const BUDGET = { requests: 20, windowMs: 10 * 60_000 };
export const COOLDOWN_MS = 15 * 60_000;

export function budgetLeft(history, now) {
  const recent = history.filter((t) => t > now - BUDGET.windowMs);
  return { recent, left: Math.max(0, BUDGET.requests - recent.length) };
}

/** Pick which queries run this cycle: oldest-checked first, within budget. */
export function planCycle(queries, lastChecked, left) {
  return [...queries]
    .sort((a, b) => (lastChecked[a.key] || 0) - (lastChecked[b.key] || 0))
    .slice(0, left);
}

/** Link that opens the website wizard with this exact configuration. */
export function upgradeUrl(watch, lang) {
  const params = new URLSearchParams({
    country: watch.country,
    family: watch.family,
    color: watch.color,
    storage: watch.capacity,
    store: watch.store,
    utm_source: 'chrome_extension',
    utm_medium: 'extension',
    utm_campaign: 'upgrade',
  });
  return `${SITE}${lang === 'zh' ? '/zh' : ''}/start?${params}`;
}
