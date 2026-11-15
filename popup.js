import { buyUrl, SITE, upgradeUrl } from './lib.js';

const MAX_WATCHES = 10;
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;
// Same locale Chrome picked for the message catalog, so labels never mix.
const isZh = (chrome.i18n.getMessage('@@ui_locale') || '')
  .toLowerCase()
  .startsWith('zh');
const $ = (id) => document.getElementById(id);

const COLOR_ZH = {
  'Star White': '星光白',
  'Night Sky': '暗夜黑',
  Black: '黑色',
  White: '白色',
  Silver: '银色',
  Glacier: '冰川蓝',
  Burgundy: '酒红色',
  'Space Black': '深空黑',
  'Cloud White': '云白色',
  'Light Gold': '浅金色',
  'Sky Blue': '天蓝色',
  'Mist Blue': '雾蓝色',
  Sage: '鼠尾草绿',
  Lavender: '薰衣草紫',
  'Soft Pink': '柔粉色',
  Pink: '粉色',
  Teal: '青色',
  Ultramarine: '群青色',
};
const colorName = (c) => (isZh && COLOR_ZH[c]) || c;

for (const el of document.querySelectorAll('[data-i18n]'))
  el.textContent = t(el.dataset.i18n);
$('storeSearch').placeholder = t('storeSearch');

async function api(path) {
  const res = await fetch(`${SITE}${path}`, { credentials: 'omit' });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Request failed');
  return json.data;
}

function ago(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return isZh ? `${s} 秒前` : `${s}s ago`;
  const m = Math.round(s / 60);
  return isZh ? `${m} 分钟前` : `${m} min ago`;
}

// ---------------------------------------------------------------- the list

