import {
  budgetLeft,
  buyUrl,
  COOLDOWN_MS,
  groupQueries,
  nextAlertState,
  parsePickup,
  pickupUrl,
  planCycle,
} from './lib.js';

/*
 * State in chrome.storage.local:
 *   watches:  [{ id, country, family, name, color, capacity, part, store, storeName, paused }]
 *   status:   { [watchId]: { state, checkedAt, error } }
 *   lastChecked: { [country:store]: ms }
 *   requests: [ms, ...]   // rolling budget
 *   cooldownUntil: ms
 *   settings: { intervalMin, sound }
 */

const DEFAULT_SETTINGS = { intervalMin: 1, sound: true };

async function load() {
  const data = await chrome.storage.local.get([
    'watches',
    'status',
    'lastChecked',
    'requests',
    'cooldownUntil',
    'settings',
  ]);
  return {
    watches: data.watches || [],
    status: data.status || {},
    lastChecked: data.lastChecked || {},
    requests: data.requests || [],
    cooldownUntil: data.cooldownUntil || 0,
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
  };
}

async function schedule() {
  const { settings, watches } = await load();
  await chrome.alarms.clear('poll');
  if (!watches.some((w) => !w.paused)) return;
  // Chrome's minimum alarm period is 30 seconds.
  const period = Math.max(0.5, Number(settings.intervalMin) || 1);
  await chrome.alarms.create('poll', {
    delayInMinutes: 0.05,
    periodInMinutes: period,
  });
}

async function updateBadge(watches, status) {
  const inStock = watches.filter(
    (w) => !w.paused && status[w.id]?.state === 'available'
  ).length;
  await chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
  await chrome.action.setBadgeText({ text: inStock ? String(inStock) : '' });
}

async function playChime() {
  try {
    const existing = await chrome.offscreen.hasDocument?.();
    if (!existing)
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification:
          'Play a short chime when a watched item is back in stock',
      });
    await chrome.runtime.sendMessage({ type: 'play-chime' });
  } catch {
    /* Sound is best effort. */
  }
}

async function notify(watch) {
  const title = chrome.i18n.getMessage('notifyTitle', [watch.name]);
  const message = chrome.i18n.getMessage('notifyBody', [
    `${watch.color} · ${watch.capacity}`,
    watch.storeName,
  ]);
  await chrome.notifications.create(`instock:${watch.id}:${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message,
    priority: 2,
    requireInteraction: true,
    buttons: [
      { title: chrome.i18n.getMessage('notifyOpen') },
      { title: chrome.i18n.getMessage('notifyGotIt') },
    ],
  });
}

let running = false;

/** One polling cycle. Returns a short summary for the popup. */
export async function pollOnce() {
  if (running) return { skipped: 'busy' };
  running = true;
  try {
    const state = await load();
    const now = Date.now();
    if (state.cooldownUntil > now) return { skipped: 'cooldown' };
    const { recent, left } = budgetLeft(state.requests, now);
    const queries = planCycle(
      groupQueries(state.watches),
      state.lastChecked,
      left
    );
    const status = { ...state.status };
    const lastChecked = { ...state.lastChecked };
    const requests = [...recent];
    let cooldownUntil = 0;
    const alerts = [];

    for (const q of queries) {
      requests.push(Date.now());
      let readings;
      let error = null;
      try {
        const res = await fetch(pickupUrl(q.country, q.store, q.parts), {
          headers: { Accept: 'application/json' },
          credentials: 'omit',
        });
        if ([541, 429, 403].includes(res.status)) {
          // Apple is rate-limiting this network: back off everything.
          cooldownUntil = Date.now() + COOLDOWN_MS;
          error = `HTTP ${res.status}`;
        } else if (!res.ok) error = `HTTP ${res.status}`;
        else readings = parsePickup(await res.json(), q.store, q.parts);
      } catch (e) {
        error = e instanceof Error ? e.message.slice(0, 60) : 'network';
      }
      lastChecked[q.key] = Date.now();
      for (const w of state.watches) {
        if (w.paused || `${w.country}:${w.store}` !== q.key) continue;
        const reading = readings?.[w.part] ?? 'unknown';
        const prev = status[w.id]?.state;
        const next = nextAlertState(prev, reading);
        status[w.id] = {
          state: next.state,
          checkedAt: readings ? Date.now() : status[w.id]?.checkedAt || null,
          error: readings ? null : error,
        };
        if (next.alert) alerts.push(w);
      }
      if (cooldownUntil) break;
    }

    await chrome.storage.local.set({
      status,
      lastChecked,
      requests,
      cooldownUntil,
      lastCycleAt: Date.now(),
    });
    await updateBadge(state.watches, status);
    for (const w of alerts) await notify(w);
    if (alerts.length && state.settings.sound) await playChime();
    return { checked: queries.length, alerts: alerts.length, cooldownUntil };
  } finally {
    running = false;
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'poll') void pollOnce();
});

chrome.runtime.onInstalled.addListener(() => void schedule());
chrome.runtime.onStartup.addListener(() => void schedule());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.watches || changes.settings))
    void schedule();
});

chrome.notifications.onClicked.addListener(
  (id) => void openFromNotification(id)
);
chrome.notifications.onButtonClicked.addListener(async (id, button) => {
  if (button === 0) return openFromNotification(id);
  // "Got it": pause this watch so it stops checking.
  const watchId = id.split(':')[1];
  const { watches } = await load();
  await chrome.storage.local.set({
    watches: watches.map((w) =>
      w.id === watchId ? { ...w, paused: true } : w
    ),
  });
  await chrome.notifications.clear(id);
});

async function openFromNotification(id) {
  const watchId = id.split(':')[1];
  const { watches } = await load();
  const w = watches.find((x) => x.id === watchId);
  // #rc-onetap: onetap.js puts this exact configuration in the Apple bag.
  if (w)
    await chrome.tabs.create({ url: `${buyUrl(w.country, w.part)}#rc-onetap` });
  await chrome.notifications.clear(id);
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type === 'poll-now') {
    void pollOnce().then(reply);
    return true;
  }
  if (message?.type === 'test-alert') {
    void notify({
      id: 'test',
      name: message.name || 'iPhone',
      color: '—',
      capacity: '—',
      storeName: chrome.i18n.getMessage('testStore'),
    })
      .then(() => load())
      .then((s) => (s.settings.sound ? playChime() : null))
      .then(() => reply({ ok: true }));
    return true;
  }
  return false;
});
