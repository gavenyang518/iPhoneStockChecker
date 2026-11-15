// RestockCheck one-tap bag.
//
// Runs on Apple's buy pages. It does nothing unless the URL carries the
// `#rc-onetap` marker, which RestockCheck adds only to links in a restock
// alert the user tapped. Then it answers the remaining required questions with
// the plain choice (no trade-in, pay in full, unlocked, no AppleCare), presses
// "Add to Bag" once and opens the bag. The user still reviews and pays on
// Apple. It never touches payment, never retries in a loop, and stops with a
// visible note if Apple's page doesn't look as expected.
//
// Verified 2026-11-14: selectors on apple.com.cn and apple.com buy pages
// (data-autom: choose-noTradeIn, purchaseGroupOptionfullprice,
// carrierModelUNLOCKED/US, noapplecare, add-to-cart). A person adding the Duo
// on apple.com.cn lands on `?product=…&step=attach` (accessory step); from
// there we open the bag. Automated (CDP) browsers get a 404 from Apple's bot
// shield on add-to-bag, so test this in a normal browser.
(() => {
  'use strict';

  const MARKER = '#rc-onetap';
  const PENDING_KEY = 'rc-onetap-pending';
  const PENDING_MS = 60_000;

  const bagUrl = () => {
    const prefix = location.pathname.split('/shop/')[0];
    return `${location.origin}${prefix}/shop/bag`;
  };

  // Second leg: Apple moved on to its accessory step after our Add to Bag.
  try {
    const pending = Number(sessionStorage.getItem(PENDING_KEY) || 0);
    if (pending) {
      sessionStorage.removeItem(PENDING_KEY);
      if (
        Date.now() - pending < PENDING_MS &&
        new URLSearchParams(location.search).get('step') === 'attach'
      ) {
        location.replace(bagUrl());
        return;
      }
    }
  } catch {
    // Storage blocked: the user simply stays on Apple's page.
  }

  // Known and accepted (review 2026-11-14): anyone can craft an Apple link
  // with this marker. The worst case is one item added to the visitor's bag
  // with a visible banner; nothing is ever bought or paid.
  if (!location.hash.startsWith(MARKER)) return;

  // One attempt per alert tap: a reload or back navigation must not add again.
  const onceKey = `rc-onetap:${location.pathname}${location.search}`;
  try {
    if (sessionStorage.getItem(onceKey)) return;
    sessionStorage.setItem(onceKey, String(Date.now()));
  } catch {
    // Storage blocked: still safe, the marker is removed below.
  }
  // Drop the marker so a reload of this page is a normal page.
  history.replaceState(null, '', location.pathname + location.search);

  const zh =
    /apple\.com\.cn$/.test(location.hostname) ||
    /^\/(hk|tw|mo)\b/.test(location.pathname);
  const t = (en, cn) => (zh ? cn : en);

  // Ordered required choices. Each is clicked only if present and not chosen.
  const CHOICES = [
    '[data-autom="choose-noTradeIn"]',
    '[data-autom="purchaseGroupOptionfullprice"]',
    '[data-autom^="carrierModelUNLOCKED"]',
    '[data-autom="noapplecare"]',
  ];
  const ADD = 'button[data-autom="add-to-cart"]';
  const TIMEOUT_MS = 20_000;

  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.style.cssText =
    'position:fixed;z-index:2147483647;left:50%;top:16px;transform:translateX(-50%);' +
    'max-width:92vw;padding:12px 18px;border-radius:12px;background:#111;color:#fff;' +
    'font:600 14px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)';
  const say = (text, ok = true) => {
    banner.textContent = `RestockCheck · ${text}`;
    banner.style.background = ok ? '#111' : '#b42318';
    if (!banner.isConnected) document.documentElement.appendChild(banner);
  };
  say(t('Adding to your bag…', '正在加入购物袋…'));

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const usable = (el) =>
    el && !el.disabled && el.getAttribute('aria-disabled') !== 'true';

  // Apple's radios are visually hidden inputs; a DOM click on the input fires
  // the same click/change events the page listens to.
  const pick = (selector) => {
    const input = document.querySelector(selector);
    if (!input || input.checked || input.disabled) return false;
    input.click();
    return true;
  };

  async function run() {
    const deadline = Date.now() + TIMEOUT_MS;
    let added = false;
    while (Date.now() < deadline) {
      for (const selector of CHOICES) {
        if (pick(selector)) await sleep(400);
      }
      const add = document.querySelector(ADD);
      if (usable(add)) {
        try {
          sessionStorage.setItem(PENDING_KEY, String(Date.now()));
        } catch {
          // ignore
        }
        add.click();
        added = true;
        break;
      }
      await sleep(300);
    }
    if (!added) {
      say(
        t(
          'Could not add automatically. Tap “Add to Bag” yourself.',
          '未能自动加入，请手动点“添加到购物袋”。'
        ),
        false
      );
      return;
    }
    say(t('Added. Opening your bag…', '已加入，正在打开购物袋…'));
    // Apple usually reloads into its accessory step (handled above). If it
    // stays on this page (an in-page overlay instead), open the bag ourselves.
    const start = location.href;
    for (let i = 0; i < 24; i++) {
      await sleep(250);
      if (location.href !== start) return;
    }
    location.assign(bagUrl());
  }

  run().catch(() =>
    say(t('Tap “Add to Bag” to continue.', '请手动点“添加到购物袋”。'), false)
  );
})();