async function render() {
  const {
    watches = [],
    status = {},
    cooldownUntil = 0,
    settings = {},
  } = await chrome.storage.local.get([
    'watches',
    'status',
    'cooldownUntil',
    'settings',
  ]);
  const list = $('list');
  list.textContent = '';
  if (!watches.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = t('empty');
    list.append(p);
    $('addBox').open = true;
  }
  for (const w of watches) {
    const s = status[w.id] || {};
    const state = w.paused ? 'paused' : s.state || 'pending';
    const card = document.createElement('div');
    card.className = `card${state === 'available' ? ' in' : ''}`;

    const top = document.createElement('div');
    top.className = 'top';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = `${w.name} · ${colorName(w.color)} · ${w.capacity}`;
    const pill = document.createElement('span');
    pill.className = `pill${state === 'available' ? ' in' : ''}`;
    pill.textContent =
      state === 'available'
        ? t('inStock')
        : state === 'unavailable'
          ? t('outOfStock')
          : state === 'paused'
            ? t('pause')
            : state === 'pending'
              ? t('pending')
              : t('unknown');
    top.append(name, pill);

    const meta = document.createElement('div');
    meta.className = 'muted small';
    meta.textContent = [
      w.storeName,
      s.checkedAt ? t('checkedAgo', [ago(s.checkedAt)]) : '',
      s.error ? `(${s.error})` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const actions = document.createElement('div');
    actions.className = 'actions';
    const open = document.createElement('a');
    open.className = 'link';
    open.href = buyUrl(w.country, w.part);
    open.target = '_blank';
    open.textContent = t('open');
    const toggle = document.createElement('button');
    toggle.className = 'link';
    toggle.textContent = w.paused ? t('resume') : t('pause');
    toggle.onclick = () =>
      updateWatches((all) =>
        all.map((x) => (x.id === w.id ? { ...x, paused: !x.paused } : x))
      );
    const remove = document.createElement('button');
    remove.className = 'link';
    remove.textContent = t('remove');
    remove.onclick = () =>
      updateWatches((all) => all.filter((x) => x.id !== w.id));
    actions.append(open, toggle, remove);
    card.append(top, meta, actions);
    list.append(card);
  }

  const cooling = cooldownUntil > Date.now();
  $('cooldown').hidden = !cooling;
  if (cooling)
    $('cooldown').textContent = t('cooldown', [
      new Date(cooldownUntil).toLocaleTimeString(),
    ]);

  const alarm = await chrome.alarms.get('poll');
  $('next').textContent =
    alarm && !cooling
      ? t('nextCheck', [
          new Date(alarm.scheduledTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        ])
      : '';
  $('interval').value = String(settings.intervalMin ?? 1);
  $('sound').checked = settings.sound !== false;
  const first = watches[0];
  $('upgrade').href = first
    ? upgradeUrl(first, isZh ? 'zh' : 'en')
    : `${SITE}${isZh ? '/zh' : ''}/start?utm_source=chrome_extension&utm_medium=extension&utm_campaign=upgrade`;
}

async function updateWatches(fn) {
  const { watches = [] } = await chrome.storage.local.get('watches');
  await chrome.storage.local.set({ watches: fn(watches) });
}

chrome.storage.onChanged.addListener(() => void render());
setInterval(() => void render(), 5000);

$('checkNow').onclick = async () => {
  $('checkNow').disabled = true;
  await chrome.runtime.sendMessage({ type: 'poll-now' });
  $('checkNow').disabled = false;
};
$('test').onclick = () =>
  chrome.runtime.sendMessage({ type: 'test-alert', name: 'iPhone' });
$('interval').onchange = async (e) => {
  const { settings = {} } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({
    settings: { ...settings, intervalMin: Number(e.target.value) },
  });
};
$('sound').onchange = async (e) => {
  const { settings = {} } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({
    settings: { ...settings, sound: e.target.checked },
  });
};

// ---------------------------------------------------------------- add form

let catalog = { countries: [], models: [] };
let stores = [];

function fill(select, items, label = (x) => x, value = (x) => x) {
  select.textContent = '';
  for (const item of items) {
    const o = document.createElement('option');
    o.value = value(item);
    o.textContent = label(item);
    select.append(o);
  }
}

const currentModel = () =>
  catalog.models.find((m) => m.family === $('model').value);

function refreshVariants() {
  const model = currentModel();
  const colors = [...new Set((model?.parts || []).map((p) => p.color))];
  const keepColor = $('color').value;
  fill($('color'), colors, colorName);
  if (colors.includes(keepColor)) $('color').value = keepColor;
  const caps = (model?.parts || [])
    .filter((p) => p.color === $('color').value)
    .map((p) => p.capacity);
  fill($('storage'), caps);
}

async function loadCountry(country) {
  $('formMsg').textContent = t('loading');
  catalog = await api(`/api/stock/catalog?country=${country}`);
  if (!$('country').options.length)
    fill(
      $('country'),
      catalog.countries,
      (c) => c.name,
      (c) => c.code
    );
  $('country').value = country;
  fill(
    $('model'),
    catalog.models,
    (m) => m.name,
    (m) => m.family
  );
  refreshVariants();
  await searchStores('');
  $('formMsg').textContent = '';
}

async function searchStores(q) {
  const country = $('country').value;
  const zip = country === 'US' && /^\d{5}$/.test(q.trim());
  const params = new URLSearchParams({ country, lang: isZh ? 'zh' : 'en' });
  if (zip || (q.trim().length >= 2 && country !== 'US'))
    params.set('location', q.trim());
  const data = await api(`/api/stock/stores?${params}`).catch(() => ({
    stores: [],
  }));
  const needle = q.trim().toLowerCase();
  stores =
    zip || !needle
      ? data.stores
      : data.stores.filter((s) =>
          [s.name, s.city, s.region, s.number, s.alt].some((v) =>
            v?.toLowerCase().includes(needle)
          )
        );
  fill(
    $('store'),
    stores.slice(0, 80),
    (s) => `${s.city} · ${s.name}${s.distance ? ` · ${s.distance}` : ''}`,
    (s) => s.number
  );
  if (!stores.length)
    fill(
      $('store'),
      [t('noStores')],
      (x) => x,
      () => ''
    );
  else $('store').selectedIndex = 0;
}

let searchTimer;
$('storeSearch').oninput = (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void searchStores(e.target.value), 300);
};
$('country').onchange = (e) => void loadCountry(e.target.value);
$('model').onchange = refreshVariants;
$('color').onchange = refreshVariants;

$('addForm').onsubmit = async (e) => {
  e.preventDefault();
  const model = currentModel();
  const part = model?.parts.find(
    (p) => p.color === $('color').value && p.capacity === $('storage').value
  );
  const store = stores.find((s) => s.number === $('store').value);
  if (!model || !part || !store) return;
  const { watches = [] } = await chrome.storage.local.get('watches');
  if (watches.length >= MAX_WATCHES)
    return ($('formMsg').textContent = t('limit', [String(MAX_WATCHES)]));
  if (watches.some((w) => w.part === part.part && w.store === store.number))
    return ($('formMsg').textContent = t('duplicate'));
  watches.push({
    id: crypto.randomUUID(),
    country: $('country').value,
    family: model.family,
    name: model.name,
    color: part.color,
    capacity: part.capacity,
    part: part.part,
    store: store.number,
    storeName: `${store.city} · ${store.name}`,
    paused: false,
  });
  await chrome.storage.local.set({ watches });
  $('formMsg').textContent = '';
  $('addBox').open = false;
  void chrome.runtime.sendMessage({ type: 'poll-now' });
};

void render();
void loadCountry(isZh ? 'CN' : 'US').catch(
  (err) => ($('formMsg').textContent = err.message)
);
